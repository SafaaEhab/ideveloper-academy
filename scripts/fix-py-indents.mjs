import fs from "node:fs";
import { execFileSync } from "node:child_process";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
const log = [];
function repAll(oldS, newS, label) {
  const n = t.split(oldS).length - 1;
  if (!n) { log.push("MISS " + label); return; }
  t = t.split(oldS).join(newS);
  log.push("OK " + label + " x" + n);
}
// Source-level: \\n in this script = literal backslash-n in the TS file.
const N = "\\n";

// ---- global safe single-line fixes (always loop bodies) ----
repAll(N + " counter = counter + 1", N + "    counter = counter + 1", "counter+1");
repAll(N + " counter = counter - 1", N + "    counter = counter - 1", "counter-1");
repAll(N + " user_input = input(\"Enter the password: \")", N + "    user_input = input(\"Enter the password: \")", "user_input indent");
repAll(N + " crashed = True", N + "    crashed = True", "crashed");
repAll(N + " temperature = int(input(\"Enter temperature: \"))", N + "    temperature = int(input(\"Enter temperature: \"))", "temperature");
repAll(N + " i = i + 1", N + "    i = i + 1", "i=i+1");

// ---- s10 Problem 3: maximum ----
repAll(
  "for i in range(N):" + N + " x = int(input(\"Enter the numbers \"))" + N + " if i == 0:" + N + " maximum = x" + N + " elif x > maximum:" + N + " maximum = x" + N + "print(maximum)",
  "for i in range(N):" + N + "    x = int(input(\"Enter the numbers \"))" + N + "    if i == 0:" + N + "        maximum = x" + N + "    elif x > maximum:" + N + "        maximum = x" + N + "print(maximum)",
  "s10 max");

// ---- s11 Problem 3: lucky ----
repAll(
  "for i in range(A, B + 1):" + N + " lucky = True" + N + " for digit in str(i):" + N + " if digit != \"4\" and digit != \"7\":" + N + " lucky = False" + N + " break" + N + " if lucky:" + N + "    print(i, end=\" \")" + N + " found = True" + N + "if not found:" + N + "    print(-1)",
  "for i in range(A, B + 1):" + N + "    lucky = True" + N + "    for digit in str(i):" + N + "        if digit != \"4\" and digit != \"7\":" + N + "            lucky = False" + N + "            break" + N + "    if lucky:" + N + "        print(i, end=\" \")" + N + "        found = True" + N + "if not found:" + N + "    print(-1)",
  "s11 lucky");

// ---- p4 Problem 1: fixed password ----
repAll(
  "while True:" + N + " X = int(input(\"Enter the password \"))" + N + " if X == 1999:" + N + "    print(\"Correct\")" + N + " break" + N + " else:" + N + "    print(\"Wrong\")",
  "while True:" + N + "    X = int(input(\"Enter the password \"))" + N + "    if X == 1999:" + N + "        print(\"Correct\")" + N + "        break" + N + "    else:" + N + "        print(\"Wrong\")",
  "p4 password");

// ---- p4 Problem 2: digits right to left ----
repAll(
  "for i in range(T):" + N + " N = int(input(\"Enter the number \"))" + N + " if N == 0:" + N + "    print(0)" + N + " else:" + N + " while N > 0:" + N + "    print(N % 10, end=\" \")" + N + " N //= 10" + N + "    print()",
  "for i in range(T):" + N + "    N = int(input(\"Enter the number \"))" + N + "    if N == 0:" + N + "        print(0)" + N + "    else:" + N + "        while N > 0:" + N + "            print(N % 10, end=\" \")" + N + "            N //= 10" + N + "        print()",
  "p4 digits");

// ---- p5a skeleton: count lines inside loop body ----
repAll(
  "while True:" + N + " # code 1" + N + " if number == 0:" + N + " pass # code 2" + N + " # code 3" + N + N + "for counter in range(11):" + N + " # code 1" + N + " if number == 0:" + N + " pass # code 2" + N + " # code 3",
  "while True:" + N + "    # code 1" + N + "    if number == 0:" + N + "        pass # code 2" + N + "    # code 3" + N + N + "for counter in range(11):" + N + "    # code 1" + N + "    if number == 0:" + N + "        pass # code 2" + N + "    # code 3",
  "p5a skeleton");

// ---- p5a Activity 2: Welcome + Zero checker (question + solution share body) ----
repAll(
  "while True:" + N + "    print(\"Welcome!\")" + N + " number = int(input(\"Enter a number\"))" + N + " if number == 0:" + N + "    print(\"It is a Zero!\")" + N + " else:" + N + "    print(\"It isn't a Zero!\")",
  "while True:" + N + "    print(\"Welcome!\")" + N + "    number = int(input(\"Enter a number\"))" + N + "    if number == 0:" + N + "        print(\"It is a Zero!\")" + N + "    else:" + N + "        print(\"It isn't a Zero!\")",
  "p5a welcome-zero");

// ---- p5a Activity 3.3: break ----
repAll(
  "for counter in range(3):" + N + " userPassword = input(\"Enter your password:\")" + N + " if userPassword == \"1234\":" + N + "    print(\"Access granted\")" + N + " break" + N + " else:" + N + "    print(\"Wrong Password\")",
  "for counter in range(3):" + N + "    userPassword = input(\"Enter your password:\")" + N + "    if userPassword == \"1234\":" + N + "        print(\"Access granted\")" + N + "        break" + N + "    else:" + N + "        print(\"Wrong Password\")",
  "p5a break");

// ---- p5a Activity 5: guessing game ----
repAll(
  "for counter in range(5):" + N + " guess = int(input(\"Guess the number: \"))" + N + " if guess == secret:" + N + "    print(\"Correct! You found it\")" + N + " break" + N + " else:" + N + "    print(\"Wrong guess! Try again.\")",
  "for counter in range(5):" + N + "    guess = int(input(\"Guess the number: \"))" + N + "    if guess == secret:" + N + "        print(\"Correct! You found it\")" + N + "        break" + N + "    else:" + N + "        print(\"Wrong guess! Try again.\")",
  "p5a guess");

// ---- p5a Activity 6: continue demo (two loops) ----
repAll(
  "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"Don't print this number\")" + N + " continue" + N + "    print(number)" + N + N + "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"Don't print this number\")" + N + "    print(number)",
  "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"Don't print this number\")" + N + "        continue" + N + "    print(number)" + N + N + "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"Don't print this number\")" + N + "    print(number)",
  "p5a continue-both");
repAll(
  "for number in range(1, 6):" + N + " if number == 3:" + N + "    print(\"Don't print this number\")" + N + " continue" + N + "    print(number)",
  "for number in range(1, 6):" + N + "    if number == 3:" + N + "        print(\"Don't print this number\")" + N + "        continue" + N + "    print(number)",
  "p5a continue-single");

// ---- p5b Problem 1: sequence + sum ----
repAll(
  "while True:" + N + " N, M = map(int, input().split())" + N + " if N <= 0 or M <= 0:" + N + " break" + N + " if N > M:" + N + " N, M = M, N" + N + " sum = 0" + N + " for i in range(N, M + 1):" + N + "    print(i, end=\" \")" + N + " sum += i" + N + "    print(\"sum =\", sum)",
  "while True:" + N + "    N, M = map(int, input().split())" + N + "    if N <= 0 or M <= 0:" + N + "        break" + N + "    if N > M:" + N + "        N, M = M, N" + N + "    sum = 0" + N + "    for i in range(N, M + 1):" + N + "        print(i, end=\" \")" + N + "        sum += i" + N + "    print(\"sum =\", sum)",
  "p5b seq-sum");

// ---- p5b Problem 2: pyramid ----
repAll(
  "while row < N:" + N + " spaces = N - row - 1" + N + " while spaces > 0:" + N + "    print(\" \", end=\"\")" + N + " spaces -= 1" + N + " count = 0" + N + " while count < stars:" + N + "    print(\"*\", end=\"\")" + N + " count += 1" + N + "    print()" + N + " stars += 2" + N + " row += 1",
  "while row < N:" + N + "    spaces = N - row - 1" + N + "    while spaces > 0:" + N + "        print(\" \", end=\"\")" + N + "        spaces -= 1" + N + "    count = 0" + N + "    while count < stars:" + N + "        print(\"*\", end=\"\")" + N + "        count += 1" + N + "    print()" + N + "    stars += 2" + N + "    row += 1",
  "p5b pyramid");

// ---- p5b Problem 3: some sums ----
repAll(
  "while i <= N:" + N + " temp = i" + N + " digit_sum = 0" + N + " while temp > 0:" + N + " digit_sum += temp % 10" + N + " temp //= 10" + N + " if A <= digit_sum <= B:" + N + " answer += i" + N + " i += 1" + N + "print(answer)",
  "while i <= N:" + N + "    temp = i" + N + "    digit_sum = 0" + N + "    while temp > 0:" + N + "        digit_sum += temp % 10" + N + "        temp //= 10" + N + "    if A <= digit_sum <= B:" + N + "        answer += i" + N + "    i += 1" + N + "print(answer)",
  "p5b somesums");

// ---- p5b Problem 4: PUM ----
repAll(
  "while row < N:" + N + " count = 0" + N + " while count < 3:" + N + "    print(num, end=\" \")" + N + " num += 1" + N + " count += 1" + N + "    print(\"PUM\")" + N + " num += 1" + N + " row += 1",
  "while row < N:" + N + "    count = 0" + N + "    while count < 3:" + N + "        print(num, end=\" \")" + N + "        num += 1" + N + "        count += 1" + N + "    print(\"PUM\")" + N + "    num += 1" + N + "    row += 1",
  "p5b pum");

// ---- p6b Activity 5: shopping list ----
repAll(
  "while True:" + N + " user = input(\"Add item:\")" + N + " if user == \"done\":" + N + " break" + N + " else:" + N + " shoppingList.append(user)" + N + "print(\"your shopping list items are:\", shoppingList)",
  "while True:" + N + "    user = input(\"Add item:\")" + N + "    if user == \"done\":" + N + "        break" + N + "    else:" + N + "        shoppingList.append(user)" + N + "print(\"your shopping list items are:\", shoppingList)",
  "p6b shopping");

// ---- p7a: count character ----
repAll(
  "for item in text:" + N + " if item == character:" + N + " count += 1" + N + "print(count)",
  "for item in text:" + N + "    if item == character:" + N + "        count += 1" + N + "print(count)",
  "p7a count-char");

fs.writeFileSync(path, t);
console.log(log.join("\n"));
