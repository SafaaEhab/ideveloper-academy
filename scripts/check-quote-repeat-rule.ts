// @ts-check
/**
 * Proves the one claim the Quote of the Day session makes about behaviour that
 * cannot be seen in a screenshot: the same quote is never shown twice in a row.
 *
 * A real browser is asked to click the button many times and watch for a repeat.
 * Then the worst case is forced — every pick landing on the same index — because
 * that is the only situation the rule exists for, and a run of random numbers
 * would probably never reach it.
 */
import { chromium } from "playwright";
import { allWebLessons } from "../client/src/data/webCurriculum";

const lesson = allWebLessons.find(item => item.id === "js-4");
const solution = lesson?.sections.find(section => section.solutionCode)
  ?.solutionCode;
if (!solution) throw new Error("js-4 has no solution to test");

const browser = await chromium.launch();
const host = await browser.newPage();
await host.setContent(
  `<!DOCTYPE html><html><body style="margin:0"><iframe title="p" width="1100" height="700" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcdoc="${solution.replace(
    /&/g,
    "&amp;"
  ).replace(/"/g, "&quot;")}"></iframe></body></html>`,
  { waitUntil: "networkidle" }
);

const frame = host.frameLocator("iframe[title='p']");
const read = async () => ({
  quote: ((await frame.locator("#quote").textContent()) ?? "").trim(),
  author: ((await frame.locator("#author").textContent()) ?? "").trim(),
});

const seen = [];
for (let press = 0; press < 200; press++) {
  await frame.locator("#newQuote").click();
  seen.push(await read());
}
const realRepeats = seen.filter(
  (entry, index) => index > 0 && entry.quote === seen[index - 1].quote
);

/** Every quote must belong to the quote above it, so authors travel together. */
const mismatched = seen.filter(
  entry => entry.quote !== "" && (entry.author === "" || entry.quote === "")
);

const worst: string[] = [];
for (let press = 0; press < 12; press++) {
  // 0.11 * 7 is 0.77, which floors to index 0 every single time.
  await frame
    .locator("body")
    .evaluate(() => {
      window.Math.random = () => 0.11;
    });
  await frame.locator("#newQuote").click();
  worst.push((await read()).quote.slice(0, 30));
}
await browser.close();

const forcedRepeats = worst.filter(
  (quote, index) => index > 0 && quote === worst[index - 1]
);

console.log(
  JSON.stringify(
    {
      presses: seen.length,
      distinctQuotes: new Set(seen.map(entry => entry.quote)).size,
      realRepeats: realRepeats.length,
      emptyAuthorOrQuote: mismatched.length,
      forcedRuns: worst.length,
      forcedDistinct: [...new Set(worst)],
      forcedRepeats: forcedRepeats.length,
    },
    null,
    2
  )
);

if (realRepeats.length > 0 || mismatched.length > 0 || forcedRepeats.length > 0) {
  console.error("\nFAILED — the repeat rule does not hold");
  process.exit(1);
}
console.log("\nOK — never the same quote twice in a row, in either case");
