/**
 * One-off codemod: empty the HTML activities.
 *
 * The trainer fills the pictures in later, so an activity ships as a bare frame
 * and a blank editor: no words, no picture, no answer. The student is meant to
 * build the page from what the session taught, not to transcribe a solution.
 *
 * It rewrites every `s(` call whose title starts with "Activity:" into
 *
 *     s("Activity", undefined, undefined, undefined, "", undefined, undefined, true)
 *
 * which is the blank form: an empty body, no picture, an editor that opens on
 * an empty string, and `blank: true` for the renderer.
 *
 *   npx tsx scripts/empty-html-activities.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "client/src/data/htmlCurriculum.ts";

const BLANK = `      s(
        "Activity",
        undefined,
        undefined,
        undefined,
        "",
        undefined,
        undefined,
        true
      ),`;

let src = readFileSync(FILE, "utf8");
const anchor = '      s(\n        "Activity:';
let count = 0;
let cursor = 0;

for (;;) {
  const start = src.indexOf(anchor, cursor);
  if (start < 0) break;

  // Walk forward from the `(` of the call, so the match is the call's own `)`
  // and not the first bracket inside it.
  const paren = src.indexOf("(", start);
  let depth = 0;
  let quote: string | null = null;
  let close = -1;
  for (let i = paren; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) throw new Error(`unterminated s( at ${start}`);

  // The call is followed by a comma, which the blank form carries itself.
  const end = src[close + 1] === "," ? close + 2 : close + 1;
  src = src.slice(0, start) + BLANK + src.slice(end);
  cursor = start + BLANK.length;
  count++;
}

if (count === 0) {
  console.log("no activity sections found — nothing to empty");
} else {
  writeFileSync(FILE, src, "utf8");
  console.log(`emptied ${count} activities`);
}
