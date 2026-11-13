/**
 * Phase 2 browser E2E with isolated test data.
 *
 * Usage (dev server on :3000):
 *   npx tsx scripts/phase2-e2e.ts
 *
 * It logs in as real test accounts, exercises the Arabic RTL screens, creates a
 * subscription, records a partial and a final payment, downloads the PDF
 * receipt, records an expense, downloads the Excel report, schedules and
 * cancels a campaign, checks role gates, and cleans every test row in finally.
 *
 * Live WhatsApp delivery is NOT exercised here. Without real credentials,
 * approved templates and five consenting numbers the live acceptance test is
 * reported as BLOCKED and never simulated.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import mysql from "mysql2/promise";
import { and, eq, inArray, like } from "drizzle-orm";
import {
  campaignRecipients,
  campaigns,
  expenses,
  leadStaff,
  leads,
  messageTemplates,
  paymentReminders,
  payments,
  studentCourses,
  students,
  subscriptions,
  users,
  auditLogs,
} from "../drizzle/schema";
import { getDb, upsertCredential, upsertUser } from "../server/db";
import { hashPassword } from "../server/_core/password";
import { createSubscription } from "../server/finance";
import { saveTemplate } from "../server/messaging";
import { dateKeyInTimeZone } from "../shared/time";
import { addDaysToDateKey } from "../shared/time";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = String(Date.now()).slice(-7);
const PASSWORD = randomBytes(18).toString("base64url");
const ADMIN_EMAIL = `phase2-e2e-admin-${RUN}@example.com`;
const STAFF_EMAIL = `phase2-e2e-staff-${RUN}@example.com`;
const INSTRUCTOR_EMAIL = `phase2-e2e-instructor-${RUN}@example.com`;
const STUDENT_NAME = `E2E طالب مالي ${RUN}`;
const OVERDUE_NAME = `E2E طالب متأخر ${RUN}`;
const LEAD_NAME = `E2E عميل مؤهل ${RUN}`;
const NOT_INTERESTED_NAME = `E2E عميل غير راغب ${RUN}`;
const OPT_OUT_NAME = `E2E عميل أوقف الرسائل ${RUN}`;
const TEMPLATE_NAME = `E2E قالب ${RUN}`;
const CAMPAIGN_NAME = `E2E حملة ${RUN}`;
const EXPENSE_DESC = `E2E مصروف ${RUN}`;
const shotDir = path.resolve("reports", "phase2", "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

const phoneBase = String(Date.now()).slice(-8).padStart(8, "0");
const phone = (offset: number) =>
  `+2010${String((Number(phoneBase) + offset) % 100_000_000).padStart(8, "0")}`;

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const created = {
  userIds: [] as number[],
  studentIds: [] as number[],
  leadIds: [] as number[],
  campaignIds: [] as number[],
  subscriptionIds: [] as number[],
  templateIds: [] as number[],
};

let adminUser: typeof users.$inferSelect;
let staffUser: typeof users.$inferSelect;
let instructorUser: typeof users.$inferSelect;
let studentUi: typeof students.$inferSelect;
let studentOverdue: typeof students.$inferSelect;
let leadNormal: typeof leads.$inferSelect;
let leadNotInterested: typeof leads.$inferSelect;
let leadOptOut: typeof leads.$inferSelect;
let templateId = 0;
let browser: Browser;
let adminContext: BrowserContext;
let adminPage: Page;

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required");
  const hash = hashPassword(PASSWORD);
  for (const [email, name, role] of [
    [ADMIN_EMAIL, "Phase2 E2E Admin", "admin"],
    [STAFF_EMAIL, "Phase2 E2E Reception", "user"],
    [INSTRUCTOR_EMAIL, "Phase2 E2E Instructor", "instructor"],
  ] as const) {
    await upsertCredential({ email, passwordHash: hash.hash, salt: hash.salt });
    await upsertUser({
      openId: `email:${email}`,
      email,
      name,
      loginMethod: "email",
      role,
      lastSignedIn: new Date(),
    });
    const row = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!row[0]) throw new Error(`Test user missing: ${email}`);
    created.userIds.push(row[0].id);
    if (role === "admin") adminUser = row[0];
    if (role === "user") staffUser = row[0];
    if (role === "instructor") instructorUser = row[0];
  }

  await db.insert(leadStaff).values({
    userId: staffUser.id,
    displayName: "Phase2 E2E Reception",
    email: STAFF_EMAIL,
    active: true,
    canConvert: false,
    canMessaging: true,
    canRecordPayments: true,
    canManageSubscriptions: true,
    canViewReports: false,
    canManageExpenses: false,
    canViewSalaries: false,
    canManageFinanceSettings: false,
  });

  const studentInsert = async (name: string, phoneValue: string, code: string) => {
    const inserted = await db.insert(students).values({
      name,
      phone: phoneValue,
      accessCode: code,
      status: "active",
      whatsAppConsent: true,
      whatsAppConsentSource: "phase2-e2e",
      whatsAppConsentAt: new Date(),
    });
    const id = Number(inserted[0].insertId);
    created.studentIds.push(id);
    await db.insert(studentCourses).values({ studentId: id, course: "Python" });
    const rows = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return rows[0]!;
  };
  studentUi = await studentInsert(STUDENT_NAME, phone(0), `E2E${RUN}A`);
  studentOverdue = await studentInsert(OVERDUE_NAME, phone(1), `E2E${RUN}B`);

  const leadInsert = async (
    name: string,
    phoneValue: string,
    status: "new" | "not_interested",
    optedOut = false,
  ) => {
    const inserted = await db.insert(leads).values({
      fullName: name,
      studentPhone: phoneValue,
      age: 12,
      school: "E2E School",
      address: "E2E Address",
      parentEmail: `e2e-${RUN}-${created.leadIds.length}@example.com`,
      parentPhone: phoneValue,
      course: "Python",
      gender: "male",
      status,
      whatsAppConsent: true,
      whatsAppConsentSource: "phase2-e2e",
      whatsAppConsentAt: new Date(),
      whatsAppOptOut: optedOut,
      whatsAppOptOutAt: optedOut ? new Date() : null,
      source: "phase2-e2e",
    });
    const id = Number(inserted[0].insertId);
    created.leadIds.push(id);
    const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return rows[0]!;
  };
  leadNormal = await leadInsert(LEAD_NAME, phone(10), "new");
  leadNotInterested = await leadInsert(NOT_INTERESTED_NAME, phone(11), "not_interested");
  leadOptOut = await leadInsert(OPT_OUT_NAME, phone(12), "new", true);

  templateId = await saveTemplate(
    { userId: adminUser.id, isAdmin: true },
    {
      name: TEMPLATE_NAME,
      category: "lead_follow_up",
      body: "مرحباً {{student_name}}، بخصوص كورس {{course_name}}.",
      metaTemplateName: `e2e_template_${RUN}`,
      language: "ar",
      metaCategory: "marketing",
      metaStatus: "pending",
    },
  );
  created.templateIds.push(templateId);

  const overdue = await createSubscription(
    { userId: adminUser.id, isAdmin: true, salaries: true },
    {
      studentId: studentOverdue.id,
      course: "Python",
      type: "one_time",
      baseAmountMinor: 50000,
      paymentMethod: "instapay",
      startDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), -20),
      dueDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), -5),
      reminderEnabled: true,
    },
  );
  if (overdue) created.subscriptionIds.push(overdue.subscription.id);
}

async function login(page: Page, email: string, returnTo: string) {
  await page.goto(`${BASE_URL}/login?returnTo=${encodeURIComponent(returnTo)}`, {
    waitUntil: "networkidle",
  });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL(url => !url.pathname.startsWith("/login"), { timeout: 20_000 }),
    page.getByRole("button", { name: /تسجيل الدخول|Sign in/ }).click(),
  ]);
}

async function screenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: path.join(shotDir, name),
    fullPage,
  });
}

async function runMessagingFlow() {
  await adminPage.goto(
    `${BASE_URL}/messaging?source=leads&ids=${created.leadIds.join(",")}`,
    { waitUntil: "networkidle" },
  );
  await adminPage
    .getByRole("heading", { name: /رسائل WhatsApp للعملاء والطلاب/ })
    .waitFor({ timeout: 20_000 });
  assert.equal(
    await adminPage.evaluate(() => document.documentElement.dir),
    "rtl",
    "messaging document must be RTL",
  );
  await screenshot(adminPage, "01-messaging-rtl.png");

  await adminPage.getByLabel("اسم الحملة").fill(CAMPAIGN_NAME);
  await adminPage.getByLabel("قالب Meta").click();
  await adminPage
    .getByRole("option", { name: new RegExp(TEMPLATE_NAME) })
    .click();
  await adminPage.getByLabel("التوقيت").click();
  await adminPage.getByRole("option", { name: "جدولة" }).click();
  const localDate = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  await adminPage.locator('input[type="datetime-local"]').fill(
    `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(
      localDate.getDate(),
    )}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`,
  );
  await adminPage.getByRole("button", { name: "مراجعة وتأكيد الإرسال" }).click();

  const dialog = adminPage.getByRole("dialog");
  await dialog.getByText("تأكيد الحملة قبل الإرسال").waitFor();
  const dialogText = await dialog.innerText();
  assert.match(dialogText, /غير راغب في الإكمال/);
  assert.match(dialogText, /أوقف الرسائل/);
  assert.match(dialogText, /مؤهل/);
  await screenshot(adminPage, "02-messaging-confirmation-exclusions.png", false);
  await dialog.getByRole("button", { name: "تأكيد وجدولة الحملة" }).click();
  await adminPage.getByText("تم جدولة الحملة").waitFor({ timeout: 15_000 });
  await adminPage.getByText(CAMPAIGN_NAME).first().waitFor();

  const card = adminPage
    .locator("div.rounded-2xl.border")
    .filter({ hasText: CAMPAIGN_NAME })
    .first();
  await card.getByRole("button", { name: "إلغاء" }).click();
  const cancelDialog = adminPage.getByRole("dialog");
  await cancelDialog.getByLabel("سبب إلغاء الحملة").fill("E2E إلغاء قبل التنفيذ");
  await cancelDialog.getByRole("button", { name: "تأكيد الإلغاء" }).click();
  await adminPage.getByText("تم إلغاء الحملة").waitFor({ timeout: 15_000 });

  const db = await getDb();
  const rows = await db!
    .select()
    .from(campaigns)
    .where(like(campaigns.name, `%${CAMPAIGN_NAME}%`));
  assert.equal(rows[0]?.status, "cancelled", "campaign must be cancelled");
  created.campaignIds.push(rows[0]!.id);
}

async function runAccountsFlow() {
  await adminPage.goto(`${BASE_URL}/admin?tab=accounts`, {
    waitUntil: "networkidle",
  });
  await adminPage
    .getByRole("heading", { name: /الاشتراكات والمدفوعات والمصروفات/ })
    .waitFor({ timeout: 20_000 });
  await adminPage.getByText("المحصل هذا الشهر").waitFor();
  await screenshot(adminPage, "03-accounts-dashboard.png");

  await adminPage.getByRole("button", { name: "الاشتراكات" }).click();
  await adminPage.getByRole("button", { name: "اشتراك جديد" }).click();
  const createDialog = adminPage.getByRole("dialog");
  await createDialog.getByLabel("الطالب").click();
  await adminPage.getByRole("option", { name: STUDENT_NAME }).click();
  await createDialog.getByLabel("المبلغ الأساسي").fill("1500");
  await createDialog.getByRole("button", { name: "حفظ الاشتراك" }).click();
  await adminPage.getByText("تم إنشاء الاشتراك").waitFor({ timeout: 20_000 });

  const db = await getDb();
  const subRows = await db!
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.studentId, studentUi.id));
  assert.equal(subRows.length, 1, "UI-created subscription must exist");
  created.subscriptionIds.push(subRows[0]!.id);

  await adminPage.getByText(STUDENT_NAME).first().waitFor();
  const row = adminPage.locator("tr").filter({ hasText: STUDENT_NAME }).first();
  await row.getByRole("button", { name: "دفعة" }).click();
  await adminPage.getByLabel("مبلغ الدفعة").fill("500");
  await adminPage.getByRole("button", { name: "تسجيل الدفعة" }).click();
  await adminPage.getByText(/تم تسجيل الدفعة وإصدار الإيصال/).waitFor({
    timeout: 20_000,
  });
  await screenshot(adminPage, "04-payment-receipt.png", false);
  const [receipt] = await Promise.all([
    adminPage.waitForEvent("download", { timeout: 20_000 }),
    adminPage.getByRole("button", { name: "تنزيل إيصال PDF" }).click(),
  ]);
  const receiptPath = path.join(shotDir, "receipt-e2e.pdf");
  await receipt.saveAs(receiptPath);
  assert.ok(fs.statSync(receiptPath).size > 1000, "receipt PDF must not be empty");
  await adminPage.keyboard.press("Escape");
  await adminPage.getByRole("dialog").waitFor({ state: "hidden" });

  const partialRow = adminPage.locator("tr").filter({ hasText: STUDENT_NAME }).first();
  await partialRow.getByText("مدفوع جزئياً").waitFor({ timeout: 20_000 });

  await partialRow.getByRole("button", { name: "دفعة" }).click();
  const remaining = await adminPage.getByLabel("مبلغ الدفعة").inputValue();
  assert.ok(Number(remaining) > 0, "remaining balance must be prefilled");
  await adminPage.getByRole("button", { name: "تسجيل الدفعة" }).click();
  await adminPage.getByText(/تم تسجيل الدفعة وإصدار الإيصال/).waitFor({
    timeout: 20_000,
  });
  await adminPage.keyboard.press("Escape");
  await adminPage.getByRole("dialog").waitFor({ state: "hidden" });
  const paidRow = adminPage.locator("tr").filter({ hasText: STUDENT_NAME }).first();
  await paidRow.getByText("مدفوع", { exact: true }).waitFor({ timeout: 20_000 });
  await screenshot(adminPage, "05-subscription-paid.png");

  const paymentRows = await db!
    .select()
    .from(payments)
    .where(eq(payments.subscriptionId, subRows[0]!.id));
  assert.equal(paymentRows.length, 2, "partial + final payment must both be stored");
  const reminderRows = await db!
    .select()
    .from(paymentReminders)
    .where(eq(paymentReminders.subscriptionId, subRows[0]!.id));
  assert.ok(
    reminderRows.every(item => item.status !== "pending"),
    "full payment must cancel pending reminders",
  );

  await adminPage.getByRole("button", { name: "المصروفات" }).click();
  await adminPage.getByLabel("مبلغ المصروف").fill("75");
  await adminPage.getByLabel("وصف المصروف").fill(EXPENSE_DESC);
  await adminPage.getByRole("button", { name: "تسجيل المصروف" }).click();
  await adminPage.getByText("تم تسجيل المصروف").waitFor({ timeout: 20_000 });

  await adminPage.getByRole("button", { name: "التقارير" }).click();
  await adminPage.getByText("التقارير المالية").waitFor({ timeout: 20_000 });
  await adminPage.getByText("صافي الربح").waitFor({ timeout: 20_000 });
  await adminPage.getByText("المحصل").first().waitFor();
  await screenshot(adminPage, "06-financial-reports.png");
  const [excel] = await Promise.all([
    adminPage.waitForEvent("download", { timeout: 20_000 }),
    adminPage.getByRole("button", { name: "تصدير Excel" }).click(),
  ]);
  const excelPath = path.join(shotDir, "financial-report-e2e.xlsx");
  await excel.saveAs(excelPath);
  assert.ok(fs.statSync(excelPath).size > 1000, "Excel report must not be empty");

  await adminPage.getByRole("button", { name: "الإعدادات" }).click();
  await adminPage.getByText("إعدادات الرسائل والمدفوعات").waitFor();
  await screenshot(adminPage, "07-finance-settings.png");
}

async function runPermissionChecks() {
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, STAFF_EMAIL, "/messaging");
  await staffPage
    .getByRole("heading", { name: /رسائل WhatsApp للعملاء والطلاب/ })
    .waitFor({ timeout: 20_000 });
  await staffPage.goto(`${BASE_URL}/accounts`, { waitUntil: "networkidle" });
  await staffPage.getByText("المدفوعات").first().waitFor();
  assert.equal(
    await staffPage.getByText("لوحة الحسابات").count(),
    0,
    "reception without reports permission must not see the dashboard",
  );
  assert.equal(
    await staffPage.getByText("التقارير", { exact: true }).count(),
    0,
    "reception without reports permission must not see reports",
  );
  await screenshot(staffPage, "08-staff-accounts-permissions.png");
  await staffContext.close();

  const instructorContext = await browser.newContext();
  const instructorPage = await instructorContext.newPage();
  await login(instructorPage, INSTRUCTOR_EMAIL, "/messaging");
  await instructorPage
    .getByText("لا تملك صلاحية المراسلة")
    .waitFor({ timeout: 20_000 });
  await screenshot(instructorPage, "09-instructor-messaging-gate.png");
  await instructorPage.goto(`${BASE_URL}/accounts`, { waitUntil: "networkidle" });
  await instructorPage
    .getByText("لا تملك صلاحية الوصول")
    .waitFor({ timeout: 20_000 });
  await screenshot(instructorPage, "10-instructor-accounts-gate.png");
  await instructorContext.close();
}

async function runMobileCheck() {
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.goto(
    `${BASE_URL}/messaging?source=leads&ids=${created.leadIds.join(",")}`,
    { waitUntil: "networkidle" },
  );
  await adminPage
    .getByRole("heading", { name: /رسائل WhatsApp للعملاء والطلاب/ })
    .waitFor({ timeout: 20_000 });
  const overflow = await adminPage.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  await screenshot(adminPage, "11-messaging-mobile-390.png");
  assert.ok(overflow <= 2, `mobile layout must not overflow (${overflow}px)`);
  await adminPage.setViewportSize({ width: 1440, height: 900 });
}

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  try {
    const campaignRows = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(like(campaigns.name, `%${RUN}%`));
    const campaignIds = campaignRows.map(row => row.id);
    if (campaignIds.length) {
      await db
        .delete(campaignRecipients)
        .where(inArray(campaignRecipients.campaignId, campaignIds));
      await db.delete(campaigns).where(inArray(campaigns.id, campaignIds));
    }
    const subscriptionRows = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(inArray(subscriptions.studentId, created.studentIds));
    const subscriptionIds = subscriptionRows.map(row => row.id);
    if (subscriptionIds.length) {
      await db
        .delete(paymentReminders)
        .where(inArray(paymentReminders.subscriptionId, subscriptionIds));
      await db
        .delete(payments)
        .where(inArray(payments.subscriptionId, subscriptionIds));
      await db
        .delete(subscriptions)
        .where(inArray(subscriptions.id, subscriptionIds));
    }
    await db.delete(expenses).where(like(expenses.description, `%${RUN}%`));
    if (created.templateIds.length) {
      await db
        .delete(messageTemplates)
        .where(inArray(messageTemplates.id, created.templateIds));
    }
    if (created.studentIds.length) {
      await db
        .delete(studentCourses)
        .where(inArray(studentCourses.studentId, created.studentIds));
      await db.delete(students).where(inArray(students.id, created.studentIds));
    }
    if (created.leadIds.length) {
      await db.delete(leads).where(inArray(leads.id, created.leadIds));
    }
    if (created.userIds.length) {
      await db.delete(leadStaff).where(inArray(leadStaff.userId, created.userIds));
      await db.delete(users).where(inArray(users.id, created.userIds));
      await db
        .delete(auditLogs)
        .where(inArray(auditLogs.actorUserId, created.userIds));
    }
  } catch (error) {
    console.error("[Phase2 E2E cleanup]", error);
  }
}

try {
  console.log(`Phase 2 E2E · run ${RUN} · ${BASE_URL}`);
  await seed();
  browser = await chromium.launch({ headless: true });
  adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  adminPage = await adminContext.newPage();
  await login(adminPage, ADMIN_EMAIL, "/admin");
  await adminPage.getByRole("heading", { name: /Admin workspace|مساحة عمل الإدارة|لوحة التحكم/ }).waitFor({
    timeout: 20_000,
  });

  await runMessagingFlow();
  await runAccountsFlow();
  await runPermissionChecks();
  await runMobileCheck();

  const db = await getDb();
  const finalReminder = await db!
    .select({ count: subscriptions.id })
    .from(subscriptions)
    .where(and(inArray(subscriptions.studentId, created.studentIds)));
  console.log(`E2E completed. Test subscriptions: ${finalReminder.length}`);
  console.log(`Screenshots and files: ${shotDir}`);
} catch (error) {
  console.error("PHASE 2 E2E FAILED", error);
  process.exitCode = 1;
} finally {
  const timeout = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms).unref());
  await Promise.race([
    adminContext?.close().catch(() => undefined) ?? Promise.resolve(),
    timeout(5_000),
  ]);
  await Promise.race([
    browser?.close().catch(() => undefined) ?? Promise.resolve(),
    timeout(5_000),
  ]);
  await Promise.race([cleanup(), timeout(30_000)]);
  await connection.end().catch(() => undefined);
  // Playwright and the MySQL pool can keep handles alive on Windows. Exit
  // explicitly so CI/ops scripts do not appear hung after the report is done.
  process.exit(process.exitCode ?? 0);
}
