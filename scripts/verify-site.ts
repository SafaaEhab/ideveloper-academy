// @ts-check
/**
 * Walks the whole curriculum in a real browser and checks the two things a
 * student notices first: that every picture loads, and that the live preview
 * actually runs.
 *
 * The student portal sits behind a login, so this drives `client/harness.html`
 * instead, which mounts the same components on the same data. What it checks is
 * therefore the real thing, not a mock of it.
 *
 * For every lesson in every course:
 *
 *   • every <img> rendered — does it have pixels? A 404 or a 0x0 image is the
 *     failure, and only a browser can see it.
 *   • every live preview — did it produce a document, did the script throw, and
 *     did the preview print an error into its own output?
 *   • the Python interpreter — press Run and read what it printed.
 *
 * Any console error or failed request anywhere on the page is collected too,
 * because a picture that fails quietly still leaves a hole on the page.
 *
 *   tsx scripts/verify-site.ts
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium, type ConsoleMessage } from "playwright";
import { allWebLessons, curriculumPhases } from "../client/src/data/webCurriculum";

const PORT = 5199;
const HARNESS_URL = `http://127.0.0.1:${PORT}/harness.html`;
const SHOTS = process.argv[2] ?? null;

const problems = [];
/** Requests the browser refused, and the ones the preview went on to explain. */
const refused = new Set();
const explained = new Set();
const note = (kind, where, detail) => problems.push(`${kind.padEnd(9)} ${where} — ${detail}`);

/**
 * Every name the preview has already told the student about, right now.
 *
 * Read while the lesson is still on screen. Walking on unmounts the preview, and
 * a note that was there a moment ago is gone with it — so collecting at the end
 * of the walk finds nothing and calls a working page broken.
 */
async function collectExplained(page) {
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const texts = await frame
      .locator(".preview-missing")
      .allTextContents()
      .catch(() => []);
    for (const text of texts) {
      for (const match of text.matchAll(/"([^"]+)"/g)) explained.add(match[1]);
      for (const match of text.matchAll(/([\w./-]+\.(?:png|jpe?g|gif|webp|svg|mp3|mp4))/gi)) {
        explained.add(match[1]);
      }
    }
  }
}

/** A page-wide log of everything the browser complained about. */
function watch(page) {
  page.on("console", message => {
    const type = /** @type {ConsoleMessage} */ (message).type();
    if (type !== "error") return;
    const text = message.text();
    // Pyodide reports a failed import through the console; that is the
    // interpreter's own answer and the runner turns it into visible output.
    if (text.includes("Failed to load resource")) return;
    note("console", label, text.slice(0, 180));
  });
  page.on("pageerror", error => note("pageerror", label, error.message.slice(0, 180)));
  page.on("requestfailed", request => {
    const failure = request.failure()?.errorText ?? "";
    if (failure.includes("ERR_ABORTED")) return;
    // The dev-only log collector the vite plugin injects; it is not part of the
    // application and its absence says nothing about a student.
    if (request.url().includes("/__manus__/")) return;
    // Held rather than reported: a file the preview cannot load is only a defect
    // if nothing on the page explains it. The preview bridge writes a note naming
    // the file, and that note is the whole feature — so the walk judges what the
    // student sees, not what the network did.
    refused.add(request.url());
  });
  page.on("response", response => {
    if (response.status() < 400) return;
    if (response.url().includes("favicon")) return;
    if (response.url().includes("/__manus__/")) return;
    // Held for the same reason a refused request is: a preview cannot fetch a
    // file the course does not ship, and the bridge is there to say so on the
    // page. A 404 is a perfectly successful response, so it arrives here rather
    // than through `requestfailed` — and both go through the same judgement.
    refused.add(response.url());
  });
}

/**
 * Every image on the page, with whether the browser got pixels for it.
 *
 * Sampling straight away would call a still-loading picture broken, so this waits
 * for the page to settle first. `complete` is the flag that says the fetch is
 * over either way — a picture that failed also becomes complete, with no pixels.
 */
async function settleImages(page, timeout = 8000) {
  await page
    .waitForFunction(
      () => [...document.images].every(image => image.complete),
      undefined,
      { timeout }
    )
    .catch(() => {});
}

async function images(page) {
  return page.$$eval("img", nodes =>
    nodes.map(node => ({
      src: node.getAttribute("src") ?? "",
      ok: node.complete && node.naturalWidth > 0,
      natural: `${node.naturalWidth}x${node.naturalHeight}`,
      shown: node.getBoundingClientRect().width > 0,
    }))
  );
}

/** Every preview on the page, with whether the script inside it ran cleanly. */
async function previews(page) {
  const frames = page.frames().filter(frame => frame !== page.mainFrame());
  const rows = [];
  for (const frame of frames) {
    const srcdoc = await frame
      .locator("body")
      .evaluate(node => node.ownerDocument.documentElement.outerHTML.length)
      .catch(() => 0);
    const output = await frame
      .locator("#output")
      .textContent({ timeout: 2000 })
      .catch(() => null);
    const text = await frame
      .locator("body")
      .innerText({ timeout: 2000 })
      .catch(() => "");
    const scriptError = await frame
      .locator("#output")
      .textContent({ timeout: 500 })
      .then(value => (value ?? "").trim().startsWith("Error:"))
      .catch(() => false);
    rows.push({
      srcdocBytes: srcdoc,
      printed: (output ?? "").trim().slice(0, 90),
      showsText: text.trim().length > 0,
      scriptError,
    });
  }
  return rows;
}

/**
 * Opens every accordion on the lesson page and says how many it managed.
 *
 * The page keeps its first three sections open and closes the rest, so a walk
 * that only reads what happens to be visible checks a third of the course and
 * calls it whole. Returns the fraction opened, because a number that quietly
 * varies between runs is not a number to report as coverage.
 */
async function expandAllSections(page) {
  const countHeaders = async () => {
    const headers = await page.$$("#web-lesson-detail button");
    let total = 0;
    let closed = 0;
    for (const header of headers) {
      const label = (await header.textContent().catch(() => "")) ?? "";
      // A section header is the only button whose text begins with its number.
      if (!/^\s*\d+\s*[—-]/.test(label.trim())) continue;
      total++;
      // The content sits in the element straight after the header button, so its
      // presence is the state. Anything cleverer reads the wrong thing.
      const open = await header.evaluate(node => node.nextElementSibling !== null);
      if (!open) closed++;
    }
    return { total, closed };
  };

  const first = await countHeaders();
  if (first.total === 0) return { total: 0, opened: 0 };

  for (let pass = 0; pass < first.total + 2; pass++) {
    const { closed } = await countHeaders();
    if (closed === 0) break;
    for (const header of await page.$$("#web-lesson-detail button")) {
      const label = (await header.textContent().catch(() => "")) ?? "";
      if (!/^\s*\d+\s*[—-]/.test(label.trim())) continue;
      // The content sits in the element straight after the header button, so its
      // presence is the state. Anything cleverer reads the wrong thing.
      const open = await header.evaluate(node => node.nextElementSibling !== null);
      if (!open) await header.click().catch(() => {});
    }
    await page.waitForTimeout(150);
  }

  const last = await countHeaders();
  return { total: last.total, opened: last.total - last.closed };
}

let server;
async function startDevServer() {
  // Vite's own entry point, run through this node. Shelling out to `npx` fails
  // on Windows with EINVAL, because a `.cmd` is not something spawn can exec.
  // The path goes through `fileURLToPath` because a `.pathname` is percent
  // encoded, and this project sits in a folder with a space in its name.
  const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  server = spawn(
    process.execPath,
    [vite, "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  server.stderr?.on("data", chunk => {
    const text = String(chunk);
    if (/error/i.test(text)) console.error(text.trim().slice(0, 300));
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`vite exited with ${server.exitCode}`);
    const up = await fetch(HARNESS_URL)
      .then(response => response.ok)
      .catch(() => false);
    if (up) return;
    await new Promise(wait => setTimeout(wait, 700));
  }
  throw new Error("the dev server never came up");
}

/** ── the walk ─────────────────────────────────────────────────────────── */

console.log(`starting the dev server on ${PORT}…`);
await startDevServer();
console.log("up\n");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
watch(page);
await page.goto(HARNESS_URL, { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForSelector('[data-probe="Web:course"]', { timeout: 60_000 });

let checkedImages = 0;
let checkedPreviews = 0;
let checkedSections = 0;
let openedSections = 0;

// ── the Web course, lesson by lesson, through its own sidebar ──────────────
for (const phase of curriculumPhases) {
  const monthButton = page.locator(`aside button:has-text("Month ${phase.month}")`).first();
  if ((await monthButton.count()) === 0) continue;
  await monthButton.click();
  await page.waitForTimeout(200);

  const lessonButtons = page.locator('aside button[aria-current], aside div.space-y-2 > button');
  const count = await lessonButtons.count();

  for (let index = 0; index < count; index++) {
    const button = page.locator("aside .space-y-2").last().locator("> button").nth(index);
    if ((await button.count()) === 0) continue;
    const title = (await button.textContent())?.replace(/\s+/g, " ").trim() ?? "";
    await button.click();
    await page.waitForTimeout(150);
    const coverage = await expandAllSections(page);
    checkedSections += coverage.total;
    openedSections += coverage.opened;
    await page.waitForTimeout(900);

    const label = `Web · ${title.slice(0, 46)}`;
    if (coverage.total > 0 && coverage.opened < coverage.total) {
      note("coverage", label, `only ${coverage.opened} of ${coverage.total} sections opened`);
    }

    await settleImages(page);
    for (const image of await images(page)) {
      checkedImages++;
      if (!image.ok) note("image", label, `${image.src.slice(0, 90)} (${image.natural})`);
    }
    for (const preview of await previews(page)) {
      checkedPreviews++;
      if (preview.scriptError) {
        note("preview", label, `printed ${preview.printed}`);
      }
    }
    // Read the notes now, while this lesson's previews are still mounted.
    await collectExplained(page);
  }
  console.log(`  month ${phase.month} (${phase.en}) walked`);
}

// ── the Python and Scratch tracks ─────────────────────────────────────────
for (const course of ["Python", "Scratch"]) {
  const sections = page.locator(`[data-probe^="${course}:"]`);
  const count = await sections.count();
  for (let index = 0; index < count; index++) {
    const section = sections.nth(index);
    const label = await section.getAttribute("data-probe");
    await settleImages(page);
    for (const image of await section.locator("img").evaluateAll(nodes =>
      nodes.map(node => ({
        src: node.getAttribute("src") ?? "",
        ok: node.complete && node.naturalWidth > 0,
        natural: `${node.naturalWidth}x${node.naturalHeight}`,
      }))
    )) {
      checkedImages++;
      if (!image.ok) note("image", label ?? course, `${image.src.slice(0, 90)} (${image.natural})`);
    }
  }
  console.log(`  ${course}: ${count} lessons checked`);
}

// ── the Python interpreter, actually running something ───────────────────
const runners = page.locator('[data-probe^="Python:"] button:has-text("Run")');
const runnerCount = Math.min(await runners.count(), 4);
console.log(`\nrunning the Python interpreter on ${runnerCount} lessons…`);
for (let index = 0; index < runnerCount; index++) {
  const block = runners.nth(index);
  const label = await block.evaluate(node => node.closest("[data-probe]")?.getAttribute("data-probe") ?? "?");
  await block.click();
  // Pyodide is a large download the first time; this is the wait for it.
  await page
    .locator(`${label ? `[data-probe="${label}"] ` : ""}pre`)
    .first()
    .filter({ hasText: /\S/ })
    .waitFor({ timeout: 120_000 })
    .catch(() => {});
  const printed = await page
    .locator(`${label ? `[data-probe="${label}"] ` : ""}pre`)
    .first()
    .textContent()
    .catch(() => "");
  const ok = Boolean(printed && printed.trim().length > 0);
  console.log(`  ${ok ? "ran " : "EMPTY"} ${label}${ok ? `  ${printed!.trim().split("\n")[0].slice(0, 50)}` : ""}`);
  if (!ok) note("python", label ?? "?", "the interpreter printed nothing");
}

if (SHOTS) {
  await page.screenshot({ path: SHOTS, fullPage: false });
  console.log(`\nscreenshot: ${SHOTS}`);
}

/** The files the browser refused that the preview never accounted for. */
const unexplained = [...refused].filter(url => {
  const name = url.split("/").pop() ?? url;
  // The note may name the file the way the lesson wrote it — `images/poster.jpg`
  // where the request was for `.../images/poster.jpg` — so the two are compared
  // by path ending rather than by equality.
  return ![...explained].some(
    known => known === name || known.endsWith(`/${name}`) || name.endsWith(`/${known}`)
  );
});
for (const url of unexplained) note("request", "page", `refused and unexplained ${url}`);

await browser.close();
server?.kill();

console.log(
  `\n${openedSections} of ${checkedSections} lesson sections opened and checked`
);
console.log(`${checkedImages} images and ${checkedPreviews} previews checked`);
console.log(
  `${refused.size} file(s) the browser refused, ${explained.size} of them explained on the page`
);
if (problems.length === 0) {
  console.log("\nnothing broken");
  process.exit(0);
}
console.log(`\n${problems.length} problem(s):`);
for (const problem of problems) console.log("  " + problem);
process.exit(1);
