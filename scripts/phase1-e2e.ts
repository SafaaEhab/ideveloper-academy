/**
 * Phase 1 end-to-end verification against a real running app + database.
 *
 * Usage (dev server must be running):
 *   npx tsx scripts/phase1-e2e.ts
 *   BASE_URL=https://... npx tsx scripts/phase1-e2e.ts
 *
 * It creates isolated records, verifies the browser flow, and removes every
 * record it created in `finally`. It never touches real customer rows.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import mysql from "mysql2/promise";
import { getDb, upsertCredential, upsertUser } from "../server/db";
import { hashPassword } from "../server/_core/password";
import { leadStaff, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = "phase1-ui-admin@example.com";
const STAFF_EMAIL = "phase1-ui-staff@example.com";
// A fresh test-only password every run; it is never printed and the accounts
// are deleted in cleanup.
const PASSWORD = randomBytes(18).toString("base64url");
const RUN_ID = String(Date.now()).slice(-8);
const FULL_NAME = `E2E عميل ${RUN_ID}`;
const PHONE_LOCAL = `010${RUN_ID}`;
const PHONE_E164 = `+20${PHONE_LOCAL.slice(1)}`;
const DUPLICATE_NAME = `E2E عميل مكرر ${RUN_ID}`;

const url = new URL(process.env.DATABASE_URL ?? "");
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

type CreatedIds = {
  leadIds: number[];
  studentIds: number[];
  userIds: number[];
  staffIds: number[];
  dedupeKeys: string[];
};

const created: CreatedIds = {
  leadIds: [],
  studentIds: [],
  userIds: [],
  staffIds: [],
  dedupeKeys: [],
};

async function ensureTestAccounts() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const adminHash = hashPassword(PASSWORD);
  await upsertCredential({
    email: ADMIN_EMAIL,
    passwordHash: adminHash.hash,
    salt: adminHash.salt,
  });
  await upsertUser({
    openId: `email:${ADMIN_EMAIL}`,
    email: ADMIN_EMAIL,
    name: "Phase 1 UI Admin",
    loginMethod: "email",
    role: "admin",
    lastSignedIn: new Date(),
  });
  const admin = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);
  if (!admin[0]) throw new Error("Test admin missing");
  if (!created.userIds.includes(admin[0].id)) created.userIds.push(admin[0].id);

  const staffHash = hashPassword(PASSWORD);
  await upsertCredential({
    email: STAFF_EMAIL,
    passwordHash: staffHash.hash,
    salt: staffHash.salt,
  });
  await upsertUser({
    openId: `email:${STAFF_EMAIL}`,
    email: STAFF_EMAIL,
    name: "Phase 1 UI Staff",
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  const staff = await db
    .select()
    .from(users)
    .where(eq(users.email, STAFF_EMAIL))
    .limit(1);
  if (!staff[0]) throw new Error("Test staff missing");
  if (!created.userIds.includes(staff[0].id)) created.userIds.push(staff[0].id);

  await db
    .insert(leadStaff)
    .values({
      userId: staff[0].id,
      displayName: "Phase 1 UI Staff",
      email: STAFF_EMAIL,
      active: true,
      canConvert: false,
      createdBy: admin[0].id,
    })
    .onDuplicateKeyUpdate({ set: { active: true, canConvert: false } });
  const staffRows = await db
    .select()
    .from(leadStaff)
    .where(eq(leadStaff.userId, staff[0].id))
    .limit(1);
  if (staffRows[0] && !created.staffIds.includes(staffRows[0].id)) {
    created.staffIds.push(staffRows[0].id);
  }
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login?returnTo=/leads`, {
    waitUntil: "networkidle",
  });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/leads", { timeout: 15_000 });
  await page
    .getByRole("heading", { name: "العملاء المحتملون" })
    .waitFor({ timeout: 15_000 });
}

async function fillRegistration(page: Page, name: string, phone: string) {
  await page.locator("#reg-name").fill(name);
  await page.locator("#reg-phone").fill(phone);
  await page.locator("#reg-age").fill("12");
  await page.locator("#reg-school").fill("مدرسة E2E");
  await page.locator("#reg-address").fill("القاهرة - اختبار");
  await page.locator("#reg-parent-email").fill(`e2e-${RUN_ID}@example.com`);
  await page.locator("#reg-parent-phone").fill("01123456789");
  await page.locator("#reg-course").click();
  await page.getByRole("option", { name: "Python", exact: true }).click();
  await page.locator("#reg-gender").click();
  await page.getByRole("option", { name: "ذكر", exact: true }).click();
  await page.locator("#reg-sibling").click();
  await page.getByRole("option", { name: "لا", exact: true }).click();
}

async function submitRegistration(page: Page) {
  await page.getByRole("button", { name: "إرسال" }).click();
}

async function cleanup() {
  try {
    const leadRows = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM academy_leads WHERE fullName LIKE ? OR studentPhone = ?",
      [`E2E عميل%${RUN_ID}%`, PHONE_E164]
    );
    for (const row of leadRows[0]) {
      const leadId = row.id as number;
      if (!created.leadIds.includes(leadId)) created.leadIds.push(leadId);
    }
    if (created.leadIds.length > 0) {
      const placeholders = created.leadIds.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM academy_lead_sync_jobs WHERE leadId IN (${placeholders})`,
        created.leadIds
      );
      await connection.query(
        `DELETE FROM academy_lead_activities WHERE leadId IN (${placeholders})`,
        created.leadIds
      );
      await connection.query(
        `DELETE FROM academy_leads WHERE id IN (${placeholders})`,
        created.leadIds
      );
    }
    const studentRows = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM academy_students WHERE name LIKE ? OR phone = ?",
      [`E2E عميل%${RUN_ID}%`, PHONE_E164]
    );
    for (const row of studentRows[0]) {
      const studentId = row.id as number;
      if (!created.studentIds.includes(studentId))
        created.studentIds.push(studentId);
    }
    if (created.studentIds.length > 0) {
      const placeholders = created.studentIds.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM academy_student_courses WHERE studentId IN (${placeholders})`,
        created.studentIds
      );
      await connection.query(
        `DELETE FROM academy_students WHERE id IN (${placeholders})`,
        created.studentIds
      );
    }
    if (created.dedupeKeys.length > 0) {
      await connection.query(
        "DELETE FROM academy_lead_dedupe_locks WHERE dedupeKey IN (?)",
        [[created.dedupeKeys]]
      );
    }
    if (created.staffIds.length > 0) {
      const placeholders = created.staffIds.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM academy_lead_staff WHERE id IN (${placeholders})`,
        created.staffIds
      );
    }
    if (created.userIds.length > 0) {
      const placeholders = created.userIds.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM user_credentials WHERE email IN (?,?)`,
        [ADMIN_EMAIL, STAFF_EMAIL]
      );
      await connection.query(
        `DELETE FROM users WHERE id IN (${placeholders})`,
        created.userIds
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

let browser: Browser | null = null;
let failed = false;
try {
  await ensureTestAccounts();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  // 1. Public registration — invalid phone first.
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.locator("#reg-phone").fill("abcdefgh");
  await submitRegistration(page);
  await page
    .getByText("اكتب رقم موبايل مصري صحيح")
    .waitFor({ timeout: 10_000 });
  console.log("PASS invalid phone shows the Arabic message");

  // 1b. A failed API call must never show the success state.
  await fillRegistration(page, FULL_NAME, PHONE_LOCAL);
  await page.route("**/api/trpc/site.submitRegistration**", route =>
    route.abort()
  );
  await submitRegistration(page);
  await page.getByRole("alert").waitFor({ timeout: 10_000 });
  assert.equal(await page.getByText("تم استلام الطلب وحفظه بنجاح").count(), 0);
  const [failedRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM academy_leads WHERE studentPhone = ?",
    [PHONE_E164]
  );
  assert.equal(
    Number(failedRows[0].n),
    0,
    "a failed request must not create a lead"
  );
  await page.unroute("**/api/trpc/site.submitRegistration**");
  console.log("PASS failed API call shows an error and persists nothing");

  // 2. Valid registration persists before success.
  await submitRegistration(page);
  await page
    .getByText("تم استلام الطلب وحفظه بنجاح")
    .waitFor({ timeout: 20_000 });
  console.log(
    "PASS valid registration shows success only after the API confirms"
  );

  const [leadRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT * FROM academy_leads WHERE studentPhone = ? AND course = 'Python' ORDER BY id DESC LIMIT 1",
    [PHONE_E164]
  );
  assert.equal(leadRows.length, 1, "lead should be persisted");
  const leadId = leadRows[0].id as number;
  created.leadIds.push(leadId);
  created.dedupeKeys.push(
    (await import("node:crypto"))
      .createHash("sha256")
      .update(`${PHONE_E164}|Python`)
      .digest("hex")
  );
  assert.equal(leadRows[0].status, "new");
  assert.equal(leadRows[0].source, "website");
  assert.ok(leadRows[0].registrationDate);
  console.log(
    "PASS database row: status=new, source=website, registrationDate set"
  );

  // 3. Duplicate within 30 days is prevented.
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await fillRegistration(page, DUPLICATE_NAME, PHONE_LOCAL);
  await submitRegistration(page);
  await page.getByText("الطلب مسجل بالفعل").waitFor({ timeout: 20_000 });
  const [duplicateRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT id, duplicateAttempts FROM academy_leads WHERE studentPhone = ? AND course = 'Python'",
    [PHONE_E164]
  );
  assert.equal(
    duplicateRows.length,
    1,
    "duplicate submission must not create a second row"
  );
  assert.ok(Number(duplicateRows[0].duplicateAttempts) >= 1);
  console.log("PASS duplicate phone + course is not inserted twice");

  // 4. Admin dashboard, search, filter, inline status.
  await login(page, ADMIN_EMAIL);
  await page.locator("#lead-search-name").fill(FULL_NAME);
  await page.waitForTimeout(800);
  const row = page
    .locator("table tbody tr")
    .filter({ hasText: FULL_NAME })
    .first();
  await row.waitFor({ timeout: 10_000 });
  console.log("PASS admin search by name finds the real lead");

  await page.locator("#lead-search-name").fill("");
  await page.locator("#lead-search-phone").fill(PHONE_LOCAL);
  await page.waitForTimeout(800);
  await page
    .locator("table tbody tr")
    .filter({ hasText: FULL_NAME })
    .first()
    .waitFor();
  console.log("PASS search by phone finds the lead");
  await page.locator("#lead-search-phone").fill("");
  await page.waitForTimeout(800);

  const rowForStatus = page
    .locator("table tbody tr")
    .filter({ hasText: FULL_NAME })
    .first();
  await rowForStatus.getByRole("combobox").click();
  await page
    .getByRole("option", { name: "يحتاج اتصال / متابعة", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#lead-follow-up").fill("2026-12-01T10:00");
  await dialog.getByRole("button", { name: "حفظ الحالة" }).click();
  await page.getByText("تم تحديث حالة العميل").waitFor({ timeout: 10_000 });
  const [statusRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT status, nextFollowUpDate FROM academy_leads WHERE id = ?",
    [leadId]
  );
  assert.equal(statusRows[0].status, "needs_follow_up");
  assert.ok(statusRows[0].nextFollowUpDate);
  const [activityRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT previousStatus, newStatus FROM academy_lead_activities WHERE leadId = ? AND type = 'status_changed' ORDER BY id DESC LIMIT 1",
    [leadId]
  );
  assert.equal(activityRows[0].previousStatus, "new");
  assert.equal(activityRows[0].newStatus, "needs_follow_up");
  console.log("PASS inline status change + activity history");

  // 4b. An overdue follow-up date shows the red server-computed warning.
  await connection.query(
    "UPDATE academy_leads SET nextFollowUpDate = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?",
    [leadId]
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#lead-search-name").fill(FULL_NAME);
  await page.waitForTimeout(800);
  const overdueRow = page
    .locator("table tbody tr")
    .filter({ hasText: FULL_NAME })
    .first();
  await overdueRow
    .getByText("متأخر في الاتصال")
    .first()
    .waitFor({ timeout: 10_000 });
  console.log("PASS overdue follow-up warning is visible");

  // 5. Details drawer, notes and contact history.
  const rowForDetails = page
    .locator("table tbody tr")
    .filter({ hasText: FULL_NAME })
    .first();
  await rowForDetails.getByRole("button", { name: "التفاصيل" }).click();
  await page
    .getByRole("heading", { name: FULL_NAME })
    .waitFor({ timeout: 10_000 });
  await page.locator("#lead-internal-notes").fill("ملاحظة داخلية من E2E");
  await page.getByRole("button", { name: "حفظ الملاحظات" }).click();
  await page.getByText("تم حفظ بيانات العميل").waitFor({ timeout: 10_000 });
  await page.locator("#lead-contact-note").fill("تمت مكالمة E2E");
  await page.getByRole("button", { name: "تسجيل التواصل" }).click();
  await page.getByText("تم تسجيل التواصل").waitFor({ timeout: 10_000 });
  const [notesRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT internalNotes, lastContactDate FROM academy_leads WHERE id = ?",
    [leadId]
  );
  assert.match(String(notesRows[0].internalNotes), /E2E/);
  assert.ok(notesRows[0].lastContactDate);
  console.log("PASS details drawer, internal notes, contact log");

  // 6. Conversion to student, credentials, status and no duplicate.
  await page.getByRole("button", { name: "تحويل إلى طالب" }).click();
  const credentialsDialog = page
    .getByRole("dialog")
    .filter({ hasText: "تم تحويل العميل إلى طالب" });
  await credentialsDialog.waitFor({ timeout: 15_000 });
  const accessCode = (
    await credentialsDialog.locator("code").first().textContent()
  )?.trim();
  assert.ok(
    accessCode && /^IDA-/.test(accessCode),
    "access code should be generated"
  );
  console.log("PASS conversion returns a generated access code");

  const [convertedLeadRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT status, convertedStudentId FROM academy_leads WHERE id = ?",
    [leadId]
  );
  assert.equal(convertedLeadRows[0].status, "subscribed");
  const studentId = Number(convertedLeadRows[0].convertedStudentId);
  assert.ok(studentId > 0);
  created.studentIds.push(studentId);
  const [studentRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT name, phone FROM academy_students WHERE id = ?",
    [studentId]
  );
  assert.equal(studentRows.length, 1);
  assert.equal(studentRows[0].phone, PHONE_E164);
  const [studentCountRows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM academy_students WHERE phone = ?",
    [PHONE_E164]
  );
  assert.equal(Number(studentCountRows[0].n), 1);
  console.log("PASS lead status=subscribed and exactly one student row");

  await credentialsDialog.getByRole("button", { name: "تم" }).click();
  await page.getByRole("button", { name: "إغلاق" }).click();
  await page.goto(`${BASE_URL}/admin?tab=students`, {
    waitUntil: "networkidle",
  });
  await page.getByText(FULL_NAME).first().waitFor({ timeout: 15_000 });
  console.log("PASS converted student appears in the students dashboard");

  // 7. Google Sheets reporting status is honest when credentials are absent.
  await page.goto(`${BASE_URL}/leads`, { waitUntil: "networkidle" });
  const sheetWarning = page.getByText("لم يتم النسخ").first();
  await sheetWarning.waitFor({ timeout: 15_000 });
  console.log(
    "PASS failed Google Sheets copy is visible as «لم يتم النسخ» (live creds unavailable)"
  );

  // 7b. Admin can open the reception roster.
  await page.getByRole("button", { name: "موظفو المتابعة" }).click();
  const employeesDialog = page
    .getByRole("dialog")
    .filter({ hasText: "موظفو متابعة العملاء" });
  await employeesDialog.waitFor({ timeout: 10_000 });
  await employeesDialog
    .getByText("Phase 1 UI Staff")
    .waitFor({ timeout: 10_000 });
  await page.keyboard.press("Escape");
  await employeesDialog.waitFor({ state: "hidden" });
  console.log("PASS reception employee roster loads real staff");

  // 8. Staff can open the leads workspace but cannot see admin controls.
  const staffContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const staffPage = await staffContext.newPage();
  await login(staffPage, STAFF_EMAIL);
  assert.equal(
    await staffPage.getByRole("button", { name: "موظفو المتابعة" }).count(),
    0
  );
  assert.equal(
    await staffPage.getByRole("button", { name: "مزامنة الكل" }).count(),
    0
  );
  console.log("PASS reception access without admin-only controls");
  await staffContext.close();

  // 9. Mobile layout + RTL.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/leads`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "العملاء المحتملون" }).waitFor();
  const mobileVisible = await page
    .locator("button:visible", { hasText: "التفاصيل" })
    .first()
    .isVisible();
  assert.ok(mobileVisible);
  const direction = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector("[dir='rtl']") as Element)
        .direction
  );
  assert.equal(direction, "rtl");
  const noOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth <= window.innerWidth + 2;
  });
  assert.ok(noOverflow, "mobile layout should not overflow horizontally");
  console.log("PASS mobile layout, RTL direction, no horizontal overflow");

  console.log("\nPHASE 1 E2E: all browser checks passed");
} catch (error) {
  failed = true;
  console.error("\nPHASE 1 E2E FAILED:", error);
} finally {
  await browser?.close().catch(() => undefined);
  await cleanup();
  console.log("Cleanup complete (isolated E2E records removed)");
}
process.exit(failed ? 1 : 0);
