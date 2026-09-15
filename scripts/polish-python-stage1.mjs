// Stage 1: professional titles, intros, typo fixes for Python curriculum
// Run: node scripts/polish-python-stage1.mjs
import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
const origLen = t.length;
function rep(oldS, newS) {
  if (!t.includes(oldS)) { console.log("MISS:", oldS.slice(0, 80)); return; }
  t = t.split(oldS).join(newS);
  console.log("OK:", oldS.slice(0, 70).replace(/\n/g, " "));
}

// ---- typos ----
rep("enetr the Range", "Enter the range");
rep("enetr the Number", "Enter the number");
rep("enetr", "Enter");

// ---- titles: make each distinctive, keep her meaning ----
rep('title: "Introduction to Programming Using Python"',
    'title: "How Computers Think: Your First Python Program"');
rep('title: "Learning Python: Variables Edition"',
    'title: "Variables and Data Types: Your Program\'s Memory"');
rep('title: "Learning Python: Operators"',
    'title: "Operators: Math, Comparison and Logic"');
// s5 (first generic Problem Solving) - unique check with subtitle context
rep('id: "s5",\n    number: 5,',
    'id: "s5",\n    number: 5,');
rep('title: "Learning Python: Problem Solving",\n    subtitle: "Difference, circle area, digits, summation, and rounding"',
    'title: "Math Problem Solving: Formulas in Action",\n    subtitle: "Difference, circle area, digits, summation, and rounding"');
rep('title: "Learning Python: If & Conditions"',
    'title: "If Conditions: Teach Your Program to Decide"');
rep('title: "Learning Python: Problem Solving",\n    subtitle: "Conditions, multiples, min/max, brothers, and letters"',
    'title: "Decision Problem Solving: Yes or No, Min and Max",\n    subtitle: "Conditions, multiples, min/max, brothers, and letters"');
rep('title: "Learning Python: Problem Solving",\n    subtitle: "1 to N, even numbers, max, tables, and factorials"',
    'title: "Loop Problem Solving: Numbers, Tables and Factorials",\n    subtitle: "1 to N, even numbers, max, tables, and factorials"');
rep('title: "Learning Python: Problem Solving",\n    subtitle: "Palindrome, divisors, lucky numbers, and shapes"',
    'title: "Patterns and Numbers: Divisors, Lucky Numbers and Shapes",\n    subtitle: "Palindrome, divisors, lucky numbers, and shapes"');
rep('title: "Learning Python: while Loops"',
    'title: "While Loops: Repeat Until It Is Right"');
rep('title: "Learning Python: More about Loops"',
    'title: "Loop Control: if Inside Loops, break and continue"');
rep('title: "Learning Python: Problem Solving",\n    subtitle: "Sequence and sum, pyramid, digit sums, PUM, and diamond"',
    'title: "Creative Loops: Sequences, Pyramids and the PUM Game",\n    subtitle: "Sequence and sum, pyramid, digit sums, PUM, and diamond"');

// ---- intros: professional, kid-friendly 12-18, same thinking, no slide refs ----
rep('"JOIN US! In this session you meet the computer\'s secret language, compare blocks with text code, learn how Python reaches the machine, then run your first program in Online GDB and VS Code — exactly like the Session 1 slides."',
    '"Computers only follow precise steps. In this session you will discover what a program really is, see the same idea in blocks and in Python text code, learn how Python is translated for the machine, then run your first program in Online GDB and VS Code."');
rep('"From the Session 2 slides: master print(), store values in variables like Score and Age, print variables, then pick the right data type — string, integer, float, boolean."',
    '"Programs need memory. You will use print() to show messages and numbers, store scores and names in variables, print those variables, then choose the right data type: string, integer, float or boolean."');
rep('"JOIN US! Operators tell Python how to work with values: math operators calculate, comparing operators compare, and logical operators combine. Follow the PEMDAS order, count the True values, then solve the Rami umbrella and Sara grades activities."',
    '"Operators are the verbs of Python. You will calculate with math operators, compare values to get True or False, combine rules with and / or / not, follow the correct order (PEMDAS), then solve the Rami umbrella and Sara grades challenges."');
rep('"Learning Python: Input & Casting. First check every value with type(), then convert between int, float, str and bool with casting, then collect real answers with input() — input() always returns a string, so cast before math and build the square-perimeter program."',
    '"Programs become useful when they listen. You will check every value with type(), convert between int, float, str and bool, collect real answers with input(), and build a square-perimeter calculator. Remember: input() always returns a string, so convert it before doing math."');
rep('"JOIN US! Learning Python: Problem Solving. Given four numbers print Difference X = (A * B) - (C * D), given R print circle area with pi = 3.141592653, sum last digits with % 10, sum 1 to N, and print floor, ceil and round of A / B — then the winter-sale Home Work."',
    '"Time to use formulas like an engineer. You will read input, apply five rules — Difference, circle area, last-digit sum, 1-to-N sum, and floor / ceil / round — and print each answer in the exact format the problem asks for. Your mission: the winter-sale discount challenge."');
rep('"JOIN US! Learning Python: If & Conditions. The program takes different decisions with if blocks, True runs the indented code and False skips it, 4 separate ifs check everything, elif stops at the first True, else catches',
    '"Good programs make decisions. Your program takes different paths with if blocks: True runs the indented code and False skips it, separate ifs check everything, elif stops at the first True, else catches');
rep('"JOIN US! Learning Python: Problem Solving. Print Yes or No with if/else, check Multiples with %, find minimum and maximum with if/elif/else, detect br',
    '"Decisions in action. You will print Yes or No with if/else, check Multiples with %, find minimum and maximum with if/elif/else, detect br');
rep('"JOIN US! Learning Python: Problem Solving. Given a four-digit number print EVEN or ODD from its first digit, given X and Y print Q1 to Q4 or Origem / ',
    '"Think step by step. Given a four-digit number print EVEN or ODD from its first digit, given X and Y print Q1 to Q4 or Origem / ');
rep('"JOIN US! Learning Python: Loops. Use loops to repeat some steps of the program',
    '"Loops save you from repeating yourself. Use loops to repeat steps of the program');
rep('"JOIN US! Learning Python: Problem Solving. Given N print numbers from 1 to N, print all even numbers or -1, find the maximum of N numbers, print the m',
    '"Loops solve number problems fast. Given N print numbers from 1 to N, print all even numbers or -1, find the maximum of N numbers, print the m');
rep('"JOIN US! Learning Python: Problem Solving. Reverse N and test palindrome with YES or NO, print all divisors in order, print lucky numbers with 4 and 7',
    '"Look for patterns. Reverse N and test palindrome with YES or NO, print all divisors in order, print lucky numbers with 4 and 7');
rep('"JOIN US! Learning Python: while Loops. A for loop repeats a known number of times, but a while loop keeps repeating while a condition is true',
    '"Sometimes you do not know how many times to repeat. A for loop repeats a known number of times, but a while loop keeps repeating while a condition is true');
rep('"JOIN US! Learning Python: Problem Solving. Keep reading passwords until 1999 with Correct and Wrong, print digits from right to left with % 10 and // ',
    '"While loops inspect numbers digit by digit. Keep reading passwords until 1999 with Correct and Wrong, print digits from right to left with % 10 and // ');
rep('"JOIN US! Learning Python: More about Loops. Count the lines inside each loop body, use if inside loops for conditional parts, stop 3-attempt passwords',
    '"Control your loops precisely. Count the lines inside each loop body, use if inside loops for conditional parts, stop 3-attempt passwords');
rep('"JOIN US! Learning Python: Problem Solving. Print each sequence from N to M with its sum until a zero stops you, draw the Shape2 pyramid with while loo',
    '"Build fun things with loops. Print each sequence from N to M with its sum until a zero stops you, draw the Shape2 pyramid with while loo');
rep('"JOIN US! Learning Python: Lists. Turn many variables into one list with MyScores, use brackets and commas, measure length with len(), read items with ',
    '"One box for a whole group. Turn many variables into one list with MyScores, use brackets and commas, measure length with len(), read items with ');
rep('"JOIN US! Learning Python: Lists 2. Print every subject one by one, replace 4 prints with for in and while with len(), see i as items vs indices, use a',
    '"Make lists work for you. Print every subject one by one, replace 4 prints with for in and while with len(), see i as items vs indices, use a');

console.log("len", origLen, "->", t.length);
fs.writeFileSync(path, t);
console.log("written");
