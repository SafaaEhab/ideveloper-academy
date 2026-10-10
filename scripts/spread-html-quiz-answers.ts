/**
 * One-off codemod: make every HTML session's four quiz answers occupy four
 * different option positions, so no position can be guessed.
 *
 * It reorders the `options` array of each `q(...)` call and rewrites the
 * `answer` index to match, then leaves prettier to re-wrap the file.
 *
 *   npx tsx scripts/spread-html-quiz-answers.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE =
  "C:/Users/safaa/OneDrive/Desktop/Wbsite iDeveloper/client/src/data/htmlCurriculum.ts";

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

let src = readFileSync(FILE, "utf8");

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

for (let m = CALL.exec(src); m; m = CALL.exec(src)) {
  // Walk forward to the `),` that closes this q( call.
  const bodyStart = m.index + m[0].length;
  const close = src.indexOf("\n      ),", bodyStart);
  if (close === -1) throw new Error(`unterminated q( at ${m.index}`);
  queue.push({
    start: m.index,
    end: close + "\n      ),".length,
    block: src.slice(bodyStart, close),
  });
}

// Walk the questions session by session. A session boundary is a line that
// starts a new lesson object.
const sessionStarts = [...src.matchAll(/\n {4}id: "html-(\d+)"/g)].map(m => ({
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
  out += src.slice(cursor, item.start) + `      q(\n${newBlock}\n      ),`;
  cursor = item.end;
  rewritten++;
  changes.push(
    `  html-${sessionNumber} q${qi + 1}: answer ${answer} -> ${target}`
  );
}
out += src.slice(cursor);
writeFileSync(FILE, out, "utf8");

console.log(`rewrote ${rewritten} of ${queue.length} questions`);
changes.slice(0, 8).forEach(c => console.log(c));
if (changes.length > 8) console.log(`  ... and ${changes.length - 8} more`);
