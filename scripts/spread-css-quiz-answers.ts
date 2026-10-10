/**
 * One-off codemod: spread the correct answer of every CSS quiz question across
 * all four positions, so no position can be guessed.
 *
 * It reorders the `options` array of each `q(...)` call in the CSS block of
 * `webCurriculum.ts` and rewrites the `answer` index to match. The JavaScript
 * questions and the HTML track are not touched.
 *
 *   npx tsx scripts/spread-css-quiz-answers.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "client/src/data/webCurriculum.ts";

/** Twelve different orders, so neighbouring sessions never look alike. */
const TARGETS: number[][] = [
  [0, 1, 2, 3],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
  [1, 3, 2, 0],
  [2, 0, 3, 1],
  [0, 3, 1, 2],
  [3, 1, 0, 2],
  [1, 0, 2, 3],
  [2, 1, 3, 0],
  [0, 2, 1, 3],
  [1, 2, 0, 3],
  [3, 2, 1, 0],
];

/** Reads a bracketed literal starting at `open`, returning the inner text. */
function readBracketed(
  src: string,
  open: number
): { inner: string; end: number } {
  if (src[open] !== "[") throw new Error(`expected [ at ${open}`);
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return { inner: src.slice(open + 1, i), end: i };
    }
  }
  throw new Error(`unbalanced [ from ${open}`);
}

/** Splits a comma-separated list, ignoring commas inside string literals. */
function splitTop(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "[" || ch === "{" || ch === "(") depth++;
    else if (ch === "]" || ch === "}" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = inner.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

const src = readFileSync(FILE, "utf8");

// The CSS block runs from the first css lesson to the first JavaScript one.
const firstId = src.indexOf('    id: "css-1",');
const blockStart = src.lastIndexOf("\n", firstId) + 1;
const blockEnd = src.indexOf('    id: "js-1",');
if (firstId < 0 || blockEnd < 0) throw new Error("CSS block not found");
const block = src.slice(blockStart, blockEnd);

// Every quiz question is written at this exact indentation, which is what makes
// the block boundaries unambiguous.
const CALL = /\n {6}q\(\n/g;

let session = 0;
let question = 0;
let rewritten = 0;
const changes: string[] = [];

let cursor = 0;
let out = "";
const queue: { start: number; end: number; block: string }[] = [];

for (let m = CALL.exec(block); m; m = CALL.exec(block)) {
  const bodyStart = m.index + m[0].length;
  const close = block.indexOf("\n      ),", bodyStart);
  if (close === -1) throw new Error(`unterminated q( at ${m.index}`);
  queue.push({
    start: m.index,
    end: close + "\n      ),".length,
    block: block.slice(bodyStart, close),
  });
}

// Walk the questions session by session. A session boundary is a line that
// starts a new lesson object.
const sessionStarts = [...block.matchAll(/^ {4}id: "css-(\d+)"/gm)].map(m => ({
  at: m.index,
  number: m[1],
}));
const sessionOf = (index: number) => {
  let lo = 0;
  let hi = sessionStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sessionStarts[mid].at <= index) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi;
};

const perSession = new Map<number, number>();
let currentSession = -1;

for (const item of queue) {
  const sid = sessionOf(item.start);
  const sessionNumber = sessionStarts[sid].number;
  if (sid !== currentSession) {
    currentSession = sid;
    perSession.set(sid, 0);
  }
  const qi = perSession.get(sid)!;
  perSession.set(sid, qi + 1);
  const target = TARGETS[sid % TARGETS.length][qi % 4];

  // Split the block into its four arguments.
  const args: string[] = [];
  {
    let depth = 0;
    let quote: string | null = null;
    let start = 0;
    for (let i = 0; i < item.block.length; i++) {
      const ch = item.block[i];
      if (quote) {
        if (ch === "\\") i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === "," && depth === 0) {
        args.push(item.block.slice(start, i).trim());
        start = i + 1;
      }
    }
    args.push(item.block.slice(start).trim());
  }

  const bracketAt = item.block.indexOf("[");
  const { inner } = readBracketed(item.block, bracketAt);
  const options = splitTop(inner);
  if (options.length !== 4)
    throw new Error(`expected 4 options, got ${options.length}`);
  // args = [question, options, answer, explanation]
  const answer = Number(args[2]);
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
    throw new Error(`bad answer index ${args[2]}`);
  }
  if (answer === target) continue;

  const reordered = [...options];
  const [moved] = reordered.splice(answer, 1);
  reordered.splice(target, 0, moved);

  const newBlock = `${args[0]},\n        [${reordered.join(", ")}],\n        ${target},\n        ${args[3]}`;
  out += block.slice(cursor, item.start) + `      q(\n${newBlock}\n      ),`;
  cursor = item.end;
  rewritten++;
  changes.push(
    `  css-${sessionNumber} q${qi + 1}: answer ${answer} -> ${target}`
  );
}
out += block.slice(cursor);

writeFileSync(
  FILE,
  src.slice(0, blockStart) + out + src.slice(blockEnd),
  "utf8"
);

console.log(`rewrote ${rewritten} of ${queue.length} questions`);
changes.slice(0, 8).forEach(c => console.log(c));
if (changes.length > 8) console.log(`  ... and ${changes.length - 8} more`);
