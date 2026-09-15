import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
const log = [];
function repAll(oldS, newS, label) {
  const n = t.split(oldS).length - 1;
  if (!n) { log.push("MISS " + label); return; }
  t = t.split(oldS).join(newS);
  log.push("OK " + label + " x" + n);
}
const N = "\\n";
const ISNT = "It isn\\'t a Zero!";
const DONT = "Don\\'t print this number";
// welcome-zero (question + solution bodies share same code)
repAll(
  "while True:" + N + "    print(\"Welcome!\")" + N + " number = int(input(\"Enter a number\"))" + N + " if number == 0:" + N + "    print(\"It is a Zero!\")" + N + " else:" + N + "    print(\"" + ISNT + "\")",
  "while True:" + N + "    print(\"Welcome!\")" + N + "    number = int(input(\"Enter a number\"))" + N + "    if number == 0:" + N + "        print(\"It is a Zero!\")" + N + "    else:" + N + "        print(\"" + ISNT + "\")",
  "p5a welcome-zero");
// continue demo, both loops
repAll(
  "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"" + DONT + "\")" + N + " continue" + N + "    print(number)" + N + N + "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"" + DONT + "\")" + N + "    print(number)",
  "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"" + DONT + "\")" + N + "        continue" + N + "    print(number)" + N + N + "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"" + DONT + "\")" + N + "    print(number)",
  "p5a continue-both");
// continue demo, single loop (solution section)
repAll(
  "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"" + DONT + "\")" + N + " continue" + N + "    print(number)",
  "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"" + DONT + "\")" + N + "        continue" + N + "    print(number)",
  "p5a continue-single");
fs.writeFileSync(path, t);
console.log(log.join("\n"));
