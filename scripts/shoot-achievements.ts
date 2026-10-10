// @ts-check
/**
 * Screenshots the achievements section so the layout can be checked in a real
 * browser, and reports console errors, failed requests and horizontal overflow.
 *
 *   npx tsx scripts/shoot-achievements.ts http://localhost:3001 <outDir>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "screenshots";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "safsafehab012345@gmail.com";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems: string[] = [];

  for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("console", message => { if (message.type() === "error") problems.push(`[${name}] console: ${message.text()}`); });
    page.on("pageerror", error => problems.push(`[${name}] pageerror: ${error.message}`));
    page.on("requestfailed", request => problems.push(`[${name}] failed: ${request.url()}`));

    for (const theme of ["dark", "light"]) {
      await page.goto(`${BASE}/?theme=${theme}`, { waitUntil: "networkidle" });
      const section = page.locator("#achievements");
      if (!(await section.count())) { problems.push(`[${name}] #achievements is missing`); continue; }
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await section.screenshot({ path: join(OUT, `achievements-${name}-${theme}.png`) });
      const overflow = await section.evaluate(node => node.scrollWidth - node.clientWidth);
      if (overflow > 1) problems.push(`[${name}/${theme}] achievements overflows by ${overflow}px`);
      if (theme === "dark") console.log(`[${name}] ${await section.locator("article").count()} achievement card(s)`);
    }

    await page.goto(BASE, { waitUntil: "networkidle" });
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (pageOverflow > 1) problems.push(`[${name}] page scrolls horizontally by ${pageOverflow}px`);

    if (name === "desktop") {
      await page.click('text="Admin login"');
      await page.waitForSelector('text="Admin email"');
      await page.fill('input[type="email"]', EMAIL);
      await page.click('text="Sign in (dev)"');
      await page.waitForSelector('text="Admin workspace"', { timeout: 20_000 });
      // The tab pill lives in the main panel; the sidebar entry shares its label.
      await page.locator("main").getByRole("button", { name: "Achievements", exact: true }).click();
      await page.waitForSelector("#achievement-description");
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT, "admin-achievements.png"), fullPage: true });
    }
    await context.close();
  }

  await browser.close();
  console.log(problems.length ? `\nPROBLEMS:\n${problems.map(p => `  - ${p}`).join("\n")}` : "\nNo console errors, failed requests or overflow.");
}

main().catch(error => { console.error("FAILED:", error.message); process.exit(1); });
