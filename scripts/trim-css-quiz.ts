/**
 * One-off codemod: drop one question from a CSS session, so every session ships
 * four questions and the correct answer never lands in the same position twice
 * inside a session — the same rule the HTML track is held to.
 *
 *   npx tsx scripts/trim-css-quiz.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "client/src/data/webCurriculum.ts";

/** The question to remove from each session, by its exact opening line. */
const DROP = [
  "What is the one big advantage of the external stylesheet?",
  "Which value makes a heading extra heavy?",
  "Two rules have the same specificity. Which one is used?",
  "Which property rounds the corners of a border?",
  "How is a gradient written?",
  "Which justify-content value pins the first and last item to the edges?",
  "Which two languages build this page?",
  "What is the last thing you do before calling a site finished?",
];

const src = readFileSync(FILE, "utf8");
const firstId = src.indexOf('    id: "css-1",');
const blockEnd = src.indexOf('    id: "js-1",');
if (firstId < 0 || blockEnd < 0) throw new Error("CSS block not found");

let block = src.slice(firstId, blockEnd);
const removed: string[] = [];

for (const question of DROP) {
  const needle = `        "${question}",`;
  const at = block.indexOf(needle);
  if (at < 0) throw new Error(`question not found: ${question}`);
  // Walk back to the `q(` that opens this question, and forward past the `),`.
  const open = block.lastIndexOf("      q(\n", at);
  const close = block.indexOf("\n      ),", at);
  if (open < 0 || close < 0) throw new Error(`unbalanced q( for: ${question}`);
  block = block.slice(0, open) + block.slice(close + "\n      ),".length + 1);
  removed.push(question);
}

writeFileSync(
  FILE,
  src.slice(0, firstId) + block + src.slice(blockEnd),
  "utf8"
);
console.log(`removed ${removed.length} questions`);
removed.forEach(q => console.log(`  - ${q}`));
