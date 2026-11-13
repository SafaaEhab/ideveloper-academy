/**
 * E2E for the remaining manager-audit fixes:
 *   N-01, R-02, R-03  student portal text/copy labels
 *   R-04              announcement form does not pre-fill
 *   R-05              Arabic 404
 *   R-06              accessible home gallery lightbox
 *
 * Seeds an isolated admin, student and disabled announcement, then removes all
 * three in `finally`. It never touches production data.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, type Browser } from "playwright";
import { eq } from "drizzle-orm";
import {
  announcements,
  studentCourses,
  students,
  userCredentials,
  users,
} from "../drizzle/schema";
import { getDb, upsertCredential, upsertUser } from "../server/db";
import { hashPassword } from "../server/_core/password";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = String(Date.now()).slice(-7);
const ADMIN_EMAIL = `admin-issues-${RUN}@example.com`;
const ADMIN_PASSWORD = randomBytes(18).toString("base64url");
const STUDENT_CODE = `IDA-E2E${RUN}`;
const ANNOUNCEMENT_TITLE = `إعلان اختبار المشكلات ${RUN}`;
const outDir = path.resolve("reports", "phase2", "remaining-issues");
fs.mkdirSync(outDir, { recursive: true });

let browser: Browser | null = null;
const db = await getDb();
if (!db) throw new Error("DATABASE_URL is required");

const hash = hashPassword(ADMIN_PASSWORD);
await upsertCredential({
  email: ADMIN_EMAIL,
  passwordHash: hash.hash,
  salt: hash.salt,
});
await upsertUser({
  openId: `email:${ADMIN_EMAIL}`,
  email: ADMIN_EMAIL,
  name: "مشرف اختبار المشكلات",
  loginMethod: "email",
  role: "admin",
  lastSignedIn: new Date(),
});

await db.insert(students).values({
  name: `طالب اختبار المشكلات ${RUN}`,
  phone: "01012345678",
  accessCode: STUDENT_CODE,
  status: "active",
});
const studentRows = await db
  .select({ id: students.id })
  .from(students)
  .where(eq(students.accessCode, STUDENT_CODE))
  .limit(1);
const studentId = studentRows[0]!.id;
await db.insert(studentCourses).values({ studentId, course: "Python" });

await db.insert(announcements).values({
  badge: "اختبار",
  title: ANNOUNCEMENT_TITLE,
  headline: "اختبار نموذج الإعلان",
  body: "هذا إعلان اختبار مؤقت لا يظهر للزوار.",
  enabled: false,
});
const announcementRows = await db
  .select({ id: announcements.id })
  .from(announcements)
  .where(eq(announcements.title, ANNOUNCEMENT_TITLE))
  .limit(1);
const announcementId = announcementRows[0]!.id;

function report(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function waitForApp(page: import("playwright").Page) {
  await page
    .waitForFunction(
      () =>
        document.getElementById("root")?.style.visibility === "visible" ||
        !document.getElementById("boot"),
      undefined,
      { timeout: 20_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

async function closeAnnouncement(page: import("playwright").Page) {
  const close = page.getByRole("button", { name: "إغلاق الإعلان" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(200);
  }
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
    permissions: ["clipboard-read", "clipboard-write"],
  });

  // R-05: Arabic 404, RTL.
  const publicPage = await context.newPage();
  await publicPage.goto(`${BASE_URL}/this-route-does-not-exist-${RUN}`, {
    waitUntil: "networkidle",
  });
  await waitForApp(publicPage);
  report(
    "R-05 Arabic 404 heading",
    await publicPage.getByRole("heading", { name: "الصفحة غير موجودة" }).isVisible(),
  );
  report(
    "R-05 404 is RTL",
    (await publicPage.evaluate(() => document.documentElement.dir)) === "rtl",
  );
  await publicPage.screenshot({
    path: path.join(outDir, "r05-404.png"),
    fullPage: true,
    animations: "disabled",
  });

  // R-06: home gallery lightbox opens, closes with Escape.
  await publicPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await waitForApp(publicPage);
  await publicPage.waitForTimeout(1_200);
  await closeAnnouncement(publicPage);
  const galleryPhoto = publicPage
    .getByRole("button", { name: /^عرض صورة .* بالحجم الكامل$/ })
    .first();
  const hasGallery = (await galleryPhoto.count()) > 0;
  report("R-06 gallery photos are buttons", hasGallery);
  if (hasGallery) {
    await galleryPhoto.scrollIntoViewIfNeeded();
    await galleryPhoto.click();
    const dialog = publicPage.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5_000 });
    report("R-06 lightbox opens", await dialog.isVisible());
    await publicPage.screenshot({
      path: path.join(outDir, "r06-lightbox.png"),
      animations: "disabled",
    });
    await publicPage.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 5_000 });
    report("R-06 Escape closes lightbox", true);
  }

  // N-01, R-02, R-03: student portal text and copy labels.
  const studentPage = await context.newPage();
  await studentPage.goto(`${BASE_URL}/student`, { waitUntil: "networkidle" });
  await waitForApp(studentPage);
  await studentPage.locator("#student-access-code").fill(STUDENT_CODE);
  await studentPage.getByRole("button", { name: /افتح الكورس/ }).click();
  await studentPage.getByText("خريطة المنهج").waitFor({ timeout: 20_000 });
  const portalText = await studentPage.locator("body").innerText();
  report("N-01 progress label is readable", portalText.includes("تقدمك في المنهج"));
  report("N-01 no question-mark placeholder", !portalText.includes("?????"));
  report(
    "R-02 no mojibake markers",
    !/â€”|â€¢|Â·|ï¿½/.test(portalText),
  );
  const copyButtons = studentPage.getByRole("button", { name: "نسخ الكود" });
  const copyCount = await copyButtons.count();
  report("R-03 copy button has an action label", copyCount > 0, `count=${copyCount}`);
  if (copyCount > 0) {
    await copyButtons.first().scrollIntoViewIfNeeded();
    await copyButtons.first().click();
    await studentPage.getByText("تم نسخ الكود").waitFor({ timeout: 5_000 });
    report("R-03 copy toast is separate and Arabic", true);
  }
  await studentPage.screenshot({
    path: path.join(outDir, "student-portal-copy.png"),
    fullPage: false,
    animations: "disabled",
  });

  // R-04: no auto-prefill; the explicit button loads the newest row for editing.
  // A separate context matters: the student portal mirrors its token into
  // sessionStorage, and the tRPC client prefers that Bearer token over the admin
  // cookie. Reusing the context would make /admin see the student identity.
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
  });
  const adminPage = await adminContext.newPage();
  adminPage.on("pageerror", error => console.log("ADMIN PAGEERROR", error.message));
  adminPage.on("console", message => {
    if (message.type() === "error") console.log("ADMIN CONSOLE", message.text());
  });
  adminPage.on("response", async response => {
    if (response.url().includes("/api/auth/login")) {
      console.log(
        "ADMIN LOGIN RESPONSE",
        response.status(),
        (await response.headerValue("set-cookie")) ?? "no-set-cookie",
      );
    }
  });
  await adminPage.goto(`${BASE_URL}/login?returnTo=/admin`, {
    waitUntil: "networkidle",
  });
  await waitForApp(adminPage);
  await adminPage.locator("#login-email").fill(ADMIN_EMAIL);
  await adminPage.locator("#login-password").fill(ADMIN_PASSWORD);
  await Promise.all([
    adminPage.waitForURL("**/admin**", { timeout: 20_000 }),
    adminPage.getByRole("button", { name: "تسجيل الدخول" }).click(),
  ]);
  await adminPage.waitForTimeout(1_000);
  console.log("ADMIN COOKIES", JSON.stringify(await adminContext.cookies()));
  const meResponse = await adminContext.request.get(`${BASE_URL}/api/auth/me`);
  console.log("ADMIN ME", meResponse.status(), (await meResponse.text()).slice(0, 240));
  await adminPage.goto(`${BASE_URL}/admin?tab=announcements`, {
    waitUntil: "networkidle",
  });
  await waitForApp(adminPage);
  if (!(await adminPage.getByText("إعلان جديد", { exact: true }).isVisible().catch(() => false))) {
    console.log("ADMIN BODY", (await adminPage.locator("body").innerText()).slice(0, 1200));
    await adminPage.screenshot({
      path: path.join(outDir, "admin-announcements-debug.png"),
      fullPage: true,
      animations: "disabled",
    });
  }
  await adminPage.getByText("إعلان جديد", { exact: true }).waitFor({ timeout: 20_000 });
  const titleInput = adminPage.locator("#announcement-title");
  report(
    "R-04 form starts empty (no auto-prefill)",
    (await titleInput.inputValue()) === "",
  );
  await adminPage.getByRole("button", { name: "تحميل آخر إعلان للتعديل" }).click();
  await adminPage.getByText("تعديل الإعلان", { exact: true }).waitFor();
  report(
    "R-04 explicit load sets the form and editing state",
    (await titleInput.inputValue()) === ANNOUNCEMENT_TITLE,
  );
  await adminPage.getByRole("button", { name: "إلغاء التعديل" }).click();
  report(
    "R-04 cancel clears the form",
    (await titleInput.inputValue()) === "",
  );
  await adminPage.evaluate(() => window.scrollTo(0, 0));
  await adminPage.waitForTimeout(400);
  await adminPage.screenshot({
    path: path.join(outDir, "r04-announcements.png"),
    fullPage: true,
    animations: "disabled",
  });
  await adminContext.close();
} catch (error) {
  console.error("REMAINING ISSUES E2E FAILED", error);
  process.exitCode = 1;
} finally {
  await db
    .delete(announcements)
    .where(eq(announcements.id, announcementId))
    .catch(() => undefined);
  await db
    .delete(studentCourses)
    .where(eq(studentCourses.studentId, studentId))
    .catch(() => undefined);
  await db.delete(students).where(eq(students.id, studentId)).catch(() => undefined);
  await db.delete(users).where(eq(users.email, ADMIN_EMAIL)).catch(() => undefined);
  await db
    .delete(userCredentials)
    .where(eq(userCredentials.email, ADMIN_EMAIL))
    .catch(() => undefined);
  await browser?.close().catch(() => undefined);
  process.exit(process.exitCode ?? 0);
}
