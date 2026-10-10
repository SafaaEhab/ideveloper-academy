/**
 * One-off codemod: re-base the CSS track on the real Family Bakery page.
 *
 * The project is no longer a four-page site: it is the one page the course
 * builds all the way through, and its six sections are named the way the real
 * `index.html` names them. This swaps the project vocabulary in place — shop
 * name, file names, class names, palette, and image paths — so the sessions
 * talk about the page the student is actually looking at.
 *
 *   npx tsx scripts/rebase-css-on-bakery.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "client/src/data/webCurriculum.ts";

const SWAPS: [RegExp, string][] = [
  // the shop
  [/Happy Crumb Bakery/g, "Family Bakery"],
  [/Happy Crumb/g, "Family Bakery"],
  // the one page, and its sections
  [/the four pages/gi, "the page"],
  [/all four pages/gi, "the page"],
  [/four files/gi, "one file"],
  [/index\.html, about\.html, products\.html and order\.html/g, "index.html"],
  [/index\.html, about\.html, products\.html or order\.html/g, "index.html"],
  [/about\.html/g, "index.html"],
  [/products\.html/g, "index.html"],
  [/order\.html/g, "index.html"],
  [/index\.html end to end, then index\.html, index\.html and index\.html/g,
   "index.html, top half then bottom half"],
  // the classes and ids the real page uses
  [/\.tagline/g, ".main-part"],
  [/class="tagline"/g, 'class="main-part"'],
  [/\.detail/g, ".info"],
  [/\.card\b/g, ".baking"],
  [/\.card--wide/g, ".baking--wide"],
  [/#products/g, "#baking"],
  [/#opening-hours/g, "#about"],
  [/#find-us/g, "#information"],
  [/id="products"/g, 'id="baking"'],
  [/id="opening-hours"/g, 'id="about"'],
  [/id="find-us"/g, 'id="information"'],
  [/#story/g, "#location"],
  // the palette of the real site
  [/#7c2d12/g, "#8e7754"],
  [/#b45309/g, "#8e7754"],
  [/#f59e0b/g, "#c9a227"],
  [/#57534e/g, "#e8e4dd"],
  [/#44403c/g, "#f5f5f5"],
  [/#334155/g, "#f5f5f5"],
  [/#1c1917/g, "#2b2926"],
  [/#fdf6ec/g, "#f9f9f9"],
  [/#ffffff/g, "#f5f5f5"],
  [/#e7e5e4/g, "#4a4740"],
  [/#fcd34d/g, "#a98b5f"],
  [/#fef3c7/g, "#3a3833"],
  [/#78716c/g, "#c9c5bd"],
  [/#cbd5e1/g, "#5c5850"],
  [/#94a3b8/g, "#a9a49b"],
  [/#b91c1c/g, "#c9a227"],
  [/#166534/g, "#8e7754"],
  [/#e7e5e4/g, "#4a4740"],
  // the pictures
  [/\.\/images\/baladi\.jpg/g, "/curriculum/bakery/hero.jpeg"],
  [/\.\/images\/baking1\.jpeg/g, "/curriculum/bakery/baking-1.jpeg"],
];

let src = readFileSync(FILE, "utf8");

// Only the CSS block moves to the new project. The JavaScript sessions after it
// are someone else's work and must come out of this unchanged.
const cssStart = src.indexOf("    id: \"css-1\",");
const cssEnd = src.indexOf("    id: \"js-1\",");
if (cssStart < 0 || cssEnd < 0) throw new Error("CSS block not found");

// The target-document previews are gone: the homework board is blank now, and
// the pictures of the real site live in the sessions themselves.
const previewsStart = src.indexOf("/**\n * The homework targets:");
if (previewsStart < 0) throw new Error("previews block not found");
const previewsEnd = src.indexOf("const cssJsLessons: WebLesson[] = [");
if (previewsEnd < 0 || previewsEnd < previewsStart)
  throw new Error("previews end not found");

let block = src.slice(cssStart, cssEnd);
const before = block;
for (const [pattern, to] of SWAPS) block = block.replace(pattern, to);

// The target result is no longer rendered anywhere, so the fields go too.
block = block
  .replace(/^ *homeworkPreviewCode: homeworkPreviews\["css-\d"\],\n/gm, "")
  .replace(/^ *homeworkTargetFile: "[^"]*",\n/gm, "");

const next =
  src.slice(0, previewsStart) + src.slice(previewsEnd, cssStart) + block + src.slice(cssEnd);

if (block === before) {
  console.log("nothing changed — the vocabulary was already swapped");
} else {
  writeFileSync(FILE, next, "utf8");
  console.log("re-based the CSS track on the Family Bakery page");
}
