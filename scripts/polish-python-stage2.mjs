import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
let fixes = [];

// A1. s2: second "7 — Data Types" -> "8 —", then shift following numbers +1
// s2 sections order currently: 1..7,7,8,9,10,11,12,13,14,15,16,17 (18 sections)
// We want: 1..7,8,9,10,11,12,13,14,15,16,17,18
function fixS2() {
  const start = t.indexOf('id: "s2"');
  const end = t.indexOf('id: "s3"');
  let block = t.slice(start, end);
  const order = [
    '"7 — Data Types: 4 boxes"',
    '"8 — String, Integer, Float, Boolean + Warning"',
    '"9 — Variable Names DOs',
    '"10 — Activity 2: fix the forbidden names"',
    '"11 — Activity 2: Solution"',
    '"12 — Activity 3: overwrite"',
    '"13 — Activity 3: Solution"',
    '"14 — Activity 4: capitals matter"',
    '"15 — Activity 4: Solution"',
    '"16 — Activity 5: Sara\'s variables"',
    '"17 — Activity 5: Solution"',
  ];
  const repl = [
    '"8 — Data Types: 4 boxes"',
    '"9 — String, Integer, Float, Boolean + Warning"',
    '"10 — Variable Names DOs',
    '"11 — Activity 2: fix the forbidden names"',
    '"12 — Activity 2: Solution"',
    '"13 — Activity 3: overwrite"',
    '"14 — Activity 3: Solution"',
    '"15 — Activity 4: capitals matter"',
    '"16 — Activity 4: Solution"',
    '"17 — Activity 5: Sara\'s variables"',
    '"18 — Activity 5: Solution"',
  ];
  for (let i = 0; i < order.length; i++) {
    if (!block.includes(order[i].slice(0, 20))) { fixes.push("s2 MISS " + order[i]); continue; }
    block = block.split(order[i]).join(repl[i]);
  }
  t = t.slice(0, start) + block + t.slice(end);
  fixes.push("s2 renumbered 7dup -> 8..18");
}
fixS2();

// A2. s4 tail: 16,17,18,19,20,27,28,29 -> 26..33
function fixS4() {
  const start = t.indexOf('id: "s4"');
  const end = t.indexOf('id: "s5"');
  let block = t.slice(start, end);
  const pairs = [
    ['"16 — User Input in everyday programs"', '"26 — User Input in everyday programs"'],
    ['"17 — User Input: ATM thinking"', '"27 — User Input: ATM thinking"'],
    ['"18 — User Input in Python: use input!"', '"28 — User Input in Python: use input!"'],
    ['"19 — Store the input or it is lost"', '"29 — Store the input or it is lost"'],
    ['"20 — Activity 6: the problem"', '"30 — Activity 6: the problem"'],
    ['"27 — Activity 6: the solution with casting"', '"31 — Activity 6: the solution with casting"'],
    ['"28 — Activity 6: Solution"', '"32 — Activity 6: Solution"'],
    ['"29 — Home Work: square perimeter"', '"33 — Home Work: square perimeter"'],
  ];
  for (const [a, b] of pairs) {
    if (!block.includes(a)) { fixes.push("s4 MISS " + a); continue; }
    block = block.split(a).join(b);
  }
  t = t.slice(0, start) + block + t.slice(end);
  fixes.push("s4 tail renumbered 26..33");
}
fixS4();

// A3. s6: duplicate "2 — If conditions" -> second becomes "3 — If in Python", shift rest
function fixS6() {
  const start = t.indexOf('id: "s6"');
  const end = t.indexOf('id: "s7"');
  let block = t.slice(start, end);
  // second occurrence only: replace the Python-version one (has touching_gobo code nearby)
  const secondOld = '"2 — If conditions: program takes decisions",\n  "Program takes different decisions according to different conditions using if and : then the indented code."';
  const secondNew = '"3 — If in Python: condition, colon, indented code",\n  "Program takes different decisions according to different conditions using if and : then the indented code."';
  if (block.includes(secondOld)) { block = block.replace(secondOld, secondNew); fixes.push("s6 second 2->3"); }
  else fixes.push("s6 MISS second-2");
  const shifts = [
    ['"3 — If syntax: True or False"', '"4 — If syntax: True or False"'],
    ['"4 — Indentation: inside the if body"', '"5 — Indentation: inside the if body"'],
    ['"5 — Game Over: condition is True"', '"6 — Game Over: condition is True"'],
    ['"6 — Outside the body + condition is False"', '"7 — Outside the body + condition is False"'],
    ['"7 — If..elif: stop at the first True"', '"8 — If..elif: stop at the first True"'],
    ['"8 — Wrong operator % ends silently"', '"9 — Wrong operator % ends silently"'],
    ['"9 — If...elif...else: Invalid Operator!"', '"10 — If...elif...else: Invalid Operator!"'],
  ];
  for (const [a, b] of shifts) {
    if (!block.includes(a)) { fixes.push("s6 MISS " + a); continue; }
    block = block.split(a).join(b);
  }
  // first "2 —" gets clearer title (blocks version)
  block = block.replace('"2 — If conditions: program takes decisions",\n  "Program takes different decisions according to different conditions using if block.',
    '"2 — If in blocks: the same decision idea",\n  "Program takes different decisions according to different conditions using if block.');
  t = t.slice(0, start) + block + t.slice(end);
  fixes.push("s6 numbering fixed");
}
fixS6();

// B. roadmap wording
const roadmapCount = (t.match(/Our roadmap from the slides/g) || []).length;
t = t.split("Our roadmap from the slides").join("Our roadmap today");
fixes.push("roadmap slides refs replaced: " + roadmapCount);

// C. code indentation: single-space indented prints -> 4 spaces (professional Python)
let indentFixes = 0;
t = t.replace(/\\n print\(/g, () => { indentFixes++; return "\\n    print("; });
fixes.push("print indent fixed: " + indentFixes);

fs.writeFileSync(path, t);
console.log(fixes.join("\n"));
