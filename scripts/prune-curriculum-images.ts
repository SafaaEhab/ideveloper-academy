// @ts-check
/**
 * Deletes the curriculum pictures no session points at, and nothing else.
 *
 * The rule is deliberately narrow. A file is only a candidate if it is inside
 * `client/public/curriculum/` and no course references it by path — because a
 * picture is the one thing in this repository that is expensive to lose, and a
 * filename is not proof on its own: the Python and Scratch tracks keep their
 * covers in components rather than in their lesson data.
 *
 * Everything it removes is tracked by git, so `git checkout client/public` puts
 * it all back.
 *
 *   tsx scripts/prune-curriculum-images.ts --dry-run   list what would go
 *   tsx scripts/prune-curriculum-images.ts --apply     remove it
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { allWebLessons } from "../client/src/data/webCurriculum";
import { allHtmlLessons } from "../client/src/data/htmlCurriculum";
import { allCssLessons } from "../client/src/data/cssCurriculum";
import { allPythonLessons } from "../client/src/data/pythonCurriculum";
import { allScratchLessons } from "../client/src/data/scratchCurriculum";
import { PYTHON_LOGO, SCRATCH_LOGO } from "../client/src/components/LessonArt";

const ROOT = "client/public";
const APPLY = process.argv.includes("--apply");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push("/" + relative(ROOT, full).replace(/\\/g, "/"));
  }
  return out;
}

/** Every public path any course or component points at. */
const referenced = new Set();
for (const lessons of [
  allWebLessons,
  allHtmlLessons,
  allCssLessons,
  allPythonLessons,
  allScratchLessons,
]) {
  for (const lesson of lessons) {
    for (const section of lesson.sections) {
      for (const src of [
        ...(section.images ?? []),
        ...(section.videos ?? []),
        lesson.heroImage ?? "",
      ]) {
        if (src && !src.startsWith("http")) referenced.add(src);
      }
      for (const key of [
        "homeworkStarterCode",
        "homeworkSolutionCode",
        "homeworkPreviewCode",
      ]) {
        for (const match of (section[key] ?? "").matchAll(/(["'`])\/curriculum\/[^"'`]+/g)) {
          referenced.add(match[0].slice(1));
        }
      }
    }
    for (const question of lesson.quiz) {
      for (const src of [
        ...(question.questionImages ?? []),
        ...(question.optionImages ?? []).flat().filter(Boolean),
      ]) {
        if (src && !src.startsWith("http")) referenced.add(src);
      }
    }
  }
}
// The two course covers live in a component, not in the lesson data.
referenced.add(PYTHON_LOGO);
referenced.add(SCRATCH_LOGO);

const onDisk = walk(join(ROOT, "curriculum")).sort();
const unused = onDisk.filter(path => !referenced.has(path));

const kb = path => (statSync(join(ROOT, path.slice(1))).size / 1024).toFixed(0);
const byFolder = {};
for (const path of unused) {
  const folder = path.split("/").slice(0, 3).join("/");
  byFolder[folder] = (byFolder[folder] ?? 0) + 1;
}

console.log(`${unused.length} of ${onDisk.length} files are referenced by nothing`);
for (const [folder, count] of Object.entries(byFolder).sort())
  console.log(`  ${folder.padEnd(30)} ${String(count).padStart(3)} files`);

/** Folders left with nothing in them are removed too; an empty folder is noise. */
const emptied = [];
for (const folder of Object.keys(byFolder)) {
  const dir = join(ROOT, folder.slice(1));
  if (existsSync(dir) && readdirSync(dir).length === 0) emptied.push(dir);
}

if (!APPLY) {
  console.log("\ndry run — nothing was deleted. Add --apply to remove them.");
  console.log(`  would remove ${unused.length} files and ${emptied.length} empty folder(s)`);
  process.exit(0);
}

/**
 * Checked before anything is removed, not after.
 *
 * A post-hoc check only tells you what a delete already cost you, and on a
 * one-way filesystem that is the worst possible time to find out. If a file the
 * courses point at is not on disk right now, this run stops without touching
 * anything — the missing picture is a separate problem and must not be mixed up
 * with a clean-up.
 */
const alreadyMissing = [...referenced]
  .filter(path => path.startsWith("/curriculum/") && !onDisk.includes(path))
  .sort();
if (alreadyMissing.length > 0) {
  console.error("\nstopping: these are referenced but not on disk, so this is not a clean-up");
  for (const path of alreadyMissing) console.error("  " + path);
  process.exit(1);
}

const freedKb = unused.reduce((n, path) => n + Number(kb(path)), 0);

for (const path of unused) rmSync(join(ROOT, path.slice(1)));
for (const dir of emptied) rmSync(dir, { recursive: true });

console.log(
  `\nremoved ${unused.length} files (${(freedKb / 1024).toFixed(1)} MB) and ${emptied.length} empty folder(s)`
);
console.log(`${onDisk.length - unused.length} pictures kept`);

// And the state it left behind is the state the code expects.
const left = walk(join(ROOT, "curriculum"));
const nowMissing = [...referenced].filter(
  path => path.startsWith("/curriculum/") && !left.includes(path)
);
if (nowMissing.length > 0) {
  console.error("\nREFERENCED BUT NOW GONE — restore these:");
  for (const path of nowMissing) console.error("  " + path);
  process.exit(1);
}
console.log("every referenced picture is still on disk");
