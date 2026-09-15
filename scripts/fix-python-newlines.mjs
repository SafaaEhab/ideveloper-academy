import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
const source = fs.readFileSync(path, "utf8");
const fixed = source.replaceAll("\\\\n", "\\n");
fs.writeFileSync(path, fixed);
console.log(`Replaced escaped Python newlines: ${source.length - fixed.length} characters removed`);
