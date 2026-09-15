import fs from "node:fs";
const source = fs.readFileSync("client/src/data/pythonCurriculum.ts", "utf8");
const body = source
  .replace(/pythonCurriculum/g, "scratchCurriculum")
  .replace(/allPythonLessons/g, "allScratchLessons")
  .replace(/coreLessonsWithStudio/g, "coreScratchLessonsWithStudio")
  .replace(/problemSolvingLessonsWithStudio/g, "problemSolvingScratchLessonsWithStudio")
  .replace(/Python/g, "Scratch")
  .replace(/python/gi, "scratch")
  .replace(/أساسيات Scratch/g, "أساسيات سكراتش")
  .replace(/منهج Scratch/g, "منهج سكراتش")
  .replace(/Scratch starts list indexes at zero/g, "تبدأ سكراتش فهارس القوائم من الصفر")
  .replace(/Scratch/g, "Scratch");
fs.writeFileSync("client/src/data/scratchCurriculum.ts", `// Scratch curriculum mirrors the complete Python learning journey as requested.\n${body}`);
