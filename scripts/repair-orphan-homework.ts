/**
 * Repair `htmlCurriculum.ts` after the homework strip.
 *
 * A lesson object is laid out as `sections: [...]` then the homework fields
 * then `quiz: [...]`, so the only thing that can ever sit between the end of
 * `sections` and the start of `quiz` is a stripped homework field and its value.
 * Deleting exactly that gap — found by walking back from each `quiz` to the
 * nearest lesson-level `],` — removes the orphans and nothing else.
 *
 * Idempotent: a lesson with no gap is reported and left alone.
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const path = process.argv.slice(2).find(arg => !arg.startsWith("--"));
if (!path) throw new Error("usage: repair-orphan-homework <file> [--apply]");
const lines = readFileSync(path, "utf8").split("\n");
const drop = new Set<number>();

for (let i = 0; i < lines.length; i++) {
  if (lines[i] !== "    quiz: [") continue;

  let close = i - 1;
  while (close >= 0 && lines[close] !== "    ],") close--;
  if (close < 0) throw new Error(`no sections close before quiz at ${i + 1}`);

  const gap = lines.slice(close + 1, i);
  if (gap.length === 0) continue;

  console.log(
    `quiz L${i + 1}: removing ${gap.length} orphan line(s), first = ${JSON.stringify(
      gap[0].slice(0, 60)
    )}`
  );
  for (let k = close + 1; k < i; k++) drop.add(k);
}

console.log(`\n${drop.size} line(s) to remove`);

if (APPLY && drop.size > 0) {
  writeFileSync(
    path,
    lines.filter((_, index) => !drop.has(index)).join("\n"),
    "utf8"
  );
}