// @ts-check
/**
 * A contact sheet of every picture the courses point at, fetched from Cloudinary
 * and laid out with its name and size.
 *
 * Two things are checked at once that a status code cannot settle: whether the
 * URL really renders a picture in a browser, and whether the picture is the one
 * the lesson is asking for. A 200 for `python-s11-3.png` says an image by that
 * name exists; only looking at it says it is the right one.
 *
 *   tsx scripts/cloudinary-contact-sheet.ts <out.png>
 */
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { allWebLessons } from "../client/src/data/webCurriculum";
import { allHtmlLessons } from "../client/src/data/htmlCurriculum";
import { allCssLessons } from "../client/src/data/cssCurriculum";
import { allPythonLessons } from "../client/src/data/pythonCurriculum";
import { allScratchLessons } from "../client/src/data/scratchCurriculum";
import { chromium } from "playwright";

const CLOUD = "alhiemg0";
const UPLOAD = `https://res.cloudinary.com/${CLOUD}/image/upload`;
const ROOT = "client/public";
const OUT = process.argv[2] ?? "contact-sheet.png";

/** Only the sheets worth looking at: what is still on disk, and the covers. */
const onDisk = new Set(
  existsSync(join(ROOT, "curriculum"))
    ? (function walk(dir) {
        const out = [];
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) out.push(...walk(full));
          else out.push("/" + relative(ROOT, full).replace(/\\/g, "/"));
        }
        return out;
      })(join(ROOT, "curriculum"))
    : []
);

const wanted = [];
for (const [course, lessons] of Object.entries({
  Web: allWebLessons,
  HTML: allHtmlLessons,
  CSS: allCssLessons,
  Python: allPythonLessons,
  Scratch: allScratchLessons,
})) {
  for (const lesson of lessons) {
    const sources = [
      lesson.heroImage ?? "",
      ...lesson.sections.flatMap(section => section.images ?? []),
      ...lesson.quiz.flatMap(question => [
        ...(question.questionImages ?? []),
        ...(question.optionImages ?? []).flat().filter(Boolean),
      ]),
    ];
    for (const src of sources) {
      if (!src) continue;
      const name = src.split("/").pop()!;
      const id = name.includes("/") ? name.split("/").pop()! : name;
      const local = `/curriculum/${course.toLowerCase()}/`;
      const interesting =
        onDisk.has(src) ||
        /^python-|^js-|^css-|^random-quote|^bookmarker|^logoscratch|^hero-coding|^prompt/.test(id);
      if (!interesting) continue;
      if (!wanted.some(item => item.id === id)) {
        wanted.push({ id, name, course, lesson: lesson.id, local: onDisk.has(src) });
      }
    }
  }
}

console.log(`${wanted.length} pictures on the sheet`);

const cells = wanted
  .map(
    ({ id, course, lesson, local }) => `
      <figure>
        <img src="${UPLOAD}/${id}" alt="${id}" loading="eager" />
        <figcaption>
          <b>${id}</b>
          <span>${course} · ${lesson}${local ? " · <em>still on disk</em>" : ""}</span>
        </figcaption>
      </figure>`
  )
  .join("");

const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:20px; background:#0f172a; color:#e2e8f0;
         font-family:"Segoe UI",system-ui,sans-serif }
  h1 { font-size:20px; margin:0 0 16px }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px }
  figure { margin:0; background:#1e293b; border:1px solid #334155; border-radius:10px; overflow:hidden }
  img { width:100%; height:150px; object-fit:contain; background:#fff; display:block }
  figcaption { padding:8px 10px; font-size:11px; line-height:1.5 }
  figcaption b { display:block; color:#7dd3fc; word-break:break-all }
  figcaption span { color:#94a3b8 }
  em { color:#fbbf24; font-style:normal }
</style></head><body>
  <h1>Cloudinary — every picture these courses point at</h1>
  <div class="grid">${cells}</div>
</body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1400, height: 900 } });

/** A picture that failed to load is the whole point of the exercise. */
const broken = [];
tab.on("response", response => {
  if (response.request().resourceType() === "image" && !response.ok()) {
    broken.push(`${response.status()} ${response.url()}`);
  }
});
tab.on("requestfailed", request => {
  if (request.resourceType() === "image") broken.push(`failed ${request.url()}`);
});

await tab.setContent(page, { waitUntil: "networkidle" });
await tab.waitForTimeout(1500);

const sizes = await tab.evaluate(() =>
  [...document.querySelectorAll("figure")].map(figure => {
    const img = figure.querySelector("img");
    return {
      name: figure.querySelector("b").textContent,
      loaded: img!.complete && img!.naturalWidth > 0,
      natural: `${img!.naturalWidth}x${img!.naturalHeight}`,
    };
  })
);

writeFileSync(OUT, await tab.screenshot({ fullPage: true }));
await browser.close();

const failed = sizes.filter(size => !size.loaded);
for (const size of sizes) {
  console.log(`  ${size.loaded ? "ok  " : "FAIL"} ${size.name.padEnd(34)} ${size.natural}`);
}
console.log(`\n${sizes.length - failed.length} rendered, ${failed.length} broken`);
for (const line of [...new Set(broken)]) console.log("  " + line);
console.log(`\nsheet: ${OUT}`);
if (failed.length > 0) process.exit(1);
