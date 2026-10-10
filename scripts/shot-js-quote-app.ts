// @ts-check
/**
 * Renders the Quote of the Day project the way a student sees it: inside an
 * iframe carrying the exact `sandbox` and `srcdoc` the live preview uses.
 * Two things come out of it — proof that the page really works in the sandbox
 * (a stylesheet from a CDN has to survive a document with an opaque origin),
 * and a screenshot for the session's "finished page" picture.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const PAGE = process.argv[2];
const OUT = process.argv[3];
const WIDTH = 1280;
const CHROME = 80;
const HEIGHT = 680;

const quote = readFileSync(PAGE, "utf8");

/** The browser frame the existing project pictures are shot in. */
const frame = (title: string, url: string, srcdoc: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff;font-family:"Segoe UI",system-ui,Arial,sans-serif}
  .tabs{height:40px;background:#202124;display:flex;align-items:flex-end;padding-left:8px;gap:4px}
  .tab{height:32px;min-width:230px;background:#35363a;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:8px;padding:0 10px;color:#e8eaed;font-size:12.5px}
  .tab .fav{width:16px;height:16px;border-radius:4px;background:linear-gradient(135deg,#0d2d68,#0099cc);flex:none}
  .tab span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .tab .x{color:#9aa0a6;font-size:14px}
  .tab .plus{width:32px;height:32px;color:#9aa0a6;font-size:18px;display:flex;align-items:center;justify-content:center}
  .bar{height:40px;background:#35363a;display:flex;align-items:center;gap:16px;padding:0 14px;color:#bdc1c6;font-size:14px}
  .bar .nav{display:flex;gap:14px}
  .url{flex:1;height:28px;background:#202124;border-radius:14px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#e8eaed;font-size:12.5px}
  .url .lock{font-size:11px;color:#9aa0a6}
  .star{font-size:15px;color:#bdc1c6}
  .ava{width:24px;height:24px;border-radius:50%;background:#7e57c2;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
  iframe{border:0;display:block}
</style></head><body>
  <div class="tabs">
    <div class="tab"><div class="fav"></div><span>${title}</span><div class="x">&#215;</div></div>
    <div class="tab"><div class="fav"></div><span>details.docx &mdash; Google Drive</span><div class="x">&#215;</div></div>
    <div class="tab"><div class="fav"></div><span>${title}</span><div class="x">&#215;</div></div>
    <div class="plus">+</div>
  </div>
  <div class="bar">
    <div class="nav"><span>&#8592;</span><span>&#8594;</span><span>&#8635;</span></div>
    <div class="url"><span class="lock">&#128274;</span>${url}</div>
    <div class="star">&#9734;</div>
    <div class="ava">S</div>
  </div>
  <iframe title="preview" width="${WIDTH}" height="${HEIGHT - CHROME}" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcdoc="${srcdoc.replace(
    /&/g,
    "&amp;"
  ).replace(/"/g, "&quot;")}"></iframe>
</body></html>`;

const html = frame("Quote of the Day", "localhost:5500/quote-of-the-day.html", quote);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

const problems = [];
page.on("console", message => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", error => problems.push(`pageerror: ${error.message}`));
page.on("requestfailed", request =>
  problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`)
);

await page.setContent(html, { waitUntil: "networkidle" });

const frameEl = page.frameLocator("iframe[title='preview']");

/** Reads what the page is actually showing, so a blank card cannot pass. */
const read = async () => ({
  quote: (await frameEl.locator("#quote").textContent())?.trim() ?? "",
  author: (await frameEl.locator("#author").textContent())?.trim() ?? "",
  bootstrap: await frameEl
    .locator(".card-body")
    .evaluate(node => getComputedStyle(node).backgroundImage),
});

const before = await read();
await frameEl.locator("#newQuote").click();
const afterOne = await read();
await frameEl.locator("#newQuote").click();
await frameEl.locator("#newQuote").click();
const afterTwo = await read();

writeFileSync(OUT, await page.screenshot());
await browser.close();

const report = {
  problems,
  bootstrapLoaded: before.bootstrap.includes("gradient"),
  buttonFound: before.quote !== undefined,
  emptyAtStart: before.quote === "" && before.author === "",
  firstClick: afterOne,
  changedOnLaterClick: afterTwo.quote !== afterOne.quote,
};
console.log(JSON.stringify(report, null, 2));

const bad =
  problems.length > 0 ||
  !report.bootstrapLoaded ||
  !report.emptyAtStart ||
  afterOne.quote === "" ||
  afterOne.author === "";
if (bad) {
  console.error("\nNOT READY to ship");
  process.exit(1);
}
