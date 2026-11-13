/**
 * Admin redesign visual + functional E2E.
 *
 * Usage:
 *   PHASE=before npx tsx scripts/admin-redesign-e2e.ts
 *   PHASE=after  npx tsx scripts/admin-redesign-e2e.ts
 *
 * Seeds an isolated admin account (and removes it afterwards). It does not touch
 * production data; README explicitly points at the Aiven staging DATABASE_URL.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import { eq } from "drizzle-orm";
import { userCredentials, users } from "../drizzle/schema";
import { getDb, upsertCredential, upsertUser } from "../server/db";
import { hashPassword } from "../server/_core/password";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PHASE = (process.env.PHASE ?? "before").toLowerCase();
const RUN = String(Date.now()).slice(-7);
const EMAIL = `admin-redesign-${PHASE}-${RUN}@example.com`;
const PASSWORD = randomBytes(18).toString("base64url");
const outDir = path.resolve("reports", "phase2", `admin-${PHASE}`);
fs.mkdirSync(outDir, { recursive: true });

const tabs = [
  ["overview", "نظرة عامة"],
  ["analytics", "الأداء"],
  ["students", "الطلاب"],
  ["leads", "العملاء المحتملون"],
  ["messaging", "المراسلة"],
  ["accounts", "الحسابات"],
  ["instructors", "المدربون"],
  ["schedule", "الجدول"],
  ["courses", "الكورسات"],
  ["achievements", "الإنجازات"],
  ["announcements", "الإعلان"],
  ["backup", "النسخ الاحتياطي"],
  ["admins", "المشرفون"],
] as const;

let browser: Browser | null = null;

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required");
  const hash = hashPassword(PASSWORD);
  await upsertCredential({
    email: EMAIL,
    passwordHash: hash.hash,
    salt: hash.salt,
  });
  await upsertUser({
    openId: `email:${EMAIL}`,
    email: EMAIL,
    name: "مشرف اختبار التعريب",
    loginMethod: "email",
    role: "admin",
    lastSignedIn: new Date(),
  });
  const rows = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  if (!rows[0]) throw new Error("test admin missing");
  return rows[0];
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login?returnTo=/admin`, {
    waitUntil: "networkidle",
  });
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL("**/admin**", { timeout: 20_000 }),
    page.getByRole("button", { name: /Sign in|تسجيل الدخول/ }).click(),
  ]);
  await page.waitForTimeout(1_500);
}

async function capture(page: Page, name: string, fullPage = true) {
  // The static first-paint shell is visible until main.tsx reveals #root. Wait
  // for that before hiding it, otherwise removing it early would skip the
  // reveal path and leave #root hidden forever.
  await page
    .waitForFunction(
      () => document.getElementById("root")?.style.visibility === "visible",
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => undefined);
  await page.evaluate(() => {
    const boot = document.getElementById("boot");
    if (boot) boot.style.visibility = "hidden";
  });
  if (fullPage) {
    // Chromium can retain the previous route's composited layer when a full-page
    // screenshot stitches a page taller than the viewport. Force a repaint.
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

try {
  await seed();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
  });
  const page = await context.newPage();
  page.on("pageerror", error => console.log("PAGEERROR", error.message));
  page.on("console", message => {
    if (message.type() === "error") console.log("CONSOLE", message.text());
  });
  await login(page);

  for (const [tab, label] of tabs) {
    if (tab === "admins") {
      // Owner-only; the isolated test account is not the owner. The fallback is
      // covered by the non-owner permission checks in Phase 2 E2E.
      continue;
    }
    await page.goto(`${BASE_URL}/admin?tab=${tab}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_300);
    console.log("url", tab, page.url());
    await capture(page, `desktop-${tab}`);
    console.log("captured", tab, label);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of ["overview", "students", "leads", "messaging", "accounts", "schedule"] as const) {
    await page.goto(`${BASE_URL}/admin?tab=${tab}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);
    await capture(page, `mobile-${tab}`);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  console.log(`mobile-overflow=${overflow}`);
  await context.close();
} catch (error) {
  console.error("ADMIN REDESIGN E2E FAILED", error);
  process.exitCode = 1;
} finally {
  const db = await getDb();
  if (db) {
    await db.delete(users).where(eq(users.email, EMAIL)).catch(() => undefined);
    await db
      .delete(userCredentials)
      .where(eq(userCredentials.email, EMAIL))
      .catch(() => undefined);
  }
  await browser?.close().catch(() => undefined);
  process.exit(process.exitCode ?? 0);
}
