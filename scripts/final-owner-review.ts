// @ts-nocheck
/**
 * Final Owner Review harness.
 *
 * Requires a running production build (`node dist/server.cjs`) with
 * OWNER_EMAIL=REVIEW_OWNER_EMAIL, plus a seeded review owner:
 *   REVIEW_OWNER_EMAIL=... REVIEW_OWNER_PASSWORD=... pnpm exec tsx scripts/review-owner-account.ts seed
 *
 * It captures all 13 admin tabs on desktop and mobile, audits RTL/overflow and
 * visible English tokens, exercises the admin CRUD paths with temporary data,
 * verifies the database, and removes only its own rows in `finally`.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { eq, like } from "drizzle-orm";
import {
  achievements,
  adminInvites,
  announcements,
  courseOfferings,
  groups,
  groupSessions,
  instructors,
  studentCourses,
  students,
  userCredentials,
  users,
} from "../drizzle/schema";
import { getDb } from "../server/db";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const RUN = process.env.REVIEW_RUN ?? String(Date.now()).slice(-7);
const OWNER_EMAIL = process.env.REVIEW_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.REVIEW_OWNER_PASSWORD;
if (!OWNER_EMAIL || !OWNER_PASSWORD) {
  throw new Error("REVIEW_OWNER_EMAIL and REVIEW_OWNER_PASSWORD are required");
}

const STUDENT_NAME = `طالب مراجعة المالك ${RUN}`;
const STUDENT_PHONE = `010${String(RUN).replace(/\D/g, "").padStart(8, "0").slice(-8)}`;
const INSTRUCTOR_NAME = `مدرب مراجعة ${RUN}`;
const INSTRUCTOR_EMAIL = `review-instructor-${RUN}@example.com`;
const GROUP_NAME = `مجموعة مراجعة ${RUN}`;
const ACHIEVEMENT_TITLE = `إنجاز مراجعة ${RUN}`;
const ANNOUNCEMENT_TITLE = `إعلان مراجعة ${RUN}`;
const ADMIN_INVITE = `review-admin-${RUN}@example.com`;

const outDir = path.resolve("reports", "phase2", "final-owner-review");
fs.mkdirSync(outDir, { recursive: true });

const db = await getDb();
if (!db) throw new Error("DATABASE_URL is required");

const results: { name: string; ok: boolean; detail?: string }[] = [];
const audits: Record<string, unknown> = {};
const cleanup = {
  studentId: null as number | null,
  instructorId: null as number | null,
  groupId: null as number | null,
  achievementId: null as number | null,
  announcementId: null as number | null,
  pythonOriginalStatus: null as string | null,
};

function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function waitForApp(page: Page) {
  await page
    .waitForFunction(
      () => document.getElementById("root")?.style.visibility === "visible",
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(350);
}

async function waitForAdminReady(page: Page) {
  await waitForApp(page);
  await page
    .waitForFunction(
      () =>
        !document.body.innerText.includes("جارٍ تحميل مساحة العمل") &&
        !document.body.innerText.includes("جارٍ تحميل مساحة"),
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(450);
}

async function revealForShot(page: Page) {
  await waitForApp(page);
  await page.evaluate(() => {
    const boot = document.getElementById("boot");
    if (boot) boot.style.visibility = "hidden";
    window.scrollTo(0, 0);
  });
}

async function capture(page: Page, name: string, fullPage = true) {
  await revealForShot(page);
  if (fullPage) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
  }
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage,
    animations: "disabled",
  });
}

async function auditPage(page: Page, tab: string) {
  const audit = await page.evaluate(() => {
    const latinTokens = [
      ...new Set(
        (document.body.innerText.match(/[A-Za-z][A-Za-z0-9._@:/+!-]{2,}/g) ?? []).map(
          token => token.trim(),
        ),
      ),
    ].slice(0, 120);
    const latinAttrs = [
      ...new Set(
        [...document.querySelectorAll("[aria-label], [placeholder], [title]")]
          .flatMap(el => [
            el.getAttribute("aria-label"),
            el.getAttribute("placeholder"),
            el.getAttribute("title"),
          ])
          .filter((value): value is string => Boolean(value && /[A-Za-z]/.test(value))),
      ),
    ].slice(0, 120);
    const sidebar = document
      .querySelector('[data-slot="sidebar"]')
      ?.getBoundingClientRect();
    const table = document.querySelector("table");
    return {
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      sidebarLeft: sidebar ? Math.round(sidebar.left) : null,
      viewport: window.innerWidth,
      tableDirection: table ? getComputedStyle(table).direction : null,
      latinTokens,
      latinAttrs,
    };
  });
  audits[tab] = audit;
  return audit;
}

async function goto(page: Page, tab: string) {
  await page.goto(`${BASE_URL}/admin${tab === "overview" ? "" : `?tab=${tab}`}`, {
    waitUntil: "networkidle",
  });
  await waitForAdminReady(page);
}

let browser: Browser | null = null;
let context: BrowserContext | null = null;

try {
  const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
  if (!health?.ok) throw new Error(`Server is not healthy at ${BASE_URL}`);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.on("pageerror", error => console.log("PAGEERROR", error.message));
  page.on("console", message => {
    if (message.type() === "error") console.log("CONSOLE", message.text());
  });
  page.on("dialog", dialog => dialog.accept().catch(() => undefined));

  await page.goto(`${BASE_URL}/login?returnTo=/admin`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await page.locator("#login-email").fill(OWNER_EMAIL);
  await page.locator("#login-password").fill(OWNER_PASSWORD);
  await Promise.all([
    page.waitForURL("**/admin**", { timeout: 20_000 }),
    page.getByRole("button", { name: "تسجيل الدخول" }).click(),
  ]);
  await waitForApp(page);
  await page.getByText("لوحة التحكم", { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);

  const ownerVisible = await page
    .getByRole("button", { name: "المشرفون وصلاحيات الوصول" })
    .isVisible()
    .catch(() => false);
  check("Owner can see the owner-only Admins navigation", ownerVisible);
  if (!ownerVisible) {
    const text = (await page.locator("body").innerText()).slice(0, 500);
    console.log("OWNER LOGIN BODY", text);
  }

  // ── 1. Screenshots + RTL/overflow/English audit ───────────────────────────
  const tabs = [
    ["overview", "نظرة عامة"],
    ["analytics", "الأداء"],
    ["students", "الطلاب"],
    ["instructors", "المدربون"],
    ["schedule", "الجدول"],
    ["courses", "الكورسات"],
    ["leads", "العملاء المحتملون"],
    ["messaging", "المراسلة"],
    ["accounts", "الحسابات"],
    ["achievements", "الإنجازات"],
    ["announcements", "الإعلان"],
    ["backup", "النسخ الاحتياطي"],
    ["admins", "المشرفون"],
  ] as const;

  for (const [index, [tab, label]] of tabs.entries()) {
    await goto(page, tab);
    if (tab === "admins") {
      await page
        .getByText("طلبات الوصول", { exact: false })
        .waitFor({ timeout: 20_000 })
        .catch(() => undefined);
    }
    const audit = await auditPage(page, tab);
    check(`RTL direction on ${label}`, audit.dir === "rtl", `dir=${audit.dir}`);
    check(`No page horizontal overflow on ${label}`, audit.overflow <= 0, `overflow=${audit.overflow}`);
    if (tab !== "admins") {
      check(
        `Right sidebar on ${label}`,
        audit.sidebarLeft !== null && audit.sidebarLeft > audit.viewport / 2,
        `left=${audit.sidebarLeft}`,
      );
    }
    await capture(page, `desktop-${String(index + 1).padStart(2, "0")}-${tab}`);
    console.log("captured", tab, label);
  }

  // Sidebar dropdown + dialog.
  await goto(page, "overview");
  const userMenuButton = page.locator('[data-slot="sidebar-footer"] button').first();
  await userMenuButton.click();
  await page.getByRole("menu").waitFor({ timeout: 5_000 });
  await capture(page, "desktop-sidebar-user-menu", false);
  await page.keyboard.press("Escape");

  await goto(page, "schedule");
  await page.getByRole("button", { name: "حصة جديدة" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 5_000 });
  await capture(page, "desktop-dialog-new-session", false);
  await page.keyboard.press("Escape");

  // Mobile screenshots.
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await waitForApp(mobile);
  for (const [index, [tab, label]] of tabs.entries()) {
    await goto(mobile, tab);
    const audit = await auditPage(mobile, `mobile-${tab}`);
    check(`Mobile RTL on ${label}`, audit.dir === "rtl", `dir=${audit.dir}`);
    check(
      `Mobile no horizontal overflow on ${label}`,
      audit.overflow <= 0,
      `overflow=${audit.overflow}`,
    );
    await capture(mobile, `mobile-${String(index + 1).padStart(2, "0")}-${tab}`);
  }
  await goto(mobile, "overview");
  await mobile.getByRole("button", { name: "فتح أو إغلاق القائمة" }).click();
  await mobile.getByRole("dialog").waitFor({ timeout: 5_000 });
  await capture(mobile, "mobile-sidebar-open", false);
  await mobile.keyboard.press("Escape");

  // ── 2. Student CRUD ──────────────────────────────────────────────────────
  await goto(page, "students");
  await page.getByText("إضافة طالب جديد", { exact: true }).waitFor({ timeout: 20_000 });
  await page.locator('input[placeholder="مثال: لينا أحمد"]').fill(STUDENT_NAME);
  await page.locator('input[placeholder="01012345678"]').fill(STUDENT_PHONE);
  await page.getByRole("button", { name: "إنشاء الطالب" }).click();
  await page.getByText(/تم إنشاء الطالب/).waitFor({ timeout: 20_000 });
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.name, STUDENT_NAME))
    .limit(1);
  cleanup.studentId = studentRows[0]?.id ?? null;
  check("Student created and persisted", Boolean(studentRows[0]), `id=${cleanup.studentId}`);
  check(
    "Student access code generated",
    Boolean(studentRows[0]?.accessCode?.startsWith("IDA-")),
    studentRows[0]?.accessCode ? "IDA-…" : "missing",
  );
  if (studentRows[0]) {
    const row = page.locator("tr").filter({ hasText: STUDENT_NAME }).first();
    await row.getByRole("button", { name: "تعديل" }).click();
    await page.locator('input[placeholder="مثال: لينا أحمد"]').fill(`${STUDENT_NAME} معدل`);
    await page.getByRole("button", { name: "حفظ التعديلات" }).click();
    await page.getByText("تم تحديث بيانات الطالب").waitFor({ timeout: 20_000 });
    const edited = await db
      .select()
      .from(students)
      .where(eq(students.id, studentRows[0].id))
      .limit(1);
    check("Student edit persisted", edited[0]?.name === `${STUDENT_NAME} معدل`);

    await page
      .locator("tr")
      .filter({ hasText: `${STUDENT_NAME} معدل` })
      .first()
      .getByRole("button", { name: `حذف ${STUDENT_NAME} معدل` })
      .click();
    await page.getByText("تم حذف الطالب").waitFor({ timeout: 20_000 });
    const gone = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, studentRows[0].id))
      .limit(1);
    check("Student delete persisted", gone.length === 0);
    cleanup.studentId = null;
  }

  // ── 3. Instructor CRUD ───────────────────────────────────────────────────
  await goto(page, "instructors");
  await page.locator("#instructor-name").fill(INSTRUCTOR_NAME);
  await page.locator("#instructor-email").fill(INSTRUCTOR_EMAIL);
  await page.locator("#instructor-password").fill(`ReviewPass-${RUN}!`);
  await page.locator("#instructor-title").fill("مراجعة المالك");
  await page.getByRole("button", { name: "إضافة المدرب" }).click();
  await page.getByText(/تمت إضافة المدرب/).waitFor({ timeout: 20_000 });
  const instructorRows = await db
    .select()
    .from(users)
    .where(eq(users.email, INSTRUCTOR_EMAIL))
    .limit(1);
  cleanup.instructorId = instructorRows[0]?.id ?? null;
  check(
    "Instructor created with instructor role",
    instructorRows[0]?.role === "instructor",
  );
  const credentialRows = await db
    .select({ email: userCredentials.email })
    .from(userCredentials)
    .where(eq(userCredentials.email, INSTRUCTOR_EMAIL))
    .limit(1);
  check("Instructor login credential created", credentialRows.length === 1);
  if (instructorRows[0]) {
    const card = page.locator("div.admin-card-soft").filter({ hasText: INSTRUCTOR_EMAIL }).first();
    await card.getByRole("button", { name: "تعديل" }).click();
    await page.locator("#edit-title").fill("مراجعة المالك المعدلة");
    await page.getByRole("button", { name: "حفظ التعديلات" }).click();
    await page.getByText("تم تحديث بيانات المدرب").waitFor({ timeout: 20_000 });
    const edited = await db
      .select()
      .from(users)
      .where(eq(users.id, instructorRows[0].id))
      .limit(1);
    check("Instructor edit persisted", edited[0]?.name === INSTRUCTOR_NAME);

    await page
      .locator("div.admin-card-soft")
      .filter({ hasText: INSTRUCTOR_EMAIL })
      .first()
      .getByRole("button", { name: `حذف ${INSTRUCTOR_NAME}` })
      .click();
    await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    await page.getByRole("dialog").getByRole("button", { name: "حذف المدرب" }).click();
    await page.getByText("تم حذف المدرب").waitFor({ timeout: 20_000 });
    const profileGone = await db
      .select({ id: instructors.id })
      .from(instructors)
      .where(eq(instructors.email, INSTRUCTOR_EMAIL));
    const downgraded = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, instructorRows[0].id))
      .limit(1);
    check(
      "Instructor delete persisted",
      profileGone.length === 0 && downgraded[0]?.role === "user",
    );
    cleanup.instructorId = null;
  }

  // ── 4. Course status change + restore ────────────────────────────────────
  const originalRows = await db
    .select()
    .from(courseOfferings)
    .where(eq(courseOfferings.course, "Python"))
    .limit(1);
  cleanup.pythonOriginalStatus = originalRows[0]?.status ?? null;
  const statusLabel: Record<string, string> = {
    live: "متاح للحجز",
    coming_soon: "قريباً",
    waiting_list: "قائمة انتظار",
  };
  async function waitForCourseStatus(expected: string) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const rows = await db
        .select({ status: courseOfferings.status })
        .from(courseOfferings)
        .where(eq(courseOfferings.course, "Python"))
        .limit(1);
      if (rows[0]?.status === expected) return true;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return false;
  }
  await goto(page, "courses");
  if (cleanup.pythonOriginalStatus) {
    const targetStatus =
      cleanup.pythonOriginalStatus === "waiting_list" ? "coming_soon" : "waiting_list";
    await page.getByRole("combobox", { name: "حالة كورس بايثون" }).click();
    await page.getByRole("option", { name: statusLabel[targetStatus] }).click();
    await page.getByText("تم تحديث حالة الكورس").waitFor({ timeout: 20_000 });
    check(
      "Course status persisted",
      await waitForCourseStatus(targetStatus),
    );

    await page.waitForTimeout(900);
    await page.getByRole("combobox", { name: "حالة كورس بايثون" }).click();
    await page
      .getByRole("option", { name: statusLabel[cleanup.pythonOriginalStatus] })
      .click();
    await page.getByText("تم تحديث حالة الكورس").waitFor({ timeout: 20_000 });
    check(
      "Course status restored",
      await waitForCourseStatus(cleanup.pythonOriginalStatus),
    );
  }

  // ── 5. Schedule group/session create + delete ────────────────────────────
  await goto(page, "schedule");
  await page.getByRole("button", { name: "حصة جديدة" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 5_000 });
  await page.locator("#session-group").fill(GROUP_NAME);
  await page.locator("#session-start").fill("17:00");
  await page.locator("#session-end").fill("18:30");
  await page.getByRole("dialog").getByRole("button", { name: "حفظ" }).click();
  await page.getByText("تمت إضافة الحصة إلى الجدول").waitFor({ timeout: 20_000 });
  const groupRows = await db
    .select()
    .from(groups)
    .where(eq(groups.name, GROUP_NAME))
    .limit(1);
  cleanup.groupId = groupRows[0]?.id ?? null;
  check("Schedule group created", Boolean(groupRows[0]), `id=${cleanup.groupId}`);
  if (groupRows[0]) {
    const sessionRows = await db
      .select()
      .from(groupSessions)
      .where(eq(groupSessions.groupId, groupRows[0].id));
    check("Weekly session created", sessionRows.length > 0, `sessions=${sessionRows.length}`);
    await page
      .getByRole("button", { name: `حذف ${GROUP_NAME}` })
      .click();
    await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    await page.getByRole("dialog").getByRole("button", { name: "حذف المجموعة" }).click();
    await page.getByText("تم حذف المجموعة").waitFor({ timeout: 20_000 });
    const gone = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, groupRows[0].id))
      .limit(1);
    check("Schedule group delete persisted", gone.length === 0);
    cleanup.groupId = null;
  }

  // ── 6. Achievement create + delete ───────────────────────────────────────
  await goto(page, "achievements");
  await page.locator('input[placeholder^="https://"]').fill("/images/ideveloper/feature.webp");
  await page.locator("#achievement-title").fill(ACHIEVEMENT_TITLE);
  await page.locator("#achievement-description").fill(`وصف إنجاز اختبار ${RUN}`);
  await page.locator("#achievement-date").fill("2026");
  await page.getByRole("button", { name: "نشر الإنجاز" }).click();
  await page.getByText("تم نشر الإنجاز على الصفحة الرئيسية").waitFor({ timeout: 20_000 });
  const achievementRows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.title, ACHIEVEMENT_TITLE))
    .limit(1);
  cleanup.achievementId = achievementRows[0]?.id ?? null;
  check("Achievement created and persisted", Boolean(achievementRows[0]));
  if (achievementRows[0]) {
    await page
      .locator("div.rounded-2xl.border")
      .filter({ hasText: ACHIEVEMENT_TITLE })
      .last()
      .getByRole("button", { name: "حذف الإنجاز" })
      .click();
    await page.getByText("تم حذف الإنجاز").waitFor({ timeout: 20_000 });
    const gone = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(eq(achievements.title, ACHIEVEMENT_TITLE));
    check("Achievement delete persisted", gone.length === 0);
    cleanup.achievementId = null;
  }

  // ── 7. Announcement create + delete ──────────────────────────────────────
  await goto(page, "announcements");
  await page.locator("#announcement-title").fill(ANNOUNCEMENT_TITLE);
  await page.locator("#announcement-body").fill(`نص إعلان اختبار ${RUN}`);
  await page.getByRole("button", { name: "نشر إعلان جديد" }).click();
  await page.getByText(/تم حفظ الإعلان/).waitFor({ timeout: 20_000 });
  const announcementRows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.title, ANNOUNCEMENT_TITLE))
    .limit(1);
  cleanup.announcementId = announcementRows[0]?.id ?? null;
  check("Announcement created and persisted", Boolean(announcementRows[0]));
  if (announcementRows[0]) {
    await page
      .locator("div.admin-card-soft")
      .filter({ hasText: ANNOUNCEMENT_TITLE })
      .getByRole("button", { name: "حذف الإعلان" })
      .first()
      .click();
    await page.getByText("تم حذف الإعلان").waitFor({ timeout: 20_000 });
    const gone = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, announcementRows[0].id))
      .limit(1);
    check("Announcement delete persisted", gone.length === 0);
    cleanup.announcementId = null;
  }

  // ── 8. Owner-only admin invite add/remove ────────────────────────────────
  await goto(page, "admins");
  await page.getByText("إضافة مشرف مباشرة").waitFor({ timeout: 20_000 });
  await page.locator('input[placeholder="teacher@example.com"]').fill(ADMIN_INVITE);
  await page.getByRole("button", { name: "منح صلاحية الإدارة" }).click();
  await page.getByText("تم منح صلاحية الإدارة").waitFor({ timeout: 20_000 });
  const inviteRows = await db
    .select()
    .from(adminInvites)
    .where(eq(adminInvites.email, ADMIN_INVITE))
    .limit(1);
  check("Owner can add an admin invite", inviteRows.length === 1);
  await page
    .getByRole("button", { name: `سحب صلاحية ${ADMIN_INVITE}` })
    .click();
  await page.getByText("تم سحب صلاحية الإدارة").waitFor({ timeout: 20_000 });
  const inviteGone = await db
    .select({ id: adminInvites.id })
    .from(adminInvites)
    .where(eq(adminInvites.email, ADMIN_INVITE))
    .limit(1);
  check("Owner can remove the admin invite", inviteGone.length === 0);

  // ── 9. Excel backup + visible integration states ─────────────────────────
  const backupDir = path.resolve("App_Data", "excel-backups");
  const beforeBackups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
  await goto(page, "backup");
  await page.getByRole("button", { name: "إنشاء نسخة الآن" }).click();
  await page.getByText("تم إنشاء نسخة Excel جديدة").waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const afterBackups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
  check(
    "Excel backup created on disk",
    afterBackups.length > beforeBackups.length,
    `${beforeBackups.length} → ${afterBackups.length}`,
  );
  const newest = afterBackups
    .map(name => ({ name, mtime: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  check("Backup UI shows the latest copy", Boolean(newest), newest?.name);

  await goto(page, "leads");
  const leadsText = await page.locator("body").innerText();
  check(
    "Google Sheets local warning is visible instead of a false success",
    /Google Sheets/.test(leadsText) && /غير مهيأ|لم يتم النسخ/.test(leadsText),
  );
  await goto(page, "messaging");
  const messagingText = await page.locator("body").innerText();
  check(
    "WhatsApp live state is visibly unconfigured",
    /WhatsApp/.test(messagingText) && /غير مهيأ|مفقود|missing/i.test(messagingText),
  );
  await goto(page, "accounts");
  check(
    "Accounts dashboard opens",
    await page.getByText("الاشتراكات والمدفوعات", { exact: false }).first().isVisible(),
  );

  fs.writeFileSync(
    path.join(outDir, "english-audit.json"),
    JSON.stringify(audits, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "review-results.json"),
    JSON.stringify({ run: RUN, ownerEmail: OWNER_EMAIL, results }, null, 2),
    "utf8",
  );
} catch (error) {
  console.error("FINAL OWNER REVIEW FAILED", error);
  check("Review harness completed without an uncaught error", false, String(error));
} finally {
  try {
    if (cleanup.studentId) {
      await db.delete(studentCourses).where(eq(studentCourses.studentId, cleanup.studentId));
      await db.delete(students).where(eq(students.id, cleanup.studentId));
    }
    const studentLeftovers = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.name, STUDENT_NAME));
    for (const row of studentLeftovers) {
      await db.delete(studentCourses).where(eq(studentCourses.studentId, row.id));
      await db.delete(students).where(eq(students.id, row.id));
    }
    const editedStudentLeftovers = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.name, `${STUDENT_NAME} معدل`));
    for (const row of editedStudentLeftovers) {
      await db.delete(studentCourses).where(eq(studentCourses.studentId, row.id));
      await db.delete(students).where(eq(students.id, row.id));
    }
    if (cleanup.instructorId) {
      await db.delete(instructors).where(eq(instructors.userId, cleanup.instructorId));
      await db.delete(users).where(eq(users.id, cleanup.instructorId));
    }
    await db.delete(instructors).where(eq(instructors.email, INSTRUCTOR_EMAIL));
    await db.delete(userCredentials).where(eq(userCredentials.email, INSTRUCTOR_EMAIL));
    await db.delete(users).where(eq(users.email, INSTRUCTOR_EMAIL));
    if (cleanup.groupId) {
      await db.delete(groupSessions).where(eq(groupSessions.groupId, cleanup.groupId));
      await db.delete(groups).where(eq(groups.id, cleanup.groupId));
    }
    const leftoverGroups = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.name, GROUP_NAME));
    for (const row of leftoverGroups) {
      await db.delete(groupSessions).where(eq(groupSessions.groupId, row.id));
      await db.delete(groups).where(eq(groups.id, row.id));
    }
    if (cleanup.achievementId) {
      await db.delete(achievements).where(eq(achievements.id, cleanup.achievementId));
    }
    await db.delete(achievements).where(eq(achievements.title, ACHIEVEMENT_TITLE));
    if (cleanup.announcementId) {
      await db.delete(announcements).where(eq(announcements.id, cleanup.announcementId));
    }
    await db.delete(announcements).where(eq(announcements.title, ANNOUNCEMENT_TITLE));
    await db.delete(adminInvites).where(eq(adminInvites.email, ADMIN_INVITE));
    if (cleanup.pythonOriginalStatus) {
      await db
        .update(courseOfferings)
        .set({ status: cleanup.pythonOriginalStatus })
        .where(eq(courseOfferings.course, "Python"));
    }
  } catch (error) {
    console.error("[final review cleanup]", error);
  }
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  fs.writeFileSync(
    path.join(outDir, "review-results.json"),
    JSON.stringify({ run: RUN, ownerEmail: OWNER_EMAIL, results }, null, 2),
    "utf8",
  );
  console.log("FINAL_OWNER_REVIEW_DONE", results.filter(r => r.ok).length, "/", results.length);
  process.exit(process.exitCode ?? 0);
}
