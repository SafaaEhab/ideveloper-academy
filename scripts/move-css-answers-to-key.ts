/**
 * One-off codemod: move the CSS homework answers out of the lesson data.
 *
 * The student is shown the finished page, never the code that finishes it, so
 * each CSS session now carries a `homeworkPreviewCode` target document instead
 * of a `homeworkSolutionCode` runner. The answer itself is not thrown away: it
 * moves to `cssAnswerKey.ts`, which no component imports, and which exists for
 * the trainer who has to mark the work.
 *
 *   npx tsx scripts/move-css-answers-to-key.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "client/src/data/webCurriculum.ts";
const KEY = "client/src/data/cssAnswerKey.ts";

const src = readFileSync(FILE, "utf8");
const first = src.indexOf('    id: "css-1",');
const last = src.indexOf('    id: "js-1",');
if (first < 0 || last < 0) throw new Error("CSS block not found");

const entries: [string, string][] = [];
let out = src.slice(0, first);
let rest = src.slice(first, last);

for (let i = 1; i <= 8; i++) {
  const lesson = `css-${i}`;
  const nextLesson = `css-${i + 1}`;
  const at = rest.indexOf(`homeworkSolutionCode: \``);
  if (at < 0) throw new Error(`no answer found for ${lesson}`);
  const open = at + "homeworkSolutionCode: `".length;
  const close = rest.indexOf("`,", open);
  if (close < 0) throw new Error(`unterminated answer for ${lesson}`);
  entries.push([lesson, rest.slice(open, close)]);

  const sessionStart = rest.indexOf(`id: "${lesson}"`);
  const sessionEnd = i < 8 ? rest.indexOf(`id: "${nextLesson}"`) : rest.length;
  if (sessionStart < 0 || sessionEnd < sessionStart)
    throw new Error(`session bounds for ${lesson}`);
  if (at < sessionStart || at > sessionEnd)
    throw new Error(`answer for ${lesson} sits outside its session`);

  rest =
    rest.slice(0, at) +
    `homeworkPreviewCode: homeworkPreviews["${lesson}"],` +
    rest.slice(close + 2);
}

writeFileSync(FILE, out + rest + src.slice(last), "utf8");

const body = entries
  .map(
    ([lesson, answer]) => `  "${lesson}": \`${answer.replace(/`/g, "\\`")}\`,`
  )
  .join("\n\n");

writeFileSync(
  KEY,
  `/**
 * The CSS homework answers, for the trainer only.
 *
 * A session shows the student the finished page and never the code that builds
 * it - a student who can read the answer writes no CSS at all. So the answer
 * lives here instead of in the lesson data, and no component imports this file.
 *
 * Each entry is the whole of \`style.css\` as it stands once that session's
 * homework is done: the layers of the earlier sessions, plus the new one.
 */

export const CSS_HOMEWORK_ANSWERS: Record<string, string> = {
${body}
};
`,
  "utf8"
);

console.log(`moved ${entries.length} answers to ${KEY}`);
