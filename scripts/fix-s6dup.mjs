import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
// Fix s6 duplicate: first -> blocks, second -> python (3)
let n = 0;
t = t.replace('"2 — If conditions: program takes decisions",\r\n  "Program takes different decisions according to different conditions using if block.',
  '"2 — If in blocks: the same decision idea",\r\n  "Program takes different decisions according to different conditions using if block.');
t = t.replace('"2 — If conditions: program takes decisions",\r\n  "Program takes different decisions according to different conditions using if and : then the indented code.',
  '"3 — If in Python: condition, colon, indented code",\r\n  "Program takes different decisions according to different conditions using if and : then the indented code.');
fs.writeFileSync(path, t);
console.log("s6 dup fixed");
// verify
const start = t.indexOf('id: "s6"');
const end = t.indexOf('id: "s7"');
const block = t.slice(start, end);
for (const m of block.matchAll(/"(\d+ —[^"]{0,60})/g)) console.log(m[1]);
