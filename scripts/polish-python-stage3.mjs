import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
const log = [];
function rep(oldS, newS, label) {
  if (!t.includes(oldS)) { log.push("MISS " + label); return; }
  t = t.split(oldS).join(newS);
  log.push("OK " + label);
}

// --- s6: fill 4 empty solution bodies (keep code, add guidance) ---
rep('"Activity 1: Solution",\n  "",',
    '"Activity 1: Solution",\n  "Compare your prediction with the running code below. Age 14 prints nothing (14 >= 16 is False), age 20 prints the ID line.",',
    "s6 act1 sol body");
rep('"Activity 2: Solution",\n  "",',
    '"Activity 2: Solution",\n  "Compare your prediction below. late = True prints the first line only, because not(late) is False.",',
    "s6 act2 sol body");
rep('"Activity 3: Solution — 4 separate if",\n  "",',
    '"Activity 3: Solution — 4 separate if",\n  "Compare your calculator below. Each if is checked independently — try +, -, *, / and watch which single line prints.",',
    "s6 act3 sol body");
rep('"Activity 4: Solution",\n  "",',
    '"Activity 4: Solution",\n  "Compare your entry check below. Only yes + yes opens the session, because and needs both sides to be True.",',
    "s6 act4 sol body");

// --- s3: expand thin bodies, keep images + her examples ---
rep('"The same operators you know from blocks:\\n"',
    '"The same operators you know from blocks. In blocks you snap an operator piece (for example 20 + 10); in Python you type the same symbols. Look at the picture, then find each symbol in the table of the next step."',
    "s3 blocks body");
rep('"Math operators work on numbers, and the result is also a number:\\n"',
    '"Math operators work on numbers, and the result is also a number. Try each line: + adds, - subtracts, * multiplies, / divides, % gives the remainder. Predict the answer before you run."',
    "s3 math table body");
rep('"Comparing operators compare two values, and the result is a Boolean (True or False):\\n"',
    '"Comparing operators compare two values, and the result is always True or False. < means smaller, > means bigger, == means exactly equal. Predict each line before you run."',
    "s3 compare body");

// --- s1: roadmap + program definition polish (professional, kid hook) ---
rep('"Our roadmap for today, same order as the slides:\\n1. Quick Review: What Is a Program?\\n2. Text Programming Languages\\n• Blocks vs. Text\\n• Many languages + syntax\\n3. Interpreters & Compilers\\n4. Online GDB Editor & VS Code"',
    '"Our roadmap today:\\n1. What is a program? (recipe thinking)\\n2. Blocks vs. text code (the Tomato game)\\n3. Languages and syntax (spelling matters)\\n4. How Python reaches the machine (translator)\\n5. Your first run in Online GDB and VS Code"',
    "s1 roadmap");
rep('"Many Languages Exist: C++, Python, Java, JavaScript.\\nEach language has syntax — strict spelling and symbols. "',
    '"Many languages exist: C++, Python, Java, JavaScript.\\nEach language has syntax — strict spelling and symbols, just like grammar. One missing quote or colon and Python stops to tell you."',
    "s1 languages");

// --- image placeholders: add visual briefs where a diagram would help (no broken links) ---
// s9 for-loop flow (after range forms)
rep('"The three forms of range()"',
    '"The three forms of range() — picture the counter"',
    "s9 range title tweak");
rep('"Trace the output", "Before running a loop, write down the value of the counter on every iteration. This makes the start, stop, and step visible."',
    '"Trace the output", "Before running a loop, write down the value of the counter on every iteration. This makes the start, stop, and step visible.\\n\\n🖼️ [IMAGE PLACEHOLDER: for-loop counter diagram showing start, stop, step — ارفعي الصورة هنا]"',
    "s9 trace placeholder");
// s12 while flow
rep('"Understand the infinite loop", "while True never becomes False by itself. It needs a break or a changing condition, otherwise it keeps running forever."',
    '"Understand the infinite loop", "while True never becomes False by itself. It needs a break or a changing condition, otherwise it keeps running forever.\\n\\n🖼️ [IMAGE PLACEHOLDER: while-loop flowchart (condition diamond, body arrow back) — ارفعي الصورة هنا]"',
    "s12 while placeholder");
// lists visual
rep('"Print a list", "Print the whole list by using its name inside print()."',
    '"Print a list", "Print the whole list by using its name inside print().\\n\\n🖼️ [IMAGE PLACEHOLDER: list as labeled boxes with indexes 0, 1, 2 — ارفعي الصورة هنا]"',
    "p6a list placeholder");
// functions visual
rep('"Function with return", "A function with return gives a value back so the program can use it directly or save it in a variable."',
    '"Function with return", "A function with return gives a value back so the program can use it directly or save it in a variable.\\n\\n🖼️ [IMAGE PLACEHOLDER: function machine diagram (parameters in, return out) — ارفعي الصورة هنا]"',
    "p6b func placeholder");

fs.writeFileSync(path, t);
console.log(log.join("\n"));
