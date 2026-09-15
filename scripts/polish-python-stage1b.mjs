// Stage 1b: fix remaining duplicate titles + remove slide refs
import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
let count = 0;
function repRe(regex, newS, label) {
  const before = t.length;
  t = t.replace(regex, newS);
  if (t.length !== before || regex.test("x") === false) { console.log("OK:", label); count++; }
  else console.log("CHECK:", label);
}
// titles with subtitle context, tolerant to \r\n
repRe(/title: "Learning Python: Problem Solving",\r?\n(\s*)subtitle: "Difference, circle area, digits, summation, and rounding"/,
  'title: "Math Problem Solving: Formulas in Action",\n$1subtitle: "Difference, circle area, digits, summation, and rounding"', "s5");
repRe(/title: "Learning Python: Problem Solving",\r?\n(\s*)subtitle: "Conditions, multiples, min\/max, brothers, and letters"/,
  'title: "Decision Problem Solving: Yes or No, Min and Max",\n$1subtitle: "Conditions, multiples, min/max, brothers, and letters"', "s7");
repRe(/title: "Learning Python: Problem Solving",\r?\n(\s*)subtitle: "1 to N, even numbers, max, tables, and factorials"/,
  'title: "Loop Problem Solving: Numbers, Tables and Factorials",\n$1subtitle: "1 to N, even numbers, max, tables, and factorials"', "s10");
repRe(/title: "Learning Python: Problem Solving",\r?\n(\s*)subtitle: "Palindrome, divisors, lucky numbers, and shapes"/,
  'title: "Patterns and Numbers: Divisors, Lucky Numbers and Shapes",\n$1subtitle: "Palindrome, divisors, lucky numbers, and shapes"', "s11");
repRe(/title: "Learning Python: Problem Solving",\r?\n(\s*)subtitle: "Sequence and sum, pyramid, digit sums, PUM, and diamond"/,
  'title: "Creative Loops: Sequences, Pyramids and the PUM Game",\n$1subtitle: "Sequence and sum, pyramid, digit sums, PUM, and diamond"', "p5b");

// remove remaining "exactly like the Session X slides" + "From the Session X slides" + "JOIN US!"
const slides = t.match(/exactly like the Session \d+ slides?\.?/g);
console.log("slide refs found:", slides ? slides.length : 0, slides ? slides.slice(0,5) : "");
t = t.replace(/ — exactly like the Session \d+ slides?\.?/g, ".");
t = t.replace(/, exactly like the Session \d+ slides?\.?/g, ".");
t = t.replace(/exactly like the Session \d+ slides?\.?/g, "");
t = t.replace(/From the Session \d+ slides: /g, "");
const joinus = (t.match(/JOIN US! ?/g) || []).length;
console.log("JOIN US remaining:", joinus);
t = t.replace(/JOIN US! ?/g, "");

// fix leftover double spaces / " ." issues
t = t.replace(/  +/g, " ");
t = t.replace(/ \./g, ".");

fs.writeFileSync(path, t);
console.log("done, applied", count);
