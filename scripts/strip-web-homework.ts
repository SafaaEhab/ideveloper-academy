/**
 * One-off: strip the homework block out of the Web curriculum.
 *
 * The Web track now ends on its in-class activity, so every `homework*` field
 * goes, and `challenge` — the brief that was printed on the homework card —
 * becomes an empty string to keep the shared lesson type valid.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FIELDS = [
  "homeworkStarterCode",
  "homeworkSolutionCode",
  "homeworkPreviewCode",
  "homeworkTargetFile",
  "homeworkImage",
  "homeworkNoBrief",
  "homeworkOffsite",
];

const APPLY = process.argv.includes("--apply");
const paths = process.argv.slice(2).filter(arg => !arg.startsWith("--"));

/**
 * Where a field's value ends, counting the three ways one is written here:
 * a backtick template, a double-quoted string, or a plain literal.
 *
 * Quotes are counted per line, not per file, and a `//` comment contributes
 * nothing — the strings in this file hold HTML and prose, not escapes.
 */
function valueEnd(lines: string[], start: number): number {
  let backticks = 0;
  let quotes = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].split("//")[0];
    backticks += (line.match(/`/g) ?? []).length;
    quotes += (line.match(/"/g) ?? []).length;
    const closed =
      (backticks % 2 === 0 && line.includes("`")) ||
      (quotes % 2 === 0 && quotes > 0) ||
      backticks === 0 && quotes === 0;
    if (closed) return i;
  }
  throw new Error(`unterminated value starting at line ${start + 1}`);
}

for (const path of paths) {
  const lines = readFileSync(path, "utf8").split("\n");
  const drop = new Set<number>();
  const seen = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const field = /^    ([a-zA-Z]+):/.exec(lines[i])?.[1];
    if (!field) continue;
    const keep = !FIELDS.includes(field) && field !== "challenge";
    if (keep) continue;

    const end = valueEnd(lines, i);
    seen.set(field, (seen.get(field) ?? 0) + 1);
    for (let k = i; k <= end; k++) drop.add(k);
    i = end;
  }

  console.log(`\n${path}`);
  for (const [field, count] of seen) console.log(`  ${field}: ${count}`);
  console.log(`  ${drop.size} line(s) removed`);

  if (APPLY) {
    const kept = lines
      .filter((_, index) => !drop.has(index))
      .map(line => (/^    challenge:/.test(line) ? '    challenge: "",' : line));
    writeFileSync(path, kept.join("\n"), "utf8");
  }
}