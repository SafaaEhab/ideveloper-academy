// @ts-check
/**
 * Cloudinary public IDs on this account are the bare filename — no folders — so
 * a filename is a global name. Two files with the same name cannot both go up.
 *
 * This checks the batch about to be uploaded twice over: against the names
 * already on the account, and against each other. The second check is the one
 * that bites: `session11/1.png` and `session12/1.png` are different pictures
 * that would both want to be called `1.png`.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { allWebLessons } from "../client/src/data/webCurriculum";
import { allHtmlLessons } from "../client/src/data/htmlCurriculum";
import { allCssLessons } from "../client/src/data/cssCurriculum";
import { allPythonLessons } from "../client/src/data/pythonCurriculum";
import { allScratchLessons } from "../client/src/data/scratchCurriculum";
import { PYTHON_LOGO, SCRATCH_LOGO } from "../client/src/components/LessonArt";

const ROOT = "client/public";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push("/" + relative(ROOT, full).replace(/\\/g, "/"));
  }
  return out;
}

const referenced = new Set([
  PYTHON_LOGO,
  SCRATCH_LOGO,
  ...[
    allWebLessons,
    allHtmlLessons,
    allCssLessons,
    allPythonLessons,
    allScratchLessons,
  ].flatMap(lessons =>
    lessons.flatMap(lesson => [
      lesson.heroImage ?? "",
      ...lesson.sections.flatMap(section => section.images ?? []),
      ...lesson.quiz.flatMap(question => [
        ...(question.questionImages ?? []),
        ...(question.optionImages ?? []).flat().filter(Boolean),
      ]),
    ])
  ),
]);

const toUpload = walk(join(ROOT, "curriculum"))
  .filter(path => referenced.has(path))
  .sort();

/** Names already spoken for on the account, gathered from the other three tracks. */
const taken = new Set();
for (const lessons of [
  allHtmlLessons,
  allPythonLessons,
  allScratchLessons,
]) {
  for (const lesson of lessons) {
    for (const src of [
      lesson.heroImage ?? "",
      ...lesson.sections.flatMap(section => section.images ?? []),
      ...lesson.quiz.flatMap(question => [
        ...(question.questionImages ?? []),
        ...(question.optionImages ?? []).flat().filter(Boolean),
      ]),
    ]) {
      if (src?.startsWith("http")) taken.add(src.split("/").pop()!);
    }
  }
}

const clashWithCloud = toUpload.filter(path => taken.has(path.split("/").pop()!));

const byName = new Map();
for (const path of toUpload) {
  const name = path.split("/").pop()!;
  byName.set(name, [...(byName.get(name) ?? []), path]);
}
const clashWithinBatch = [...byName].filter(([, paths]) => paths.length > 1);

console.log(`${toUpload.length} pictures to upload\n`);

console.log(`── name already taken on the account (${clashWithCloud.length}) ──`);
for (const path of clashWithCloud) console.log("  " + path + "  -> " + path.split("/").pop());

console.log(`\n── two files wanting the same name (${clashWithinBatch.length}) ──`);
for (const [name, paths] of clashWithinBatch) {
  console.log(`  ${name}`);
  for (const path of paths) console.log("      " + path);
}

const blocked = new Set([...clashWithCloud, ...clashWithinBatch.flatMap(([, p]) => p)]);
const free = toUpload.filter(path => !blocked.has(path));

console.log(`\n── safe to upload as-is (${free.length}) ──`);
console.log("  " + free.map(p => p.split("/").pop()).join("\n  "));

console.log(`\n── total: ${(toUpload.reduce((n, p) => n + statSync(join(ROOT, p.slice(1))).size, 0) / 1e6).toFixed(2)} MB ──`);
