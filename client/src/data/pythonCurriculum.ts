export type CurriculumSection = {
 title: string;
 body: string;
 code?: string;
  // ده مكان الصور بتاعة السكشن - أي رابط هنا هو صورة، علشان تعرف تعدله
  images?: string[];
  // ده مكان الفيديوهات بتاعة السكشن - أي رابط هنا هو فيديو بيشتغل بمشغل
  videos?: string[];
  // كود البداية الفاضي للتجربة + كود الحل في خانة تانية - للأنشطة فقط
  starterCode?: string;
  solutionCode?: string;
};
export type QuizQuestion = {
 question: string;
 options: string[];
 answer: number;
 explanation: string;
 questionImages?: string[];
 optionImages?: (string[] | undefined)[];
};
export type CurriculumLesson = {
 id: string;
 number: number;
 month: number;
 phase: number;
 kind: "core" | "problem";
 title: string;
 subtitle: string;
 intro: string;
 sections: CurriculumSection[];
 challenge: string;
 quiz: QuizQuestion[];
 accent: string;
 learningGoal?: string;
 successCriteria?: string[];
 commonMistake?: string;
 // ده مكان الصورة الرئيسية للدرس - أي رابط هنا هو صورة، علشان تعرف تعدله
 heroImage?: string;
};
const q = (
 question: string,
 options: string[],
 answer: number,
 explanation: string,
 extra?: Pick<QuizQuestion, "questionImages" | "optionImages">
): QuizQuestion => ({ question, options, answer, explanation, ...extra });
const s = (
  title: string,
  body: string,
  code?: string,
  images?: string[],
  starterCode?: string,
  solutionCode?: string,
  videos?: string[]
): CurriculumSection => ({
  title,
  body,
  code,
  images,
  starterCode,
  solutionCode,
  videos,
});
export const coreLessons: CurriculumLesson[] = [
 {
 id: "s1",
 number: 1,
 month: 1,
 phase: 1,
 kind: "core",
 title: "How Computers Think: Your First Python Program",
 subtitle: "Programs, languages, translators, and your first run",
 intro:
 "Computers only follow precise steps. In this session you will discover what a program really is, see the same idea in blocks and in Python text code, learn how Python is translated for the machine, then run your first program in Online GDB and VS Code.",
 accent: "from-sky-500/20 to-cyan-500/5",
 // دي صورة (الصورة الرئيسية للدرس) - علشان تعرف تعدلها
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",

 learningGoal:
 "Explain what a program is, tell blocks from text code, explain machine code and translators, and run print() in Online GDB and VS Code.",
 successCriteria: [
 "Say in your own words: a program is steps like a recipe",
 "Spot blocks vs text for the same Tomato idea",
 "Run print() that welcomes programming school",
 ],
 commonMistake:
 "Thinking the computer understands English. It only runs 0s and 1s — every Python line must be translated first.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. What is a program? (recipe thinking)\n2. Blocks vs. text code (the Tomato game)\n3. Languages and syntax (spelling matters)\n4. How Python reaches the machine (translator)\n5. Your first run in Online GDB and VS Code"
 ),
 // دي صورة (الروبوت والأصفار والواحدات) - علشان تعرف تعدلها
 s(
 "2 — What Is a Program?",
 "A program is a group of steps given to a computer to follow. Just like a recipe tells you how to cook a meal, a program tells the computer exactly what to do — step by step.\n• Steps must be written in a Programming Language.\n• The computer can't understand vague instructions — they must be precise!",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/hero.png"]
 ),
 s(
 "3 — Blocks vs. Text Programming",
 "Same idea, two looks:\n• Blocks: when flag clicked, set Tomato to 0, forever check touching Robot, go to random position, change Tomato by 1.\n• Text: the same logic written with words and symbols — from mblock import event, sprite.set_variable, while True, if touching.\nBlocks snap together, text gives you full control — and Python is text.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/block.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/text.png"]
 ),
 s(
 "4 — Programming Languages & Syntax",
 "Many languages exist: C++, Python, Java, JavaScript.\nEach language has syntax — strict spelling and symbols, just like grammar. One missing quote or colon and Python stops to tell you.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/t1.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/t2.png"]
 ),
 // دي صورة (شكل الأصفار والواحدات - machine code) - علشان تعرف تعدلها
 s(
 "5 — How Computers Understand Code",
 "Computers only understand machine language — a series of 0s and 1s. Since humans write readable Python, a translator is needed.\n1. Write Python\n2. Translate Code\n3. Machine Code (01 10)",
 'print("Hi computer!")\nprint("I speak Python, you run 0s and 1s")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/binary-machine-code.jpg"]
 ),
 // دي صورة (دياجرام Interpreter vs Compiler) - علشان تعرف تعدلها
 s(
 "6 — Interpreter vs. Compiler",
 "Two kinds of translators:\n• Interpreter: translates line by line, stops at first error, used by Python — fast feedback.\n• Compiler: translates the entire program at once, shows all errors at the end, used by C++.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/interpreter-vs-compiler.jpg"]
 ),
 // دول صور (سكرين شوت التسجيل واختيار اللغة والتشغيل في Online GDB) - علشان تعرف تعدلهم
 s(
 "7 — Getting Started with Online GDB",
 "You don't need to install anything! Use Online GDB in your browser:\n1. Go to Online Editor GDB.\n2. Sign up using your Gmail.\n3. Select Python language.\n4. Write your first code that welcomes programming school!\n5. Run the code by the Interpreter.",
 "",
 [
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/1.jpg",
 "/curriculum/session1/2.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/3.jpg",
 ]
 ),
 // دول صور (خطوات تحميل وتثبيت VS Code) - علشان تعرف تعدلهم
 s(
 "8 — Getting Started with VS Code",
 "Your real workshop on your computer:\n1. Search: vs code download.\n2. Open the official result: code.visualstudio.com.\n3. Download for Windows.\n4. Setup: I accept the agreement, Next, tick all Additional Tasks, Install.",
 'print("welcomes programming school!")\nprint("I built this in VS Code!")',
 [
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v1.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v2.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v3.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v4.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v5.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/v6.png",
 ]
 ),
 ],
 challenge:
 "Home Work:\n1. Download VS Code on your computer.\n2. Search: what is the difference between Run & Debug?\n3. Write one sentence for each in your notebook.",
 quiz: [
 q(
 "What do computers understand directly?",
 [
 "Machine language made of 0s and 1s",
 "English paragraphs",
 "A drawing",
 "A keyboard button",
 ],
 0,
 "Hardware runs machine instructions. Python must be translated first."
 ),
 q(
 "Interpreter vs compiler: which is true?",
 [
 "Interpreter runs line by line and stops at first error",
 "Compiler runs line by line like Python",
 "Interpreter translates everything before running",
 "Compiler never shows errors",
 ],
 0,
 "Python's interpreter runs one line at a time; C++ compiler translates the whole program first."
 ),
  q(
  "The Tomato game logic exists in blocks AND in Python text. What is the advantage of the Python text version?",
  [
  "Full control: you can change any word, number, or rule directly",
  "It runs without a computer",
  "It needs no translator",
  "It cannot make mistakes",
  ],
  0,
  "Blocks snap together nicely, but text code lets you control every detail — that is why we learn Python."
  ),
 q(
 'What does print("welcomes programming school!") do?',
 [
 "Shows the text on the screen",
 "Downloads VS Code",
 "Deletes your file",
 "Signs you up",
 ],
 0,
 "print() displays whatever is inside the parentheses."
 ),
 q(
 "What is the first step to start using Online GDB?",
 [
 "Go to Online GDB in your browser",
 "Install VS Code first",
 "Buy a new computer",
 "Delete your browser",
 ],
 0,
 "Online GDB runs in the browser, so no installation is needed."
 ),
 ],
 },
 {
 id: "s2",
 number: 2,
 month: 1,
 phase: 1,
 kind: "core",
 title: "Variables and Data Types: Your Program's Memory",
 subtitle: "Print(), variables, printing variables, data types",
 intro:
 "Programs need memory. You will use print() to show messages and numbers, store scores and names in variables, print those variables, then choose the right data type: string, integer, float or boolean.",
 accent: "from-sky-500/20 to-cyan-500/5",
 // دي صورة (الصورة الرئيسية للدرس) - علشان تعرف تعدلها
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use print() for text, numbers and many values, create variables, print them, and choose string, int, float or bool.",
 successCriteria: [
 "Print text in quotes and numbers without quotes",
 "Create Age = 15 and Score = 0 with =",
 "Predict overwrite: score = 10 then 20 prints 20",
 ],
 commonMistake:
 'print(score) prints the VALUE 10, but print("score") prints the WORD score. And year = 2025 (int) is not year = "2025" (string).',
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Print()\n2. Variables\n3. Printing variables\n4. Data types"
 ),
 s(
 "2 — print(): show it on the screen",
 "print() is one of the most basic commands in Python. It tells the computer: Show this on the screen console.\n• Print text — always between quotations.\n• Print numbers — do you see any quotations? No!\n• Print more than one value with one print() — can you see the comma?",
 'print("welcomes programming school!")\nprint(100)\nprint(100, 200)\nprint("Welcome", "Hello")\nprint("Welcome", 2025)'
 ),
 s(
 "3 — Variables in blocks!",
 "To store something, use variables.\n• Blocks: set Score to 0, change Score by 1 (increment) or by -1 (decrement). \n",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/2.1.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/2.2.png"]
 ),
 s(
 "4 — Variables in Python!",
 "To store something, use variables.\n• Python: just add = between name and value. Increment: score = score + 1. Decrement: score = score - 1.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/2.3.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/2.4.png"]
 ),
 // دي صورة (طباعة المتغيرات) - علشان تعرف تعدلها
 s(
 "5 — Printing variables + Warning!",
 "Writing the name of the variable in print() prints its VALUE!\nWarning — Don't fall for this trick: print(score) isn't the same as print(\"score\"). One prints 10, the other prints the word score.",
 'score = 10\nprint(score)\nprint("score")'
 ),
 // دي صورة (روبوت الأنشطة) - علشان تعرف تعدلها
 s(
 "6 — Activity 1: score of the game",
 'Write the code that produces this output: \n "score of the game = 10" \n• Use a variable to store 10.\n• Use one print(,).\nHint: "Score of the game = " is simple text, 10 is the variable\'s value.',
 "# Activity 1: score of the game\n# Write your code here - empty interpreter\n"
 ),
 s(
 "7 — Activity 1: Solution",
 "Solution for Activity 1 — compare your answer:",
 'score = 10\nprint("score of the game = ", score)'
 ),
 // دي صورة (أنواع البيانات) - علشان تعرف تعدلها
 s(
 "8 — Data Types: 4 boxes",
 'Values have many types:\n• string • integer • float • booleans\nExample: \n • PlayerName = "Ali Ahmed" (string)\n • score = 10 (int) \n • playerSpeed = 4.7 (float)\n • winGame = True (bool)',
 'PlayerName = "Ali Ahmed"\nscore = 10\nplayerSpeed = 4.7\nwinGame = True\nprint(PlayerName, score, playerSpeed, winGame)'
 ),
 // دول صور (أمثلة البوليان وقواعد الأسماء) - علشان تعرف تعدلهم
 s(
 "9 — String, Integer, Float, Boolean + Warning",
 '• String: any text in single or double quotes: \n name = \'Ali Ahmed\' \n message = "Happy New Year 2026!" \n• Integer: numbers without decimal points: \nmonth = 12\nday = 9.\n• Float: numbers with a decimal point:\n playerSpeed = 4.7\n playTime = 10.2025\n jumpHeight = 2.3.\n• Boolean: \n yes/no, on/off , right/wrong: \nlevelComplete = False\n winGame = True.\n • Warning: year = 2025 (integer) isn\'t the same as year = "2025" (string)!',
 "name = 'Ali Ahmed'\nmessage = \"Happy New Year 2026!\"\nmonth = 12\nday = 9\nplayerSpeed = 4.7\nplayTime = 10.2025\njumpHeight = 2.3\nlevelComplete = False\nwinGame = True\nprint(name, message, month, winGame)"
 ),
 // دي صورة (قواعد أسماء المتغيرات) - علشان تعرف تعدلها
 s(
 "10 — Variable Names DOs & DON'Ts",
 "• Start with a letter or underscore _.\n• Numbers anywhere except the beginning.\n• No symbols except _.\n• No keywords like while.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/variable-dos-donts.jpg"]
 ),
 s(
 "11 — Activity 2: fix the forbidden names",
 "Fix these 5 forbidden variable names, and say why each one is wrong:\n• win$Game \n• 1playerSpeed \n• Player Name \n• pl@yerSpeed \n• while \n Write the corrected name for each one.",
 "# Activity 2: fix the forbidden names\n# Write your corrected names here - empty interpreter\n"
 ),
 s(
 "12 — Activity 2: Solution",
 "Solution for Activity 2 — compare your answers:",
 'win_game = True\nplayer_speed = 4.7\nplayer_name = "Ali Ahmed"\nplayer_speed_2 = 4.7\nwhile_count = 10.2025\nprint(win_game, player_speed, player_name)'
 ),
 s(
 "13 — Activity 3: overwrite",
 "Predict the output BEFORE running:\nscore = 10\nscore = 20\nprint(score)\n• What will be printed — 10 or 20? Why?",
 "# Activity 3: overwrite\n# Write your code here - empty interpreter\n"
 ),
 s(
 "14 — Activity 3: Solution",
 "Solution for Activity 3 — the output is 20:",
 "score = 10\nscore = 20\nprint(score)"
 ),
 s(
 "15 — Activity 4: capitals matter",
 "Predict the output BEFORE running:\nNumber = 10\nnumber = 20\nprint(Number)\n• What will be printed — 10 or 20? Why?",
 "# Activity 4: capitals matter\n# Write your code here - empty interpreter\n"
 ),
 s(
 "16 — Activity 4: Solution",
 "Solution for Activity 4 — the output is 10:",
 "Number = 10\nnumber = 20\nprint(Number)"
 ),
 s(
 "17 — Activity 5: Sara's variables",
 "Turn each fact about Sara into a variable with the correct type, then print everything with ONE print():\n• name: Sara (string)\n• classes: 7 (integer)\n• English test: 88.5 (float)\n• has laptop: True (boolean)\n• break time: 20 (integer)\n• favorite subject: Math (string)",
 "# Activity 5: Sara's variables\n# Write your code here - empty interpreter\n"
 ),
 s(
 "18 — Activity 5: Solution",
 "Solution for Activity 5 — compare your code:",
 'name = "Sara"\nclassNumber = 7\nenglishTest = 88.5\nhasLaptop = True\nbreakTime = 20\nfavSubject = "Math"\nprint(name, classNumber, englishTest, hasLaptop, breakTime, favSubject)'
 ),
 ],
 challenge:
 "Home Work — write at least 5 variables about YOURSELF, then save your project:\n• string: name, favorite subject\n• int: age, grade, siblings\n• float: height, weight\n• bool: do you like sports? did you do homework?",
 quiz: [
 q(
 "Which prints the VALUE 10?",
 [
 "print(score) when score = 10",
 'print("score")',
 "print(score with no variable)",
 "print() with nothing",
 ],
 0,
 "No quotes means the variable's value. Quotes mean the word itself."
 ),
 q(
 "What is printed? score = 10, score = 20, print(score)",
 ["10", "20", "10 20", "An error"],
 1,
 "The second assignment overwrites the first one, so 20 remains."
 ),
 q(
 'year = 2025 vs year = "2025" — what is true?',
 [
 "First is integer, second is string",
 "Both are integers",
 "Both are strings",
 "Both are booleans",
 ],
 0,
 "Quotes change the type from integer to string."
 ),
 q(
 "Which variable name is VALID?",
 ["win$Game", "1playerSpeed", "player_speed", "Player Name"],
 2,
 "Only letters, numbers after the start, and underscore are allowed."
 ),
 q(
 "score = 10 then score = score + 1 — what is score now?",
 ["10", "11", "1", "0"],
 1,
 "score + 1 is 11, and it is stored back into score."
 ),
 ],
 },
 {
 id: "s3",
 number: 3,
 month: 1,
 phase: 1,
 kind: "core",
 title: "Operators: Math, Comparison and Logic",
 subtitle: "Math, comparison, and logical operators",
 intro:
 "Operators are the verbs of Python. You will calculate with math operators, compare values to get True or False, combine rules with and / or / not, follow the correct order (PEMDAS), then solve the Rami umbrella and Sara grades challenges.",
 accent: "from-sky-500/20 to-cyan-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use mathematical, comparison, and logical operators to calculate results, compare values, and build clear rules.",
 successCriteria: [
 "Use +, -, *, /, %, and ** in a Python expression",
 "Predict whether a comparison is True or False",
 "Choose and, or, or not for a real-life rule",
 "Complete the umbrella, grades, and phone-condition activities",
 ],
 commonMistake:
 "Confusing + for numbers with + for string concatenation, or choosing and when the rule needs at least one true condition (or).",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Operators (math, comparing, logical)\n2. Math operations order (PEMDAS)\n3. More practice in logical operators"
 ),
 s(
 "2 — Operators in blocks?",
 "The same operators you know from blocks. In blocks you snap an operator piece (for example 20 + 10); in Python you type the same symbols. Look at the picture, then find each symbol in the table of the next step.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/3.1.png"]
 ),
 s(
 "3 — Mathematical operators table",
 "Math operators work on numbers, and the result is also a number. Try each line: + adds, - subtracts, * multiplies, / divides, % gives the remainder. Predict the answer before you run.",
 "num1 = 20\nnum2 = 10\nprint(20 + 10)\nprint(20 - 10)\nprint(20 * 10)\nprint(20 / 10)\nprint(20 % 10)",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/3.2.png"]
 ),
 s(
 "4 — Variables first, then operate",
 "Save values in variables first, then make the operations on variable values.",
 "num1 = 20\nnum2 = 10\nprint(num1 + num2)\nprint(num1 - num2)\nprint(num1 * num2)\nprint(num1 / num2)"
 ),
 s(
 "5 — Save the result, then print it",
 "Save the result in a variable, then print the variable.",
 "num1 = 20\nnum2 = 10\nresult = num1 + num2\nprint(result)"
 ),
 s(
 "6 — Warning: + adds or joins?",
 "Don\'t fall for this trick!\n• + between two numbers makes addition: 20 + 10 = 30\n• + between two strings makes concatenation: 2010 and Welcome\nPredict each output before running.",
 'num1 = 20\nnum2 = 10\nprint(num1 + num2)\ntext1 = "20"\ntext2 = "10"\nprint(text1 + text2)\nword1 = "Wel"\nword2 = "come"\nprint(word1 + word2)'
 ),
 s(
 "7 — PEMDAS order",
 "If more than one operation is in one line, follow PEMDAS:\n1. Parentheses\n2. Exponentiation\n3. Multiply and division\n4. Add and subtract\nWhat is the output of this program? Which operations are done first?",
 "num1 = 20\nnum2 = 10\nresult = 1000 + num1 * 2 + (num1 / num2) - num1 ** 2\nprint(result)"
 ),
 s(
 "8 — Comparing operators table",
 "Comparing operators compare two values, and the result is always True or False. < means smaller, > means bigger, == means exactly equal. Predict each line before you run.",
 "num1 = 20\nnum2 = 10\nprint(num1 < num2)\nprint(num1 > num2)\nprint(num1 == num2)",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/3.3.png"]
 ),
 s(
 "9 — Save the comparison, then print it",
 "Save values in variables, make the comparison on variable values, save the result, then print it.",
 "num1 = 20\nnum2 = 10\ncheck = num1 > num2\nprint(check)"
 ),
 s(
 "10 — Logical operator: and",
 "and returns True only if both conditions are true.\nHow many True are in the output?",
 "print(True and True)\nprint(True and False)\nprint(False and True)\nprint(False and False)",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/3.4.png"]
 ),
 s(
 "11 — and example: course entry",
 "To attend the online mathematics session you must have a laptop AND internet access.\nWhat is the output of this program?",
 "hasLaptop = True\nhasInternet = False\nprint(hasLaptop and hasInternet)"
 ),
 s(
 "12 — Logical operator: or",
 "or returns True if at least one condition is true.\nHow many True are in the output?",
 "print(True or True)\nprint(True or False)\nprint(False or True)\nprint(False or False)"
 ),
 s(
 "13 — or example: internet",
 "wifiInternet is False and mobileData is True.\nWhat is the output of this program?",
 "wifiInternet = False\nmobileData = True\nprint(wifiInternet or mobileData)"
 ),
 s(
 "14 — Logical operator: not",
 "not reverses the result (True becomes False, False becomes True).",
 "print(not True)\nprint(not False)"
 ),
 s(
 "15 — not example: event entry",
 "Entry to an event is allowed only if you are NOT late.\nWhat is the output of this program?",
 "is_late = True\ncan_enter = not is_late\nprint(can_enter)"
 ),
 s(
 "16 — Activity 6: Rami's umbrella",
 "It is the weekend and Rami is planning to go outside.\nRami decided: I will take my umbrella if at least one of these is true — rainy or snowing.\n• Create two Boolean variables: rainy and snowy.\n• Write a statement with a logical operator to check the umbrella.\n• Print the result (True or False).",
 "# Activity 6: Rami's umbrella\n# Write your code here - empty interpreter\n"
 ),
 s(
 "17 — Activity 6: Solution",
 "Solution for Activity 6 — one True side is enough for or:",
 "rainy = True\nsnowy = False\ntake_umbrella = rainy or snowy\nprint(take_umbrella)"
 ),
 s(
 "18 — Activity 7: Sara's grades",
 "Sara got two grades:\n• English = 72\n• Math = 48\nThe passing grade for each subject is 50, and passing the year needs both subjects.\n• Create english and math with the above values.\n• Write a statement with and to check the year result.",
 "# Activity 7: Sara's grades\n# Write your code here - empty interpreter\n"
 ),
 s(
 "19 — Activity 7: Solution",
 "Solution for Activity 7 — both sides must pass:",
 "english = 72\nmath = 48\npassed_year = english >= 50 and math >= 50\nprint(passed_year)"
 ),
 ],
 challenge:
 "Home Work — Lina watches YouTube (battery = 25, wifi = False):\na. Can she watch? Battery 15 or more AND wifi.\nb. A long session? Battery 50 or more AND internet.\nCreate battery, wifi and mobileData, print both results (True / False).",
 quiz: [
 q(
 "What type does a comparison such as 7 > 3 return?",
 ["A Boolean", "A string", "A list", "A file"],
 0,
 "Comparison operators return True or False, which are Boolean values."
 ),
 q(
 "Which operator means at least one condition is true?",
 ["and", "or", "not", "="],
 1,
 "or returns True when one or both conditions are True."
 ),
 q(
 "Which operator fits: pass only if English and Math are both 50 or more?",
 ["or", "and", "not", "%"],
 1,
 "and requires both conditions to be true."
 ),
 q(
 'What does print("2" + "3") show?',
 ["5", "23", "6", "An error"],
 1,
 "+ joins two strings together instead of adding them."
 ),
 q(
 "Rami takes an umbrella if it is rainy OR snowy. rainy = False, snowy = True — umbrella?",
 ["True", "False", "Maybe", "Error"],
 0,
 "or needs only one True side to give True."
 ),
 ],
 },
 {
 id: "s4",
 number: 4,
 month: 1,
 phase: 1,
 kind: "core",
 title: "Input and Type Casting",
 subtitle: "Read answers and turn text into numbers",
 intro:
 "Programs become useful when they listen. You will check every value with type(), convert between int, float, str and bool, collect real answers with input(), and build a square-perimeter calculator. Remember: input() always returns a string, so convert it before doing math.",
 accent: "from-sky-500/20 to-cyan-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use type() to check data types, cast with int(), float(), str() and bool(), store input() in a variable, and build a working square-perimeter calculator.",
 successCriteria: [
 "Use type() inside print() to check string, integer, float and boolean",
 "Convert values with int, float, str and bool and predict the result",
 "Explain where input appears in real programs such as an ATM",
 "Store an input value in a variable and cast it before math",
 ],
 commonMistake:
 "Adding two input() results directly: Python joins strings such as '30' and '20' into '3020'. Cast them to int or float first. Also type(10) alone shows nothing — you must print(type(10)).",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. The type() function\n2. What is casting?\n3. User Input\n4. Casting with User Input"
 ),
 s(
 "2 — Data types?",
 "Values of the variables have many types. It can be:\n• string\n• integer\n• float\n• booleans",
 'PlayerName = "Ali Ahmed"\nscore = 10\nplayerSpeed = 4.7\nwinGame = True\nprint(PlayerName, score, playerSpeed, winGame)'
 ),
 s(
 "3 — The type() function",
 "type() is used to check the data type of a value or a variable.\n• 5 is Integer\n• 3.14 is float\n• 'Hello' is string",
 "print(type(5))\nprint(type(3.14))\nprint(type('Hello'))",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/4.1.png"]
 ),
 s(
 "4 — The type() function must be printed",
 "To see the result of using type(), you must print it. It will not print automatically.",
 'print(type(10))\nprint(type("Ali Ahmed"))\nprint(type(4.7))\nprint(type(True))',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/4.1.png"]
 ),
 s(
 "5 — What is casting?",
 "Converting from one data type to another.\nUse:\n• int()\n• float()\n• str()\n• bool()"
 ),
 s(
 "6 — Activity 1.1 - Converting to integer",
 "• use int() function\n• 10.5 is a float value.\n• The value stored in num1 is integer conversion of 10.5\n• All numbers after decimal point is removed!",
 "# Activity 1.1\n# Write your code here - empty interpreter\n"
 ),
 s(
 "7 — Activity 1.1: Solution",
 "Solution for Activity 1.1:",
 "num1 = int(10.5)\nprint(num1)\nprint(type(num1))"
 ),
 s(
 "8 — Activity 1.2 - Converting to integer",
 '• use int() function\n• "100" is a string value.\n• The value stored in num1 is integer conversion of "100"',
 "# Activity 1.2\n# Write your code here - empty interpreter\n"
 ),
 s(
 "9 — Activity 1.2: Solution",
 "Solution for Activity 1.2:",
 'num1 = int("100")\nprint(num1)\nprint(type(num1))'
 ),
 s(
 "10 — Activity 1.3 - Converting to integer",
 "• use int() function\n• True/False are boolean values.\n• The value stored in num1 is integer conversion of True\n• The value stored in num2 is integer conversion of False",
 "# Activity 1.3\n# Write your code here - empty interpreter\n"
 ),
 s(
 "11 — Activity 1.3: Solution",
 "Solution for Activity 1.3:",
 "num1 = int(True)\nnum2 = int(False)\nprint(num1, num2)\nprint(type(num1), type(num2))"
 ),
 s(
 "12 — Activity 2.1 - Converting to float",
 "• use float() function\n• 10 is an integer value.\n• The value stored in num1 is float conversion of 10\n• Decimal point is added!",
 "# Activity 2.1\n# Write your code here - empty interpreter\n"
 ),
 s(
 "13 — Activity 2.1: Solution",
 "Solution for Activity 2.1:",
 "num1 = float(10)\nprint(num1)\nprint(type(num1))"
 ),
 s(
 "14 — Activity 2.2 - Converting to float",
 '• use float() function\n• "10.5" is a string value.\n• The value stored in num1 is float conversion of "10.5"',
 "# Activity 2.2\n# Write your code here - empty interpreter\n"
 ),
 s(
 "15 — Activity 2.2: Solution",
 "Solution for Activity 2.2:",
 'num1 = float("10.5")\nprint(num1)\nprint(type(num1))'
 ),
 s(
 "16 — Activity 2.3 - Converting to float",
 "• use float() function\n• True/False are boolean values.\n• The value stored in num1 is float conversion of True\n• The value stored in num2 is float conversion of False",
 "# Activity 2.3\n# Write your code here - empty interpreter\n"
 ),
 s(
 "17 — Activity 2.3: Solution",
 "Solution for Activity 2.3:",
 "num1 = float(True)\nnum2 = float(False)\nprint(num1, num2)\nprint(type(num1), type(num2))"
 ),
 s(
 "18 — Activity 3.1 - Converting to string",
 "• use str() function\n• 10 is an integer value.\n• The value stored in text is string conversion of 10",
 "# Activity 3.1\n# Write your code here - empty interpreter\n"
 ),
 s(
 "19 — Activity 3.1: Solution",
 "Solution for Activity 3.1:",
 "text = str(10)\nprint(text)\nprint(type(text))"
 ),
 s(
 "20 — Activity 3.2 - Converting to string",
 "• use str() function\n• 10.5 is a float value.\n• The value stored in text is string conversion of 10.5",
 "# Activity 3.2\n# Write your code here - empty interpreter\n"
 ),
 s(
 "21 — Activity 3.2: Solution",
 "Solution for Activity 3.2:",
 "text = str(10.5)\nprint(text)\nprint(type(text))"
 ),
 s(
 "22 — Activity 3.3 - Converting to string",
 "• use str() function\n• True/False are boolean values.\n• The value stored in text1 is string conversion of True\n• The value stored in text2 is string conversion of False",
 "# Activity 3.3\n# Write your code here - empty interpreter\n"
 ),
 s(
 "23 — Activity 3.3: Solution",
 "Solution for Activity 3.3:",
 "text1 = str(True)\ntext2 = str(False)\nprint(text1, text2)\nprint(type(text1), type(text2))"
 ),
 s(
 "24 — Activity 4 - Converting to boolean",
 "• use bool() function\n• All values are converted to True or False only\n• 10, 10.5 and 'Hello' become True\n• 0, 0.0 and '' become False",
 "# Activity 4\n# Write your code here - empty interpreter\n"
 ),
 s(
 "25 — Activity 4: Solution",
 "Solution for Activity 4:",
 'value1 = bool(10)\nvalue2 = bool(10.5)\nvalue3 = bool("Hello")\nvalue4 = bool(0)\nvalue5 = bool(0.0)\nvalue6 = bool("")\nprint(value1, value2, value3, value4, value5, value6)\nprint(type(value1))'
 ),
 s(
 "26 — User Input in everyday programs",
 "User can give a value to the program while the program is running.\nExamples:\n• Android program ask user to enter password to open the lock.\n• Calculator program ask user to enter number to make calculation.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/4.2.png"]
 ),
 s(
 "27 — User Input: ATM thinking",
 "• Does ATM machine has user input in its program?\n• In the process of Withdraw money from the ATM which values the ATM program may ask the user to enter?\nThink: card PIN, amount to withdraw, receipt choice.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/4.3.png"]
 ),
 s(
 "28 — User Input in Python: use input!",
 "I want to make the user interacts with program.. Ok, use input!\n• input() allows the user of your program to type something while program is running.\n• It can also display a message before the user enters anything.",
 'input("enter your name: ")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/4.4.png"]
 ),
 s(
 "29 — Store the input or it is lost",
 '• The user input "Ahmed Mohamed Ali" is lost after the user presses Enter!\n• The program cannot use it again!\n• How to solve this? Use a variable to store the input.',
 'name = input("enter your name: ")\nprint(name)\nprint(type(name))'
 ),
 s(
 "30 — Activity 6: the problem",
 "• The two numbers stuck together!\n• input() always returns string to the program.\n• The two numbers are concatenated instead of added!\n• 30 + 20 becomes 3020, and 10.5 + 20 becomes 10.520",
 'num1 = input("Enter first number: ")\nnum2 = input("Enter second number: ")\nprint(num1 + num2)'
 ),
 s(
 "31 — Activity 6: the solution with casting",
 "• Make casting to solve the problem.\n• The two numbers are added together.\n• 30 + 20 becomes 50.0, and 10.5 + 20 becomes 30.5",
 "# Activity 6: fix with casting\n# Write your code here - empty interpreter\n"
 ),
 s(
 "32 — Activity 6: Solution",
 "Solution for Activity 6 — compare your answer:",
 'num1 = float(input("Enter first number: "))\nnum2 = float(input("Enter second number: "))\nprint(num1 + num2)'
 ),
 s(
 "33 — Home Work: square perimeter",
 "Create a simple math program that calculates the perimeter of a square.\n• The program should ask the user to enter the side length of the square.\n• Then, it should calculate the perimeter using the formula: Perimeter = 4 x side\n• Finally, the program should print the result to the user.\n• Remember to use a variable to store the user input.\n• Do not forget to cast the input to an integer before calculation.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: square perimeter\n# Write your solution here - no solved answer\n",
 undefined
 ),
 ],
 challenge:
 "Home Work: square perimeter.\n• Remember to use a variable to store the user input.\n• Do not forget to cast the input to an integer before calculation.\n• Try side 3 to get 12, and side 7 to get 28.",
 quiz: [
 q(
 "What type does input() return before casting?",
 ["int", "float", "str", "bool"],
 2,
 "input() returns a string, even when the user types digits."
 ),
 q(
 "What is the correct perimeter formula for a square?",
 ["side + 4", "4 * side", "side / 4", "side * side"],
 1,
 "A square has four equal sides, so its perimeter is 4 times one side."
 ),
 q(
 "Why do we store input() in a variable?",
 [
 "So the answer can be used again",
 "To delete the answer",
 "To close the program",
 "To change the keyboard",
 ],
 0,
 "Without a variable the typed answer is lost after Enter."
 ),
 q(
 "Which one turns typed text into a whole number?",
 ["int()", "str()", "print()", "input()"],
 0,
 "int() converts numeric text into an integer."
 ),
 q(
 "What is the perimeter of a square with side 5?",
 ["9", "20", "25", "10"],
 1,
 "Perimeter = 4 x 5 = 20."
 ),
 ],
 },
 {
 id: "s5",
 number: 5,
 month: 2,
 phase: 2,
 kind: "core",
 title: "Math Problem Solving: Formulas in Action",
 subtitle: "Difference, circle area, digits, summation, and rounding",
 intro:
 "Time to use formulas like an engineer. You will read input, apply five rules — Difference, circle area, last-digit sum, 1-to-N sum, and floor / ceil / round — and print each answer in the exact format the problem asks for. Your mission: the winter-sale discount challenge.",
 accent: "from-green-500/20 to-emerald-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve five math problems by reading input, applying a formula, and printing exactly what is asked.",
 successCriteria: [
 "Calculate Difference X = (A * B) - (C * D)",
 "Calculate circle area with pi = 3.141592653",
 "Extract last digits with % 10 and sum them",
 "Use N * (N + 1) // 2 for summation 1 to N",
 "Use floor, ceil, and round for A / B",
 ],
 commonMistake:
 "Printing a correct number with the wrong label or format — the judge expects Difference = , floor, ceil, round, and 9 digits for the area.",
 sections: [
 s(
 "Problem 1: Difference",
 "Given four numbers A, B, C and D. Print the result of X = (A * B) - (C * D).\nInput\n• Only one line containing 4 separated numbers A, B, C and D (-10^5 ≤ A, B, C, D ≤ 10^5).\nOutput\n• Print Difference = without quotes followed by the equation result.\nPython idea\n• Use int(input()) four times, then * and - to build X.\nExample\n• Enter 1, 2, 3, 4 gives Difference = -10",
 "# Problem 1: Difference\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/5.1.png"]
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 '# Read four integers\nA = int(input("Enter the number "))\nB = int(input("Enter the number "))\nC = int(input("Enter the number "))\nD = int(input("Enter the number "))\n# Calculate the difference\nX = (A * B) - (C * D)\n# Print the result\nprint("Difference =", X)'
 ),
 s(
 "Problem 2: Area of a Circle",
 "Given a number R calculate the area of a circle using Area = pi * R * R.\nNote: consider pi = 3.141592653.\nInput\n• Only one line containing the number R (1 ≤ R ≤ 100).\nOutput\n• Print the calculated area, with 9 digits after the decimal point.\nPython idea\n• Use float(input()) for R, then * for R * R, then f-string with :.9f.\nExample\n• Enter 2.00 gives The area : 12.566370612",
 "# Problem 2: Area of a Circle\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/5.2.png"]
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 '# Read the radius\nR = float(input("Enter the Radius "))\n# Value of pi\npi = 3.141592653\n# Calculate the area\narea = pi * R * R\n# Print with 9 digits after the decimal point\nprint(f"The area : {area:.9f}")'
 ),
 s(
 "Problem 3: Digits Summation",
 "Given two numbers N and M. Print the summation of their last digits.\nInput\n• Only one line containing two numbers N, M (0 ≤ N, M ≤ 10^18).\nOutput\n• Print the answer of the problem.\nPython idea\n• Use int(input()) twice, then % 10 to get each last digit, then +.\nExample\n• Enter 12, 13 gives 5",
 "# Problem 3: Digits Summation\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/5.3.png"]
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 '# Read two numbers\nN = int(input("Enter the number "))\nM = int(input("Enter the number "))\n# Get the last digit of each number\nlast_N = N % 10\nlast_M = M % 10\n# Print their sum\nprint(last_N + last_M)'
 ),
 s(
 "Problem 4: Summation from 1 to N",
 "Given a number N. Print the summation of the numbers that is between 1 and N (inclusive).\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^9).\nOutput\n• Print the summation of the numbers that are between 1 and N (inclusive).\nPython idea\n• Use int(input()) for N, then the formula N * (N + 1) // 2 — no loop needed.\nExample\n• Enter 10 gives 55",
 "# Problem 4: Summation from 1 to N\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/5.4.png"]
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 '# Read the number\nN = int(input("Enter the number "))\n# Calculate the sum from 1 to N\ntotal = N * (N + 1) // 2\n# Print the result\nprint(total)'
 ),
 s(
 "Problem 5: Two numbers",
 "Given 2 numbers A and B. Print floor, ceil and round of A / B.\nInput\n• Only one line containing two numbers A and B (1 ≤ A, B ≤ 10^3).\nOutput\n• Print 3 lines in the same order:\ni. floor A / B = Floor result without quotes.\nii. ceil A / B = Ceil result without quotes.\niii. round A / B = Round result without quotes.\nPython idea\n• Use int(input()) twice, then / once, then math.floor, math.ceil and round.\nExample\n• Enter 10, 3 gives floor 10 / 3 = 3, ceil 10 / 3 = 4, round 10 / 3 = 3",
 "# Problem 5: Two numbers\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/5.5.png"]
 ),
 s(
 "Problem 5: Solution",
 "Solution for Problem 5 — compare your answer:",
 'import math\n# Read two numbers\nA = int(input("Enter the number "))\nB = int(input("Enter the number "))\n# Divide them\nx = A / B\n# Print floor, ceil and round\nprint("floor", A, "/", B, "=", math.floor(x))\nprint("ceil", A, "/", B, "=", math.ceil(x))\nprint("round", A, "/", B, "=", round(x))'
 ),
 ],
 challenge:
 "Home Work — winter sale: Mrs. Sarah wants a T-shirt with X% discount, price P after discount. Help her know the price before the discount.\nInput: X and P (1 ≤ X ≤ 99, 1 ≤ P ≤ 4 x 10^4).\nOutput: price before discount rounded up to two decimal places.\nExample: Enter 15, 20 gives 23.53.",
 quiz: [
 q(
 "A=1, B=2, C=3, D=4 — what is (A*B)-(C*D)?",
 ["-10", "10", "0", "14"],
 0,
 "1*2=2 and 3*4=12, so 2-12=-10."
 ),
 q(
 "Which code calculates circle area with pi = 3.141592653?",
 ["pi * R * R", "R * 2", "R % 2", "R // 2"],
 0,
 "Area = pi times radius squared."
 ),
 q(
 "What finds the last digit of N?",
 ["N / 10", "N % 10", "N + 10", "N // 2"],
 1,
 "The remainder after division by 10 is the last digit."
 ),
 q(
 "What is the sum from 1 to 10?",
 ["10", "45", "55", "100"],
 2,
 "10*11//2 = 55."
 ),
 q(
 "A=10, B=3 — what are floor, ceil, round of A/B?",
 ["3, 4, 3", "3, 3, 3", "4, 4, 4", "3, 4, 4"],
 0,
 "10/3=3.33, floor 3, ceil 4, round 3."
 ),
 ],
 },
 {
 id: "s6",
 number: 6,
 month: 2,
 phase: 2,
 kind: "core",
 title: "If Conditions: Teach Your Program to Decide",
 subtitle: "if, indentation, elif, else — from Game Over to juice menu",
 intro:
 "Good programs make decisions. Your program takes different paths with if blocks: True runs the indented code and False skips it, separate ifs check everything, elif stops at the first True, else catches a wrong operator — then Activity 4 entry check and the juice-menu Home Work.",
 accent: "from-green-500/20 to-emerald-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use if, elif, and else with correct indentation to take one clear decision.",
 successCriteria: [
 "Explain if condition with True and False",
 "Use indentation to stay inside the if body",
 "Build the 4-if calculator and the elif version",
 "Use else for a wrong operator",
 "Build the laptop + internet entry check",
 ],
 commonMistake:
 "Forgetting the : and indentation, or using separate if statements when elif + else should stop at one decision.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. If Syntax\n2. Indentation with if code\n3. If elif syntax\n4. If elif else syntax"
 ),
 s(
 "2 — If in blocks: the same decision idea",
  "Program takes different decisions according to different conditions using if block.\n• Same idea as If in blocks: if touching Gobo then hide, change Score by 10, start sound collect.\n",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.1.png"]
 ),
 s(
 "3 — If in Python: condition, colon, indented code",
  "Program takes different decisions according to different conditions using if and : then the indented code.",
 'touching_gobo = True\nif touching_gobo:\n    print("hide")\n    print("Score + 10")\n    print("play collect sound")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.2.png"]
 ),
 s(
 "4 — If syntax: True or False",
 "A condition is a statement that the computer can check.\n• It can only have boolean values:\nTrue means the condition is correct\nFalse means the condition is not correct\n• Code after if cannot run before the condition becomes True.\n• Write: if condition : then indented code.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.2.png"]
 ),
 s(
 "5 — Indentation: inside the if body",
 "Indentation means leaving a space before your code.\n• It tells the interpreter: This code is inside the if body.\n• With indentation the print runs only when the condition is True.\n• Without indentation the code is outside and always runs.",
 'playerLifes = 0\nif playerLifes == 0:\n    print("Game Over")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.3.png"]
 ),
 s(
 "6 — Game Over: condition is True",
 "print Game Over is inside the if body.\n• The condition playerLifes == 0 is True, so the indented print runs.\n• indentation = inside, code = the print line.",
 'playerLifes = 0\nif playerLifes == 0:\n    print("Game Over")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.3.png"]
 ),
 s(
 "7 — Outside the body + condition is False",
 "If there is no indentation, the code is outside the if body.\n• playerLifes = 0 with no indentation: condition True but print is outside.\n• playerLifes = 2: the condition playerLifes == 0 is False, so the indented print is skipped.",
 'playerLifes = 2\nif playerLifes == 0:\n    print("Game Over")'
 ),
 s(
 "Activity 1: age and ID",
 "What will be the output in each case?\n• Predict both outputs BEFORE running.",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.4.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.5.png"]
 ),
 s(
 "Activity 1: Solution",
  "Compare your prediction with the running code below. Age 14 prints nothing (14 >= 16 is False), age 20 prints the ID line.",
 'age = 14\nif age >= 16:\n    print("You can make an ID")\nage = 20\nif age >= 16:\n    print("You can make an ID")'
 ),
 s("Activity 2: late for class", "What will be the output?\n", "", [
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.6.png",
 ]),
 s(
 "Activity 2: Solution",
  "Compare your prediction below. late = True prints the first line only, because not(late) is False.",
 'late = True\nif late:\n    print("You can\'t Enter the class")\nif not(late):\n    print("You can Enter the class")'
 ),
 s(
 "Activity 3: calculator with 4 separate if",
 "Do you remember this calculator program? Edit your program:\n• Add an operator variable\n• The operator value will be given by the user\n• There are many possible decisions, use if for each one.\n• Try 100, 70, - gives 30.0",
 "# Activity 3: calculator with 4 separate if\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.7.png"]
 ),
 s(
 "Activity 3: Solution — 4 separate if",
  "Compare your calculator below. Each if is checked independently — try +, -, *, / and watch which single line prints.",
 'num1 = float(input("Enter first number: "))\nnum2 = float(input("Enter second number: "))\noperator = input("Enter the operation sign (+, -, *, /)")\nif operator == "+":\n    print(num1 + num2)\nif operator == "-":\n    print(num1 - num2)\nif operator == "*":\n    print(num1 * num2)\nif operator == "/":\n    print(num1 / num2)'
 ),
 s(
 "8 — If..elif: stop at the first True",
 "With elif, Python stops checking as soon as one condition is true.\n• If it is true, it skips the rest.\n• If not, it moves to the next one, and so on.\n• Same calculator, but faster: one if + three elif.",
 'num1 = float(input("Enter first number: "))\nnum2 = float(input("Enter second number: "))\noperator = input("Enter the operation sign (+, -, *, /)")\nif operator == "+":\n    print(num1 + num2)\nelif operator == "-":\n    print(num1 - num2)\nelif operator == "*":\n    print(num1 * num2)\nelif operator == "/":\n    print(num1 / num2)',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.7.png"]
 ),
 s(
 "9 — Wrong operator % ends silently",
 "If the user enters a wrong operator like %:\n• None of the conditions are true.\n• So nothing will be printed.\n• The program just ends silently.\n• Example: 70, 80, % gives no output.\n• How to solve this problem? Use else.",
 'num1 = float(input("Enter first number: "))\nnum2 = float(input("Enter second number: "))\noperator = input("Enter the operation sign (+, -, *, /)")\nif operator == "+":\n    print(num1 + num2)\nelif operator == "-":\n    print(num1 - num2)\nelif operator == "*":\n    print(num1 * num2)\nelif operator == "/":\n    print(num1 / num2)',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.8.png"]
 ),
 s(
 "10 — If...elif...else: Invalid Operator!",
 "Use else.\n• else runs only if all the previous conditions are false.\n• Example: 70, 80, % gives Invalid Operator!",
 'num1 = float(input("Enter first number: "))\nnum2 = float(input("Enter second number: "))\noperator = input("Enter the operation sign (+, -, *, /)")\nif operator == "+":\n    print(num1 + num2)\nelif operator == "-":\n    print(num1 - num2)\nelif operator == "*":\n    print(num1 * num2)\nelif operator == "/":\n    print(num1 / num2)\nelse:\n    print("Invalid Operator!")'
 ),
 s(
 "Activity 4: online session entry",
 "In the online mathematics course, to enter the session you must have a laptop and have access to the Internet. Otherwise, you will not be able to attend.\nThe program will:\n• ask the user about laptop and internet\n• take the decision\n• yes + yes gives You can enter the online session\n• yes + no gives You can't enter the online session",
 "# Activity 4: online session entry\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.9.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.10.png"]
 ),
 s(
 "Activity 4: Solution",
  "Compare your entry check below. Only yes + yes opens the session, because and needs both sides to be True.",
 'hasLaptop = (input("Do you have a laptop?"))\nhasInternet = (input("Do you have an internet?"))\nif hasLaptop == "yes" and hasInternet == "yes":\n    print("You can enter the online session")\nelse:\n    print("You can\'t enter the online session")'
 ),
 s(
 "Home Work: juice menu",
 "Make a program to:\n• Ask the user to enter his name, print Hello + name\n• Print the juice menu: Apple Juice $2.5, Orange Juice $3, Strawberry Juice $3.5, Mango Juice $4\n• Ask for his choice, print the price\n• If out of the menu print: Sorry, we don't have that juice.",
 "# Home Work: juice menu\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/6.11.png"]
 ),
 ],
 challenge:
 "Home Work — juice menu. Make a program to:\n• Ask the user to enter his name, print Hello + name\n• Print the juice menu: Apple Juice $2.5, Orange Juice $3, Strawberry Juice $3.5, Mango Juice $4\n• Ask for his choice, print the price for apple, orange, strawberry, mango\n• If out of the menu print: Sorry, we don't have that juice.\n• Try Ahmed + orange gives The price of Orange Juice is $3. Try Noha + watermelon gives Sorry.",
 quiz: [
 q(
 "age = 14, if age >= 16: print ID — output?",
 ["Nothing", "You can make an ID", "14", "An error"],
 0,
 "14 >= 16 is False, so the indented print is skipped."
 ),
 q(
 "late = True — what is printed?",
 [
 "You can't Enter the class",
 "You can Enter the class",
 "Both lines",
 "Nothing",
 ],
 0,
 "late is True and not(late) is False."
 ),
 q(
 "With 4 separate ifs and operator -, what happens?",
 [
 "Python still checks * and / after -",
 "Python stops after -",
 "Nothing runs",
 "An error",
 ],
 0,
 "Separate if statements are all checked independently."
 ),
 q(
 "operator = % with if/elif only — output?",
 ["Nothing, ends silently", "Invalid Operator!", "30.0", "An error"],
 0,
 "No branch matches, so nothing is printed."
 ),
 q(
 "laptop = yes, internet = no — entry?",
 [
 "You can enter the online session",
 "You can't enter the online session",
 "An error",
 "Try the juice menu",
 ],
 1,
 "and needs both sides to be yes."
 ),
 ],
 },
 {
 id: "s7",
 number: 7,
 month: 2,
 phase: 2,
 kind: "core",
 title: "Decision Problem Solving: Yes or No, Min and Max",
 subtitle: "Conditions, multiples, min/max, brothers, and letters",
 intro:
 "Decisions in action. You will print Yes or No with if/else, check Multiples with %, find minimum and maximum with if/elif/else, detect brothers with ==, and classify a letter into digit, capital, or small — then the toggle-case Home Work.",
 accent: "from-green-500/20 to-emerald-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve five condition problems with if, elif, and else and print exactly what is asked.",
 successCriteria: [
 "Use if/else with >= to print Yes or No",
 "Use % and or to check Multiples",
 "Use if/elif/else with and to find minimum and maximum",
 "Compare second names with == for brothers",
 "Classify a character into digit, capital, or small",
 ],
 commonMistake:
 "Checking the wrong name for brothers, or printing ALPHA without the second line IS CAPITAL / IS SMALL.",
 sections: [
 s(
 "Problem 1: Welcome for you with Conditions",
 "Given two numbers A and B. Print Yes if A is greater than or equal to B. Otherwise print No.\nInput\n• Only one line containing two numbers A and B (0 ≤ A, B ≤ 100).\nOutput\n• Print Yes or No according to the statement.\nPython idea\n• Use int(input()) twice, then if/else with >=.\nExample\n• Enter 10, 9 gives Yes\n• Enter 5, 6 gives No",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.1.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.2.png"]
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'A = int(input("Enter the number "))\nB = int(input("Enter the number "))\nif A >= B:\n    print("Yes")\nelse:\n    print("No")'
 ),
 s(
 "Problem 2: Multiples",
 "Given two numbers A and B. Print Multiples if A is multiple of B or vice versa. Otherwise print No Multiples.\nInput\n• Only one line containing two numbers A, B (1 ≤ A, B ≤ 10^6).\nOutput\n• Print Multiples or No Multiples corresponding to the read numbers.\nPython idea\n• Use int(input()) twice, then % with or inside if/else.\nExample\n• Enter 9, 3 gives Multiples\n• Enter 19, 3 gives No Multiples",
 "# Problem 2: Multiples\n# Write your code here - empty interpreter\n",

 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.3.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.4.png"]
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'A = int(input("Enter the number "))\nB = int(input("Enter the number "))\nif A % B == 0 or B % A == 0:\n    print("Multiples")\nelse:\n    print("No Multiples")'
 ),
 s(
 "Problem 3: Max and Min",
 "Given 3 numbers A, B and C, print the minimum and the maximum numbers.\nInput\n• Only one line containing 3 numbers A, B and C (-10^5 ≤ A, B, C ≤ 10^5).\nOutput\n• Print the minimum number followed by a single space then print the maximum number.\nPython idea\n• Use int(input()) three times, then if/elif/else with and for minimum and maximum.\nExample\n• Enter 10, 20, -5 gives -5 20\n• Enter 1, 2, 3 gives 1 3",
 "# Problem 3: Max and Min\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.5.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.6.png"]
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 'A = int(input("Enter the number "))\nB = int(input("Enter the number "))\nC = int(input("Enter the number "))\n# Find the minimum\nif A <= B and A <= C:\n minimum = A\nelif B <= A and B <= C:\n minimum = B\nelse:\n minimum = C\n# Find the maximum\nif A >= B and A >= C:\n maximum = A\nelif B >= A and B >= C:\n maximum = B\nelse:\n maximum = C\nprint(minimum, maximum)'
 ),
 s(
 "Problem 4: The Brothers",
 "Given two person names. Each person has the first name + the second name. Determine whether they are brothers or not.\nNote: The two persons are brothers if they share the same second name.\nInput\n• First line has F1, S1 for the 1st person.\n• Second line has F2, S2 for the 2nd person.\nOutput\n• Print ARE Brothers if they are brothers otherwise print NOT.\nPython idea\n• Use input().split() twice, then == on the second names inside if/else.\nExample\n• safaa ehab + ahmed ehab gives ARE Brothers\n• safaa ehab + ahmed amro gives NOT",
 "# Problem 4: The Brothers\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.7.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.8.png"]
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'F1, S1 = input().split()\nF2, S2 = input().split()\nif S1 == S2:\n    print("ARE Brothers")\nelse:\n    print("NOT")'
 ),
 s(
 "Problem 5: Capital or Small or Digit",
 "Given a letter X. Determine whether X is Digit or Alphabet and if it is Alphabet determine if it is Capital Case or Small Case.\nNote: Digits 0 = 48, 1 = 49. Capitals A = 65, B = 66. Smalls a = 97, b = 98.\nInput\n• Only one line containing a character X which will be a capital or small letter or digit.\nOutput\n• Print IS DIGIT if X is digit. Otherwise print ALPHA then IS CAPITAL for capitals and IS SMALL for smalls.\nPython idea\n• Use input() once, then if/elif/else with character ranges.\nExample\n• Enter 9 gives IS DIGIT\n• Enter A gives ALPHA then IS CAPITAL",
 "# Problem 5: Capital or Small or Digit\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.9.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/7.10.png"]
 ),
 s(
 "Problem 5: Solution",
 "Solution for Problem 5 — compare your answer:",
 'X = input("Enter ")\nif X >= "0" and X <= "9":\n    print("IS DIGIT")\nelif X >= "A" and X <= "Z":\n    print("ALPHA")\n    print("IS CAPITAL")\nelse:\n    print("ALPHA")\n    print("IS SMALL")'
 ),
 ],
 challenge:
 "Home Work — toggle case. Given a letter X. If the letter is lowercase print it uppercase. Otherwise print it lowercase.\nNote: difference between a and A in ASCII is 32.\nInput: one character X, capital or small.\nOutput: the converted letter.\nExample: a gives A, A gives a.",
 quiz: [
 q(
 "A=10, B=9 — what is printed?",
 ["Yes", "No", "Multiples", "NOT"],
 0,
 "10 >= 9 is True, so Yes is printed."
 ),
 q(
 "A=9, B=3 — Multiples or No Multiples?",
 ["Multiples", "No Multiples", "Yes", "NOT"],
 0,
 "9 % 3 == 0, so they are multiples."
 ),
 q(
 "For 10, 20, -5 — minimum and maximum?",
 ["-5 20", "10 20", "20 -5", "1 3"],
 0,
 "The smallest is -5 and the largest is 20."
 ),
 q(
 "When are two people brothers?",
 ["Same second name", "Same first name", "Same age", "Same input"],
 0,
 "The second names S1 and S2 must be equal."
 ),
 q(
 'X = "A" — what is printed?',
 ["ALPHA then IS CAPITAL", "IS DIGIT", "ALPHA then IS SMALL", "Nothing"],
 0,
 "A is an alphabet capital letter."
 ),
 ],
 },
 {
 id: "s8",
 number: 8,
 month: 2,
 phase: 2,
 kind: "core",
 title: "Structured Problems: Digits, Coordinates, and Sorting",
 subtitle: "Break five complete problems into small checks",
 intro:
 "Think step by step. Given a four-digit number print EVEN or ODD from its first digit, given X and Y print Q1 to Q4 or Origem / Eixo X / Eixo Y, convert age in days to years months days, sort three numbers then print the original order, and print the next alphabet letter — then the next-character Home Work.",
 accent: "from-green-500/20 to-emerald-500/5",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve five structured problems by reading input, checking special cases first, and printing exactly what is asked.",
 successCriteria: [
 "Read the first digit with X // 1000 and check EVEN with % 2",
 "Check Origem and axes with == 0 before Q1 to Q4",
 "Convert days with // 365 then // 30 and % 30",
 "Print sorted values, a blank line, then the original values",
 "Print the next lowercase letter with chr and ord",
 ],
 commonMistake:
 "Solving the whole problem at once instead of checking special cases such as the origin and axes first — or printing a correct value with the wrong label like Difference = , years, or Eixo spelling.",
 sections: [
 s(
 "Problem 1: First digit !",
 'Given a number X. Print "EVEN" if the first digit of X is even number. Otherwise print "ODD".\nFor example: In 4569 the first digit is 4, the second digit is 5, the third digit is 6 and the fourth digit is 9.\nInput\n• Only one line containing a number X (999 < X ≤ 9999).\nOutput\n• If the first digit is even print "EVEN" otherwise print "ODD".\nPython idea\n• Use X // 1000 to get the first digit, then % 2 to check even or odd.\nExample\n• Enter 4596 gives EVEN\n• Enter 5968 gives ODD',
 "# Problem 1: First digit !\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.1.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.2.png"]
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'X = int(input("Enter the number "))\nfirst = X // 1000\nif first % 2 == 0:\n    print("EVEN")\nelse:\n    print("ODD")'
 ),
 s(
 "Problem 2: Coordinates of a Point",
 'Given two numbers X, Y which donate coordinates of a point in 2D plan. Determine in which quarter does it belong.\nNote:\n• Print Q1, Q2, Q3, Q4 according to the quarter in which the point belongs to.\n• Print "Origem" If the point is at the origin.\n• Print "Eixo X" If the point is over X axis.\n• Print "Eixo Y" if the point is over Y axis.\nInput\n• Only one line containing two numbers X, Y (-1000 ≤ X, Y ≤ 1000).\nOutput\n• Print the answer to problem above.\nPython idea\n• Check origin and axes first with == 0, then check quadrants with > 0 and < 0.\nExample\n• Enter 4.5, -2.2 gives Q4',
 "# Problem 2: Coordinates of a Point\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.3.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.4.png"]
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'X = float(input("Enter the number "))\nY = float(input("Enter the number "))\nif X == 0 and Y == 0:\n    print("Origem")\nelif X == 0:\n    print("Eixo Y")\nelif Y == 0:\n    print("Eixo X")\nelif X > 0 and Y > 0:\n    print("Q1")\nelif X < 0 and Y > 0:\n    print("Q2")\nelif X < 0 and Y < 0:\n    print("Q3")\nelse:\n    print("Q4")'
 ),
 s(
 "Problem 3: Age in Days",
 'Given a Number N corresponding to a person\'s age (in days). Print his age in years, months and days, followed by its respective message "years", "months", "days".\nNote: consider the whole year has 365 days and 30 days per month.\nInput\n• Only one line containing a number N (0 ≤ N ≤ 10^6).\nOutput\n• Print the output, like the following examples.\nPython idea\n• Use N // 365 for years, N % 365 for the remainder, then // 30 and % 30 for months and days.\nExample\n• Enter 400 gives 1 years, 1 months, 5 days',
 "# Problem 3: Age in Days\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.5.png"]
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 'N = int(input("Enter the Age "))\nyears = N // 365\nN = N % 365\nmonths = N // 30\ndays = N % 30\nprint(years, "years")\nprint(months, "months")\nprint(days, "days")'
 ),
 s(
 "Problem 4: Sort Numbers",
 "Given three numbers A, B, C. Print these numbers in ascending order followed by a blank line and then the values in the sequence as they were read.\nInput\n• Only one line containing three numbers A, B, C (-10^6 ≤ A, B, C ≤ 10^6).\nOutput\n• Print the values in ascending order followed by a blank line and then the values in the sequence as they were read.\nPython idea\n• Find the minimum with if/elif/else, find the maximum the same way, then middle = A + B + C - first - third.\nExample\n• Enter 3, -2, 1 gives -2, 1, 3 then a blank line then 3, -2, 1",
 "# Problem 4: Sort Numbers\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/8.6.png"]
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'A = int(input("Enter the number "))\nB = int(input("Enter the number "))\nC = int(input("Enter the number "))\nif A <= B and A <= C:\n first = A\nelif B <= A and B <= C:\n first = B\nelse:\n first = C\nif A >= B and A >= C:\n third = A\nelif B >= A and B >= C:\n third = B\nelse:\n third = C\nmiddle = A + B + C - first - third\nprint(first)\nprint(middle)\nprint(third)\nprint()\nprint(A)\nprint(B)\nprint(C)'
 ),
 ],
 challenge:
 "Home Work — next character. Given a lowercase alphabet character, print the next character in the alphabet.\nInput: only one line containing a lowercase English letter C.\nOutput: print the next letter to C in the alphabet.\nExample: a gives b, and z wraps to a.",
 quiz: [
 q(
 "X = 4596 — what is printed for the first digit?",
 ["EVEN", "ODD", "Q1", "Origem"],
 0,
 "First digit is 4596 // 1000 = 4, and 4 % 2 == 0."
 ),
 q(
 "Point 4.5, -2.2 — which quarter?",
 ["Q1", "Q2", "Q3", "Q4"],
 3,
 "X > 0 and Y < 0 is the fourth quarter."
 ),
 q(
 "N = 400 days — what is the age?",
 [
 "1 years 1 months 5 days",
 "0 years 0 months 0 days",
 "2 years 0 months 0 days",
 "1 years 0 months 0 days",
 ],
 0,
 "400 // 365 = 1 year, remainder 35 gives 1 month and 5 days."
 ),
 q(
 "For 3, -2, 1 — what is the sorted order?",
 ["-2 1 3", "3 -2 1", "1 3 -2", "3 1 -2"],
 0,
 "The minimum is -2, the middle is 1, and the maximum is 3."
 ),
 q(
 'c = "a" — what is the next character?',
 ["a", "b", "z", "An error"],
 1,
 "chr(ord(a) + 1) is b, and z wraps to a."
 ),
 ],
 },
 {
 id: "s9",
 number: 9,
 month: 3,
 phase: 3,
 kind: "core",
 title: "For Loops, range(), and Repetition",
 subtitle: "Repeat steps, stars, and attendance tasks",
 intro:
 "Loops save you from repeating yourself. Use loops to repeat steps of the program — for loop is a definite loop for a known number of times with range(), while loop is an indefinite loop — then Activities 1 to 6 and the attendance Home Work.",
 accent: "from-violet-300/25 to-purple-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use for loop with range() and correct indentation to repeat steps a known number of times.",
 successCriteria: [
 "Tell for definite loop from while indefinite loop",
 "Explain iteration variable num: 0, then 1, then 2",
 "Use indentation to stay inside the for body",
 "Use range(stop), range(start, stop), range(start, stop, step)",
 "Build the stars loop and the attendance app",
 ],
 commonMistake:
 "Forgetting the : and indentation, or thinking range(10) includes 10 — it stops before 10, so it gives 0 to 9.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Loops in Python\n2. Syntax of the for loop\n3. Different Forms of range()\n4. For loop Activities"
 ),
 s(
 "2 — Loops in blocks? Repeat some steps",
 "Use loops to repeat some steps of the program.\n• repeat 5: Jump — repeats Jump 5 times when flag clicked.\n• repeat until touching Rocketship: move 5 steps — keeps moving until the condition is true.\n\n🖼️ [IMAGE PLACEHOLDER: blocks repeat vs Python for, side by side — ارفعي الصورة هنا]",
 "",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.1.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.2.png"]
 ),
 s(
 "3 — Loops in Python: definite and indefinite",
 "In Python, loops are mainly of two types:\n• for loop >> definite loop — you know how many times.\n• while loop >> indefinite loop — you repeat while a condition is true.",
 'for num in range(5):\n    print("Hello")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.3.png"]
 ),
 s(
 "4 — For loop syntax in Python",
 "Write: for + iteration variable + in + range + : then the indented code.\n• for... in... :\n• indentation tells where the loop body starts.",
 'for num in range(5):\n    print("Hello")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.4.png"]
 ),
 s(
 "5 — Iteration variable num + range(5)",
 "Use it when you know how many times you want to repeat some steps.\n• range(5): gives numbers from 0 to 4 (that is 5 times).\n• num is an iteration variable: a variable that changes each time the loop runs.\n• Each time, num takes a new value: first 0, then 1, then 2, etc.",
 'for num in range(5):\n    print("Hello")',
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.5.png"]
 ),
 s(
 "6 — Indentation: inside vs outside the for body",
 'Indentation tells the interpreter: "This code is inside the for body".\n• With indentation the print repeats 5 times.\n• With no indentation the code is outside for body and runs once after the loop — like print Done below.\n• Same idea as if: playerLifes == 0 with indentation prints Game Over inside, without it the line is outside.',
 'for num in range(5):\n    print("Hello")\nprint("Done")'
 ),
 s(
 "Activity 1: print Hello 10 times",
 "Loop to print Hello 10 times.\n• range(10): gives numbers from 0 to 9 (that is 10 times).",
 "# Activity 1: print Hello 10 times\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 1: Solution",
 "Solution for Activity 1 — compare your answer:",
 'for num in range(10):\n    print("Hello")'
 ),
 s(
 "Activity 2: print numbers from 0 to 9",
 "Loop to print numbers from 0 to 9.\n• range(10): gives numbers from 0 to 9.\n• num takes each value in the range one by one.\n• print(num) prints the current value.",
 "# Activity 2: print numbers from 0 to 9\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 2: Solution",
 "Solution for Activity 2 — compare your answer:",
 'for num in range(10):\n    print(num)'
 ),
 s(
 "Activity 3: Step number + dashes",
 "Write a program that:\n• repeats 5 times.\n• Each time, it should print the word Step and the number of the step.\n• After that, it should print a line of dashes to separate the steps.\n• Expected: Step 0 then ----------, Step 1 then ----------, up to Step 4.",
 "# Activity 3: Step number + dashes\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.6.png"]
 ),
 s(
 "Activity 3: Solution",
 "Solution for Activity 3 — compare your answer:",
 'for num in range(5):\n    print("Step", num)\n    print("----------")'
 ),
 s(
 "Activity 4: how many stars?",
 "Write a program that:\n• Ask the user how many stars they want to print.\n• Use a for loop to print that number of stars (*).\n• Each star should be printed on a new line.\n• Try 5 gives 5 stars, try 3 gives 3 stars.",
 "# Activity 4: how many stars?\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.10.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.11.png"]
 ),
 s(
 "Activity 4: Solution",
 "Solution for Activity 4 — compare your answer:",
 'stars = int(input("How many stars do you want to print?"))\nfor num in range(stars):\n    print("*")'
 ),
 s(
 "7 — More about range(): 3 main forms",
 "We already used the simple form of range(): just one number inside bracket.\n• range(10) >>>>> one number inside bracket — starts at 0.\n• range(0, 10) >>> two numbers inside bracket — start and stop.\n• range(0, 10, 1) > three numbers inside bracket — start, stop, step.\n\n🖼️ [IMAGE PLACEHOLDER: counter diagram for start, stop, step — ارفعي الصورة هنا]",
 'for num in range(10):\n    print(num)'
 ),
 s(
 "8 — range() table: start, stop, step",
 "Form / Example / Output:\n• range(stop): range(5) gives 0, 1, 2, 3, 4\n• range(start, stop): range(2, 7) gives 2, 3, 4, 5, 6\n• range(start, stop, step): range(0, 10, 2) gives 0, 2, 4, 6, 8\n• range(start, stop, step) with negative step: range(5, 0, -1) gives 5, 4, 3, 2, 1",
 "print(list(range(5)))\nprint(list(range(2, 7)))\nprint(list(range(0, 10, 2)))\nprint(list(range(5, 0, -1)))",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.12.png"]
 ),
 s(
 "Activity 5: what is the correct output?",
 "What is the correct output of this program?\n• for num in range(0, 10, 2): print(num)\n• Choices: 0 2 4 6 8, or 1 2 3 4 5, or 10 8 6 4 2.\n• Predict BEFORE running.",
 'for num in range(0, 10, 2):\n    print(num)',
 [
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.13.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.14.png",
 "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.15.png",
 ]
 ),
 s(
 "Activity 5: Solution",
 "Solution for Activity 5 — the correct output is 0, 2, 4, 6, 8.\n• Start 0, stop before 10, step 2.",
 'for num in range(0, 10, 2):\n    print(num)'
 ),
 s(
 "Activity 6: which code gives 10 8 6 4 2?",
 "Look at the three programs and the output 10 8 6 4 2:\n• for num in range(0, 10, 2): print(num)\n• for num in range(0, 10): print(num)\n• for num in range(10, 0, -2): print(num)\n• Which one prints 10, 8, 6, 4, 2?",
 "for num in range(0, 10, 2):\n    print(num)\nfor num in range(0, 10):\n    print(num)\nfor num in range(10, 0, -2):\n    print(num)",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.15.png"]
 ),
 s(
 "Activity 6: Solution",
 "Solution for Activity 6 — only range(10, 0, -2) starts at 10 and steps down by 2, so it prints 10, 8, 6, 4, 2.",
 'for num in range(10, 0, -2):\n    print(num)'
 ),
 s(
 "Home Work: attendance app",
 "You are building a small application for a teacher to help him mark attendance. Make a program that:\n• asks the teacher: How many students are in the class today?\n• use a for loop to repeat that number of times.\n• On each loop, the app should ask the teacher: Enter name of student X (where X is the student number).\n• When all student names are entered, the app should print: Attendance completed!\n• Try 2 gives Ahmed, Mohamed then Attendance completed! Try 4 gives Ahmed, Salman, Mohamed, Ali then Attendance completed!\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: attendance app\n# Write your solution here - no solved answer\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.16.png"]
 ),
 ],
 challenge:
 "Home Work — attendance app. Ask How many students are in the class today?, loop that many times asking Enter name of student X, then print Attendance completed!. Try 2 students Ahmed + Mohamed, and 4 students Ahmed + Salman + Mohamed + Ali.",
 quiz: [
 q(
 "for num in range(10): print Hello — how many times?",
 ["10", "9", "5", "1"],
 0,
 "range(10) gives 0 to 9, that is 10 times."
 ),
 q(
 "for num in range(10): print(num) — what is printed?",
 ["0 to 9", "1 to 10", "Hello 10 times", "10 to 1"],
 0,
 "num takes each value in the range one by one."
 ),
 q(
 "What is the correct output of range(0, 10, 2)?",
 ["0 2 4 6 8", "1 2 3 4 5", "10 8 6 4 2", "0 10 2"],
 0,
 "Start 0, stop before 10, step 2."
 ),
 q(
 "Which code prints 10, 8, 6, 4, 2?",
 [
 "for num in range(10, 0, -2)",
 "for num in range(0, 10, 2)",
 "for num in range(0, 10)",
 "for num in range(5)",
 ],
 0,
 "Start at 10, stop before 0, step down by 2."
 ),
 q(
 "In the attendance app, what is printed at the end?",
 [
 "Attendance completed!",
 "Hello",
 "Step 0",
 "Invalid Operator!",
 ],
 0,
 "After all student names are entered, print Attendance completed!."
 ),
 ],
 },
 {
 id: "s10",
 number: 10,
 month: 3,
 phase: 3,
 kind: "core",
 title: "Loop Problem Solving: Numbers, Tables and Factorials",
 subtitle: "1 to N, even numbers, max, tables, and factorials",
 intro:
 "Loops solve number problems fast. Given N print numbers from 1 to N, print all even numbers or -1, find the maximum of N numbers, print the multiplication table from 1 to 12, print the factorial of N — then the prime-number Home Work.",
 accent: "from-violet-300/25 to-purple-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve five loop problems with for and range and print exactly what is asked.",
 successCriteria: [
 "Use range(1, N + 1) to print numbers from 1 to N",
 "Use range(2, N + 1, 2) and print -1 when N is less than 2",
 "Track the maximum with if i == 0 and elif x > maximum",
 "Use range(1, 13) to print the multiplication table",
 "Use fact = fact * j in range(1, N + 1) for factorial",
 ],
 commonMistake:
 "Thinking range(N) includes N — it stops before N, so use N + 1 to include N, and forgetting to print -1 when there are no even numbers.",
 sections: [
 s(
 "Problem 1: 1 to N",
 "Given a number N. Print numbers from 1 to N in separate lines.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^3).\nOutput\n• Print N lines according to the required above.\nPython idea\n• Use int(input()) for N, then for i in range(1, N + 1) with print(i).\nExample\n• Enter 5 gives 1, 2, 3, 4, 5 each on a separate line",
 "# Problem 1: 1 to N\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.1.png"]
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'N = int(input("Enter the number "))\nfor i in range(1, N + 1):\n    print(i)'
 ),
 s(
 "Problem 2: Even or Odd Number Checker",
 "Given a number N. Print all even numbers between 1 and N inclusive in separate lines.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^3).\nOutput\n• Print the answer according to the required above. If there are no even numbers print -1.\nPython idea\n• Use int(input()) for N, check if N < 2 for -1, else for i in range(2, N + 1, 2).\nExample\n• Enter 10 gives 2, 4, 6, 8, 10 each on a separate line\n• Enter 1 gives -1",
 "# Problem 2: Even or Odd Number Checker\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.2.png"]
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'N = int(input("Enter the Number "))\nif N < 2:\n    print(-1)\nelse:\n for i in range(2, N + 1, 2):\n    print(i)'
 ),
 s(
 "Problem 3: Max",
 "Given a number N, and N numbers, find maximum number in these N numbers.\nInput\n• First line contains a number N (1 ≤ N ≤ 10^3).\n• Second line contains N numbers Xi (0 ≤ Xi ≤ 10^9).\nOutput\n• Print the maximum number.\nPython idea\n• Use int(input()) for N, loop range(N) reading each x, keep the largest with if i == 0 and elif x > maximum.\nExample\n• Enter Range 5 then 1, 5, 8, 6, -1 gives 8",
 "# Problem 3: Max\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.3.png"]
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 'N = int(input("Enter the Range"))\nmaximum = 0\nfor i in range(N):\n    x = int(input("Enter the numbers "))\n    if i == 0:\n        maximum = x\n    elif x > maximum:\n        maximum = x\nprint(maximum)'
 ),
 s(
 "Problem 4: Multiplication table",
 "Given a number N. Print the multiplication table of the number from 1 to 12.\nFor example: if N = 1, print 1 * 1 = 1 up to 1 * 12 = 12.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 50).\nOutput\n• Print 12 lines according to the required above.\nPython idea\n• Use int(input()) for N, then for i in range(1, 13) with print(N, *, i, =, N * i).\nExample\n• Enter 12 gives 12 * 1 = 12 up to 12 * 12 = 144",
 "# Problem 4: Multiplication table\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.4.png"]
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'N = int(input("Enter the number "))\nfor i in range(1, 13):\n    print(N, "*", i, "=", N * i)'
 ),
 s(
 "Problem 5: Factorial",
 "Given a number N. Print the factorial of number N.\nInput\n• First line contains a number T (1 ≤ T ≤ 15) number of test cases.\n• Next T lines will contain a number N (0 ≤ N ≤ 20).\nOutput\n• For each test case print a single line contains the factorial of N.\nPython idea\n• Use int(input()) for N, start fact = 1, then for j in range(1, N + 1) with fact = fact * j.\nExample\n• Enter 7 gives 5040",
 "# Problem 5: Factorial\n# Write your code here - empty interpreter\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.5.png"]
 ),
 s(
 "Problem 5: Solution",
 "Solution for Problem 5 — compare your answer:",
 'N = int(input("Enter the number "))\nfact = 1\nfor j in range(1, N + 1):\n fact = fact * j\nprint(fact)'
 ),
 s(
 "Home Work: prime checker",
 'Given a number X. Determine if the number is prime or not.\nNote:\n• A prime number is a number that is greater than 1 and has only two factors which are 1 and itself.\n• In other words: prime number divisible only by 1 and itself.\n• Be careful that 1 is not prime.\n• The first few prime numbers are 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97.\nInput\n• Only one line containing a number X (2 ≤ X ≤ 10^5).\nOutput\n• Print "YES" if the number is prime and "NO" otherwise.\nExample\n• Enter 7 gives YES\nWrite your solution in the empty interpreter below — no solved answer here.',
 "# Home Work: prime checker\n# Write your solution here - no solved answer\n",
 ["https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.6.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/10.7.png"]
 ),
 ],
 challenge:
 "Home Work — prime checker. Given X (2 ≤ X ≤ 10^5), print YES if prime else NO. Remember 1 is not prime. Try 7 gives YES, try 10 gives NO.",
 quiz: [
 q(
 "N = 5 for Problem 1 — what is printed?",
 ["1 2 3 4 5", "5 4 3 2 1", "2 4", "5 only"],
 0,
 "range(1, N + 1) gives 1, 2, 3, 4, 5 each on a new line."
 ),
 q(
 "N = 1 for even numbers — what is printed?",
 ["1", "2", "-1", "0"],
 2,
 "There is no even number between 1 and 1, so print -1."
 ),
 q(
 "Numbers 1, 5, 8, 6, -1 — what is the maximum?",
 ["1", "5", "6", "8"],
 3,
 "8 is larger than 1, 5, 6 and -1."
 ),
 q(
 "In the table of 12: 12 * 12 = ?",
 ["24", "120", "132", "144"],
 3,
 "12 multiplied by 12 is 144, the last table line."
 ),
 q(
 "X = 7 — is it prime, and what is 7! ?",
 ["YES and 5040", "NO and 5040", "YES and 120", "NO and 120"],
 0,
 "7 has only factors 1 and 7, so YES, and 7! = 5040."
 ),
 ],
 },
 {
 id: "s11",
 number: 11,
 month: 3,
 phase: 3,
 kind: "core",
 title: "Patterns and Numbers: Divisors, Lucky Numbers and Shapes",
 subtitle: "Palindrome, divisors, lucky numbers, and shapes",
 intro:
 "Look for patterns. Reverse N and test palindrome with YES or NO, print all divisors in order, print lucky numbers with 4 and 7 or -1, draw the Pyramid and Shape1 triangles with nested loops — then the digits right-to-left Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve five loop and string problems with slicing, remainder, nested loops and digit checks and print exactly what is asked.",
 successCriteria: [
 "Reverse with N[::-1] and drop leading zeros with int()",
 "Test divisors with N % i == 0 in range(1, N + 1)",
 "Check each digit is 4 or 7 and print -1 when none is lucky",
 "Draw Pyramid with range(1, N + 1) and Shape1 with range(N, 0, -1)",
 "Print digits right to left with [::-1] separated by spaces",
 ],
 commonMistake:
 'Converting N to int before reversing — you lose the digits, and forgetting end=" " for lucky numbers or the final print() newline in shapes.',
 sections: [
 s(
 "Problem 1: Palindrome",
 'Given a number N. Print 2 lines that contain the following respectively:\n• Print N in a reversed order and not leading zeroes.\n• If N is a palindrome number print "YES" otherwise, print "NO".\nNote:\n• A palindrome number is a number that reads the same forward or backward.\n• For example: 12321, 101 are palindrome numbers, while 1201, 221 are not.\n• A leading zero is any 0 digit that comes before the first nonzero digit, for example (005, 01, 0123, 02, 000250) have leading zeroes but (5, 123, 20, 2500) do not.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^7).\nOutput\n• Print the answer required above.\nPython idea\n• Read N as string with input(), reverse with N[::-1], print int(reverse) to drop leading zeros, compare N == reverse.\nExample\n• Enter here 121 gives 121 then YES',
 "# Problem 1: Palindrome\n# Write your code here - empty interpreter\n",
 ["/curriculum/session11/1.png"]
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'N = input("Enter here ")\nreverse = N[::-1]\nprint(int(reverse))\nif N == reverse:\n    print("YES")\nelse:\n    print("NO")'
 ),
 s(
 "Problem 2: Divisors",
 "Given a number N. Print all the divisors of N in ascending order.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^4).\nOutput\n• Print all positive divisors of N, one number per line.\nPython idea\n• Use int(input()) for N, then for i in range(1, N + 1) with if N % i == 0.\nExample\n• Enter the number 9 gives 1, 3, 9 each on a separate line",
 "# Problem 2: Divisors\n# Write your code here - empty interpreter\n",
 ["/curriculum/session11/2.png"]
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'N = int(input("Enter the number "))\nfor i in range(1, N + 1):\n if N % i == 0:\n    print(i)'
 ),
 s(
 "Problem 3: Lucky Numbers",
 "Given two numbers A and B. Print all lucky numbers between A and B inclusive.\nNote:\n• The Lucky number is any positive number that its decimal representation contains only 4 and 7.\n• For example: numbers 4, 7, 47 and 744 are lucky and numbers 5, 17 and 174 are not.\nInput\n• Only one line containing two numbers A and B (1 ≤ A ≤ B ≤ 10^5).\nOutput\n• Print all lucky numbers between A and B inclusive separated by a space. If there is no lucky number print -1.\nPython idea\n• Read A and B with int(input()), loop range(A, B + 1), check each digit in str(i), use found flag and print with a trailing space.\nExample\n• Enter the number 4 then Enter the number 20 gives 4 7",
 "# Problem 3: Lucky Numbers\n# Write your code here - empty interpreter\n",
 ["/curriculum/session11/3.png"]
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 'A = int(input("Enter the number "))\nB = int(input("Enter the number "))\nfound = False\nfor i in range(A, B + 1):\n    lucky = True\n    for digit in str(i):\n        if digit != "4" and digit != "7":\n            lucky = False\n            break\n    if lucky:\n        print(i, end=" ")\n        found = True\nif not found:\n    print(-1)'
 ),
 s(
 "Problem 4: Pyramid",
 "Given a number N. Print a left angled triangle that has N rows.\nFor more clarification see the example below.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 99).\nOutput\n• Print the answer according to the required above.\nPython idea\n• Use int(input()) for N, outer for i in range(1, N + 1), inner for j in range(i) printing one star without newline then print() for the next row.\nExample\n• Enter the number 16 gives *, **, *** up to 16 stars",
 "# Problem 4: Pyramid\n# Write your code here - empty interpreter\n",
 ["/curriculum/session11/4.png"]
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'N = int(input("Enter the number "))\nfor i in range(1, N + 1):\n for j in range(i):\n    print("*", end="")\n    print()'
 ),
 s(
 "Problem 5: Shape1",
 "Given a number N. Print a face down right angled triangle that has N rows.\nFor more clarification see the example below.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 99).\nOutput\n• Print the answer according to the required above.\nPython idea\n• Use int(input()) for N, outer for i in range(N, 0, -1), inner for j in range(i) printing one star without newline then print() for the next row.\nExample\n• Enter the number 16 gives 16 stars down to *",
 "# Problem 5: Shape1\n# Write your code here - empty interpreter\n",
 ["/curriculum/session11/5.png"]
 ),
 s(
 "Problem 5: Solution",
 "Solution for Problem 5 — compare your answer:",
 'N = int(input("Enter the number "))\nfor i in range(N, 0, -1):\n for j in range(i):\n    print("*", end="")\n    print()'
 ),
 s(
 "Home Work: digits from right to left",
 "Given a number N. Print the digits of that number from right to left separated by space.\nInput\n• First line contains a number T (1 ≤ T ≤ 10) number of test cases.\n• Next T lines will contain a number N (0 ≤ N ≤ 10^9).\nOutput\n• For each test case print a single line contains the digits of the number separated by space.\nExample\n• Enter the Range 4 then 121 gives 1 2 1, 9698 gives 8 9 6 9, 85743 gives 3 4 7 5 8, 125973 gives 3 7 9 5 2 1\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: digits from right to left\n# Write your solution here - no solved answer\n",
 ["/curriculum/session11/6.png"]
 ),
 ],
 challenge:
 "Home Work — digits from right to left. Given T then T numbers, print each number reversed digit by digit with spaces. Try 121 gives 1 2 1, try 9698 gives 8 9 6 9.",
 quiz: [
 q(
 "N = 121 — what does the palindrome program print?",
 ["121 then YES", "121 then NO", "112 then YES", "121 then -1"],
 0,
 "121 reversed is 121, so N equals reverse and prints YES."
 ),
 q(
 "N = 9 — which numbers are its divisors?",
 ["1, 3, 9", "2, 4, 6", "9 only", "1, 9"],
 0,
 "9 % 1, 9 % 3 and 9 % 9 all leave remainder zero."
 ),
 q(
 "A = 4, B = 20 — which numbers are lucky?",
 ["4 7", "5 17", "4 only", "-1"],
 0,
 "Only 4 and 7 between 4 and 20 use digits 4 and 7."
 ),
 q(
 "Pyramid with N = 3 — what are the rows?",
 ["*, **, ***", "***, **, *", "3 stars each", "1 star each"],
 0,
 "Row i has i stars, so 1 then 2 then 3."
 ),
 q(
 "N = 9698 — digits from right to left?",
 ["9 6 9 8", "8 9 6 9", "9698", "1 2 1"],
 1,
 "Read from the last digit: 8, 9, 6, 9."
 ),
 ],
 },
 {
 id: "s12",
 number: 12,
 month: 3,
 phase: 3,
 kind: "core",
 title: "While Loops: Repeat Until It Is Right",
 subtitle: "Repeat while a condition is true",
 intro:
 "Sometimes you do not know how many times to repeat. A for loop repeats a known number of times, but a while loop keeps repeating while a condition is true — then Activities 1 to 6 and the restaurant Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use while with a condition and correct indentation to repeat while something is true, and stop with a changing condition.",
 successCriteria: [
 "Tell for definite loop from while indefinite loop with fan and game",
 "Write while condition : with indentation for the body",
 "Spot the condition and body lines and avoid while True infinite loop",
 "Count up 1 to 10 and down 10 to 1 with counter update",
 "Build the password checker and the restaurant AddOrder loop",
 ],
 commonMistake:
 "Forgetting the : and indentation, or forgetting to update the counter or ask again inside the body — the condition never becomes False and you get an infinite loop.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Difference between for and while loop\n2. Syntax of the while loop\n3. While loop Activities"
 ),
 s(
 "2 — Loops: repeat(number) block gives for loop",
 "Use loops to repeat some steps of the program.\n• repeat 5: Jump — repeats Jump 5 times when flag clicked.\n• In Python, we can do the same thing using a for loop.",
 'for num in range(5):\n    print("Hello")',
 ["/curriculum/session12/1.png"]
 ),
 s(
 "3 — While loop: repeat while a condition is true",
 "Sometimes, we are not interested in how many times we need to repeat.\n• We are only interested in that we should keep repeating while a condition is true.\n• Indentation tells where the while body starts.\n\n🖼️ [IMAGE PLACEHOLDER: fan ON while temperature > 30 illustration — ارفعي الصورة هنا]"
 ),
 s(
 "Activity 1: fan app — while or For?",
 "While loop and For loop.\n• A program for a fan app to keep printing a message open the fan while the temperature is above 30C.\n• Which loop is correct to use: while or For?\n• Hint: do we know how many times? No — we stop only when temperature is no longer above 30.",
 "# Activity 1: fan app\n# Which loop is correct: while or For? Write your answer here\n",
 ["/curriculum/session12/2.png"]
 ),
 s(
 "Activity 1: Solution",
 "Solution for Activity 1 — compare your answer:\n• Correct choice is while, because the number of repeats is unknown and depends on temperature.",
 'temperature = 35\nwhile temperature > 30:\n    print("open the fan")\n    temperature = int(input("Enter temperature: "))'
 ),
 s(
 "Activity 2: game playing.. — while or For?",
 "While loop and For loop.\n• A program for a game to keep printing playing.. while the player has not crashed.\n• Which loop is correct to use: while or For?\n• Hint: do we know how many times? No — we stop only when the player crashes.",
 "# Activity 2: game playing..\n# Which loop is correct: while or For? Write your answer here\n",
 ["/curriculum/session12/2.png"]
 ),
 s(
 "Activity 2: Solution",
 "Solution for Activity 2 — compare your answer:\n• Correct choice is while, because the game continues an unknown number of times until crash.",
 'crashed = False\nwhile not crashed:\n    print("playing..")\n    crashed = True'
 ),
 s(
 "4 — while loop syntax in Python",
 "Write: while + condition + : then the indented code.\n• while... :\n• condition decides to repeat or stop.\n• indentation tells where the while body starts.",
 'while counter <= 10:\n    print("Welcome")',
 ["/curriculum/session12/3.png"]
 ),
 s(
 "5 — Read the examples: where is the condition?",
 "In these examples:\n• Where are the conditions?\n• How many code lines inside while body?\n• Example 1: counter = 1 with while counter <= 10 has 2 lines inside: print Welcome and counter = counter + 1.\n• Example 2: crashed = False with while not crashed has 1 line inside: print Playing...\n• Example 3: temperature = 30 with while temperature >= 30 has 1 line inside: print open the fan.",
 'counter = 1\nwhile counter <= 10:\n    print("Welcome")\n    counter = counter + 1'
 ),
 s(
 "6 — Infinite loop",
 "This is an infinite loop because the condition is always True.\n• while True never becomes False by itself.\n• It needs a changing condition or break, otherwise it keeps running forever.\n\n🖼️ [IMAGE PLACEHOLDER: while-loop flowchart, condition diamond with arrow back — ارفعي الصورة هنا]",
 'while True:\n    print("Welcome")'
 ),
 s(
 "Activity 3: print Welcome while counter <= 10",
 "Loop to print Welcome while counter is smaller than or equal 10.\n• Start counter = 1.\n• Condition is counter <= 10.\n• Inside: print Welcome, then counter = counter + 1.",
 "# Activity 3: print Welcome\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 3: Solution",
 "Solution for Activity 3 — compare your answer:",
 'counter = 1\nwhile counter <= 10:\n    print("Welcome")\n    counter = counter + 1'
 ),
 s(
 "Activity 4: print numbers from 1 to 10",
 "Print numbers from 1 to 10 using while loop.\n• What will be the condition?\n• What will be the code inside while body?\n• Expected output: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 each on a separate line.",
 "# Activity 4: print 1 to 10\n# Write your code here - empty interpreter\n",
 ["/curriculum/session12/4.png"]
 ),
 s(
 "Activity 4: Solution",
 "Solution for Activity 4 — compare your answer:\n• Condition is counter <= 10.\n• Inside: print(counter) then counter = counter + 1.",
 'counter = 1\nwhile counter <= 10:\n    print(counter)\n    counter = counter + 1'
 ),
 s(
 "Activity 5: print numbers from 10 to 1",
 "Print numbers from 10 to 1 using while loop.\n• What will be the condition?\n• What will be the code inside while body?\n• Expected output: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 each on a separate line.",
 "# Activity 5: print 10 to 1\n# Write your code here - empty interpreter\n",
 ["/curriculum/session12/5.png"]
 ),
 s(
 "Activity 5: Solution",
 "Solution for Activity 5 — compare your answer:\n• Condition is counter >= 1.\n• Inside: print(counter) then counter = counter - 1.",
 'counter = 10\nwhile counter >= 1:\n    print(counter)\n    counter = counter - 1'
 ),
 s(
 "Activity 6: password checker",
 "Make a variable with name password and value 1234.\n• Ask the user to enter the password.\n• Use a while loop to keep asking the user for the password until user types it correctly.\n• Condition to keep looping: user_input != password.\n• End the program after user writes the correct password.\n• Try h gives Wrong password! Try again., try jjk gives Wrong password! Try again., try 1234 stops.",
 "# Activity 6: password checker\n# Write your code here - empty interpreter\n",
 ["/curriculum/session12/6.png", "/curriculum/session12/7.png"]
 ),
 s(
 "Activity 6: Solution",
 "Solution for Activity 6 — compare your answer:",
 'password = "1234"\nuser_input = input("Enter the password: ")\nwhile user_input != password:\n    print("Wrong password! Try again.")\n    user_input = input("Enter the password: ")'
 ),
 s(
 "Home Work: restaurant orders app",
 "You are building a small application for a restaurant to enable customers to order online.\n• Create a variable AddOrder and set it to yes.\n• Use a while loop that repeats while AddOrder equals yes.\n• Inside the loop: Ask the user to enter an order. Ask if they want to add another order (yes / no).\n• When the user types no, the loop ends.\n• Try fish, yes, rice, yes, green salad, yes, Lemon Juice, no. Try burger, yes, fries, no.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: restaurant orders\n# Write your solution here - no solved answer\n",
 ["/curriculum/session12/8.png", "https://res.cloudinary.com/alhiemg0/image/upload/f_auto,q_auto/9.png"]
 ),
 ],
 challenge:
 "Home Work — restaurant orders. Start AddOrder = yes, loop while AddOrder == yes asking Enter your order and add another order? (yes/no). Try fish + rice + green salad + Lemon Juice then no, and burger + fries then no.",
 quiz: [
 q(
 "Fan app prints open the fan while temperature is above 30 — which loop?",
 ["while", "For", "if", "def"],
 0,
 "We do not know how many times, we repeat while temperature > 30, so while."
 ),
 q(
 "while True: print Welcome — why is it infinite?",
 [
 "Condition is always True",
 "Counter increases",
 "Missing print",
 "Missing range",
 ],
 0,
 "True never becomes False by itself, so the loop keeps running forever."
 ),
 q(
 "To print 1 to 10, what is the condition and body?",
 [
 "counter <= 10 with print + counter + 1",
 "counter >= 10 with print + counter - 1",
 "counter == 10 with print only",
 "True with break only",
 ],
 0,
 "Start counter = 1, repeat while counter <= 10, print then add 1."
 ),
 q(
 "Password checker keeps looping while?",
 [
 "user_input != password",
 "user_input == password",
 "password == 1234 only once",
 "True without input",
 ],
 0,
 "The loop repeats while the typed answer is different from 1234."
 ),
 q(
 "Restaurant loop repeats while AddOrder is?",
 ["no", "yes", "done", "empty"],
 1,
 "Start AddOrder = yes, answering yes keeps the loop for another order, no ends it."
 ),
 ],
 },
];
export const problemSolvingLessons: CurriculumLesson[] = [
 {
 id: "p4",
 number: 13,
 month: 4,
 phase: 4,
 kind: "problem",
 title: "Passwords, Digits, and Palindromes",
 subtitle: "Use while loops to reverse and inspect numbers",
 intro:
 "While loops inspect numbers digit by digit. Keep reading passwords until 1999 with Correct and Wrong, print digits from right to left with % 10 and // 10, reverse a number into a reverse variable, test palindrome with YES or NO — then the sum-of-digits Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use while True with break, while N > 0 with % and //, and if/else to check passwords, print digits, reverse numbers, and test palindromes.",
 successCriteria: [
 "Build the fixed-password loop that prints Wrong and stops with Correct on 1999",
 "Print digits from right to left with N % 10 and N //= 10",
 "Build reverse with reverse * 10 + digit",
 "Compare N with reverse to print YES or NO",
 "Add all digits for the Home Work (123 gives 6)",
 ],
 commonMistake:
 "Forgetting break after Correct gives an infinite password loop, and looping directly on N destroys the original value — copy it to temp first so the palindrome compare still works. Also handle N == 0 as a special case.",
 sections: [
 s(
 "Problem 1: Fixed Password",
 "Keep reading passwords.\n• If the password is 1999, print Correct and stop.\n• Otherwise, print Wrong.\nInput\n• Passwords entered one by one.\nOutput\n• Print Wrong for every wrong try, then Correct once when 1999 is entered and stop.\nPython idea\n• Use while True with X = int(input(\"Enter the password \")), if X == 1999 print Correct and break, else print Wrong.\nExample\n• Enter the password 1999 gives Correct\n• Enter the password 875 gives Wrong, Enter the password 15874 gives Wrong, Enter the password 1999 gives Correct",
 "# Problem 1: Fixed Password\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'while True:\n    X = int(input("Enter the password "))\n    if X == 1999:\n        print("Correct")\n        break\n    else:\n        print("Wrong")'
 ),
 s(
 "Problem 2: Print Digits From Right to Left",
 "Idea\n• Print the last digit, remove it, and repeat until the number becomes 0.\nInput\n• First line T = Enter the range (number of test cases).\n• Next T lines each contain N = Enter the number.\nOutput\n• For each N print its digits from right to left separated by a space. If N == 0 print 0.\nPython idea\n• Use for i in range(T), if N == 0 print 0, else while N > 0 with print(N % 10, end=\" \") and N //= 10 then print().\nExample\n• Enter the range 5\n• Enter the number 10987 gives 7 8 9 0 1\n• Enter the number 8569 gives 9 6 5 8\n• Enter the number 1485 gives 5 8 4 1\n• Enter the number 122587 gives 7 8 5 2 2 1\n• Enter the number 1555 gives 5 5 5 1",
 "# Problem 2: Print Digits From Right to Left\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'T = int(input("Enter the range "))\nfor i in range(T):\n    N = int(input("Enter the number "))\n    if N == 0:\n        print(0)\n    else:\n        while N > 0:\n            print(N % 10, end=" ")\n            N //= 10\n        print()'
 ),
 s(
 "Problem 3: Reverse a Number — code ?",
 "Trace this code and predict what it prints:\nN = int(input(\"Enter the number \"))\nreverse = 0\nwhile N > 0:\n digit = N % 10\n reverse = reverse * 10 + digit\n N //= 10\nprint(reverse)\nInput\n• Only one line containing a number N.\nOutput\n• Print N in a reversed order and not leading zeroes (integer reverse drops leading zeros automatically).\nPython idea\n• Start reverse = 0, take digit = N % 10, grow reverse = reverse * 10 + digit, shrink N //= 10, repeat while N > 0.\nExample\n• Enter the number 1234 gives 4321\n• Enter the number 1200 gives 21",
 "# Problem 3: Reverse a Number\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 'N = int(input("Enter the number "))\nreverse = 0\nwhile N > 0:\n digit = N % 10\n reverse = reverse * 10 + digit\n N //= 10\nprint(reverse)'
 ),
 s(
 "Problem 4: Palindrome",
 "Given a number N. Print 2 lines that contain the following respectively:\n• Print N in a reversed order and not leading zeroes.\n• If N is a palindrome number print \"YES\" otherwise, print \"NO\".\nNote:\n• A palindrome number is a number that reads the same forward or backward.\n• For example: 12321, 101 are palindrome numbers, while 1201, 221 are not.\n• A leading zero is any 0 digit that comes before the first nonzero digit in a number for example: numbers (005, 01, 0123, 02, 000250) are leading zeroes but (5, 123, 20, 2500) not leading zeroes numbers.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 10^7).\nOutput\n• Print the answer required above.\nPython idea\n• Copy N to temp so the original is kept, build reverse with % 10 and //= 10, print reverse, then if N == reverse print YES else NO.\nExample\n• Enter the number 7 gives 7 then YES",
 "# Problem 4: Palindrome\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'N = int(input("Enter the number "))\ntemp = N\nreverse = 0\nwhile temp > 0:\n digit = temp % 10\n reverse = reverse * 10 + digit\n temp //= 10\nprint(reverse)\nif N == reverse:\n    print("YES")\nelse:\n    print("NO")'
 ),
 s(
 "Home Work: Sum of Digits",
 "Sum of Digits\n• Add all digits of the number.\nInput\n• 123\nOutput\n• 6\nPython idea\n• Read N, repeat digit = N % 10 with total = total + digit and N //= 10 while N > 0, then print total.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: Sum of Digits\n# Input 123 gives Output 6\n# Write your solution here - no solved answer\n"
 ),
 ],
 challenge:
 "Home Work — Sum of Digits. Add all digits of the number. Try 123 gives 6.",
 quiz: [
 q(
 "Which operation removes the last digit?",
 ["// 10", "% 10", "+ 10", "* 10"],
 0,
 "Integer division by 10 removes the last digit."
 ),
 q(
 "Typing 1999 on the first try prints?",
 ["Wrong", "Correct", "Nothing", "1999"],
 1,
 "The correct password prints Correct and stops."
 ),
 q(
 "Which operation READS the last digit?",
 ["// 10", "% 10", "+ 10", "* 10"],
 1,
 "% 10 is the remainder, which is the last digit."
 ),
 q(
 "121 reversed is 121 — is it a palindrome?",
 ["YES", "NO", "Maybe", "Error"],
 0,
 "The reverse equals the original, so it prints YES."
 ),
 q(
 "What is the sum of the digits of 123?",
 ["5", "6", "123", "32"],
 1,
 "1 + 2 + 3 = 6."
 ),
 ],
 },
 {
 id: "p5a",
 number: 14,
 month: 4,
 phase: 4,
 kind: "problem",
 title: "Loop Control: if Inside Loops, break and continue",
 subtitle: "If inside loops, break, and continue",
 intro:
 "Control your loops precisely. Count the lines inside each loop body, use if inside loops for conditional parts, stop 3-attempt passwords and the guess game early with break, skip number 3 and empty names with continue — then the restaurant and names Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Use if inside loops for conditional parts, break to exit a loop early, and continue to skip one iteration in password, guess, order, and name programs.",
 successCriteria: [
 "Count the loop-body lines and tell where each loop stops",
 "Explain the conditional part with if inside while and for",
 "Add break to stop the password and guess loops early",
 "Use continue to skip number 3 and empty names",
 "Build the restaurant orders and names greeting apps",
 ],
 commonMistake:
 "Putting break outside the if stops the loop on the very first try no matter what, and forgetting to ask again inside a while body makes an infinite loop. Everything below continue is skipped for that round, so never put needed code after it.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. If inside loops\n2. Continue Statement\n3. Break statement\n4. Exercises"
 ),
 s(
 "Activity 1.1: password loop — how many lines?",
 "• How many lines inside the loop body?\n• Where does the loop stop?\n• Run it once with a wrong password and once with 1234.",
 'password = "1234"\nuser_input = input("Enter the password: ")\nwhile user_input != password:\n    print("Wrong password! Try again.")\n    user_input = input("Enter the password: ")'
 ),
 s(
 "Activity 1.1: Solution",
 "Solution for Activity 1.1 — compare your answer:\n• 2 lines inside the loop body: print Wrong password! Try again. and read the password again.\n• The loop stops when user_input == password, when the user types 1234.",
 'password = "1234"\nuser_input = input("Enter the password: ")\nwhile user_input != password:\n    print("Wrong password! Try again.")\n    user_input = input("Enter the password: ")'
 ),
 s(
 "Activity 1.2: Welcome loop — how many lines?",
 "• How many lines inside the loop body?\n• Where does the loop stop?\n• Run it and watch what happens.",
 'while True:\n    print("Welcome to I developer")\n    print("You can join us and start your programming Journey")\n    print("Contact Us")'
 ),
 s(
 "Activity 1.2: Solution",
 "Solution for Activity 1.2 — compare your answer:\n• 3 lines inside the loop body.\n• It NEVER stops by itself: while True is always True, so this is an infinite loop. Stop it yourself, or fix it with a changing condition or break.",
 'while True:\n    print("Welcome to I developer")\n    print("You can join us and start your programming Journey")\n    print("Contact Us")'
 ),
 s(
 "Activity 1.3: even numbers loop",
 "• How many lines inside the loop body?\n• Where does the loop stop?\n• Write it and run it.",
 "for num in range(0, 10, 2):\n    print(num)"
 ),
 s(
 "Activity 1.3: Solution",
 "Solution for Activity 1.3 — compare your answer:\n• 1 line inside the loop body.\n• The loop stops when range(0, 10, 2) is finished. Output:\n0\n2\n4\n6\n8",
 "for num in range(0, 10, 2):\n    print(num)"
 ),
 s(
 "2 — If with Loops",
 "Not all code within the loop will run every time; some parts are conditional.\n• Part 2 is a conditional part inside the loop body.\n• Code 1 and Code 3 run every iteration, Code 2 runs only when number == 0.",
 "while True:\n    # code 1\n    if number == 0:\n        pass # code 2\n    # code 3\n\nfor counter in range(11):\n    # code 1\n    if number == 0:\n        pass # code 2\n    # code 3"
 ),
 s(
 "Activity 2: Welcome and Zero checker",
 "• How many print() inside the loop body?\n• How many conditional print() statements are there?\n• Write the following program and run it.",
 'while True:\n    print("Welcome!")\n    number = int(input("Enter a number"))\n    if number == 0:\n        print("It is a Zero!")\n    else:\n        print("It isn\'t a Zero!")'
 ),
 s(
 "Activity 2: Solution",
 "Solution for Activity 2 — compare your answer:\n• 3 print() calls inside the loop body: Welcome!, It is a Zero!, It isn't a Zero!.\n• 2 of them are conditional (inside if and else). Welcome! prints every time.",
 'while True:\n    print("Welcome!")\n    number = int(input("Enter a number"))\n    if number == 0:\n        print("It is a Zero!")\n    else:\n        print("It isn\'t a Zero!")'
 ),
 s(
 "Activity 3.1: password with 3 attempts",
 "Write the following program and run it.\nThis program asks the user to enter his password.\nThe user has only three attempts.",
 'for counter in range(3):\n userPassword = input("Enter your password:")\n if userPassword == "1234":\n    print("Access granted")\n else:\n    print("Wrong Password")'
 ),
 s(
 "Activity 3.1: Solution",
 "Solution for Activity 3.1 — compare your answer:\n• range(3) gives exactly 3 iterations, so the program asks 3 times.\n• Activity 3.2: with 15, 45, 19 it prints Wrong Password 3 times.\n• Activity 3.3 problem: with 45 then 1234, Access granted prints but the loop still asks a third time — fix it with break.",
 'for counter in range(3):\n userPassword = input("Enter your password:")\n if userPassword == "1234":\n    print("Access granted")\n else:\n    print("Wrong Password")'
 ),
 s(
 "Activity 3.3: stop early with break",
 "• Is there something that can stop the loop early when the password is correct?\n• Can we break out of the loop before finishing all 3 tries?\n• Yes — Break statement: exit the loop when we have reached an exit condition without completing the body of the current iteration.",
 'for counter in range(3):\n    userPassword = input("Enter your password:")\n    if userPassword == "1234":\n        print("Access granted")\n        break\n    else:\n        print("Wrong Password")'
 ),
 s(
 "Activity 5: guess game — where to put break?",
 "• Where to put the break statement?\n• This program is a guess game.\n• The player tries to guess the secret number 5 times and breaks the loop if his guess is correct.\n• Run it first as written, then add the missing break.",
 'secret = 7\nfor counter in range(5):\n guess = int(input("Guess the number: "))\n if guess == secret:\n    print("Correct! You found it")\n else:\n    print("Wrong guess! Try again.")'
 ),
 s(
 "Activity 5: Solution",
 "Solution for Activity 5 — compare your answer:\n• Put break right after the Correct print, inside the if:\nif guess == secret:\n print Correct! You found it\n break\n• Now guessing 7 on try 2 stops the game at once instead of asking 5 times.",
 'secret = 7\nfor counter in range(5):\n    guess = int(input("Guess the number: "))\n    if guess == secret:\n        print("Correct! You found it")\n        break\n    else:\n        print("Wrong guess! Try again.")'
 ),
 s(
 "Continue statement",
 "• Stop the current iteration without finishing the body of the loop for this iteration.\n• Go to next iteration.\n• Remember the difference: break exits the whole loop, continue only ends this round."
 ),
 s(
 "Activity 6: which code skips 3?",
 "What is the difference between two codes and their outputs?\nWhich code skips printing number 3?\n• Run both codes and compare their outputs.",
 'for number in range(1, 6):\n    if number == 3:\n        print("Don\'t print this number")\n        continue\n    print(number)\n\nfor number in range(1, 6):\n    if number == 3:\n        print("Don\'t print this number")\n    print(number)'
 ),
 s(
 "Activity 6: Solution",
 "Solution for Activity 6 — compare your answer:\n• The FIRST code (with continue) skips printing 3.\n• With continue: 1, 2, Don't print this number, 4, 5.\n• Without continue: 1, 2, Don't print this number, 3, 4, 5.\n• continue jumps to the next iteration before print(number).",
 'for number in range(1, 6):\n    if number == 3:\n        print("Don\'t print this number")\n        continue\n    print(number)'
 ),
 s(
 "Home Work: restaurant orders app",
 "You are building a small application for a restaurant to enable customers to order online.\n• Create a variable AddOrder and set it to yes.\n• Use a while loop with true condition.\n• Inside the loop: Ask the user to enter an order. Update value of AddOrder variable by asking the user if they want to add another order (yes / no).\n• If the user types no, the loop ends using break statement.\n• Try burger, yes, fries, no. Try fish, yes, rice, yes, green salad, yes, Lemon Juice, no.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: restaurant orders app\n# AddOrder starts as yes, while True, ask order, ask yes/no, break on no\n# Write your solution here - no solved answer\n"
 ),
 s(
 "Home Work 2: names and greetings",
 "You are creating a small application to collect users names and greet them.\n• Use a for loop that repeats 3 times.\n• Inside the loop: Ask the user to enter their name.\n• If the user leaves the input empty: display You didn't type anything. Skipping... and use continue to skip to the next one.\n• If the user types a name, display Welcome, [name] and break the loop.\n• The program ends after 3 attempts.\n• Try empty, empty, Ahmed Samy gives Welcome, Ahmed Samy. Try Nora at once gives Welcome, Nora.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work 2: names and greetings\n# for loop 3 times, empty input -> continue, name -> Welcome + break\n# Write your solution here - no solved answer\n"
 ),
 ],
 challenge:
 "Home Work — restaurant orders with while True and break (burger + fries, fish + rice + salad + juice), and names app with for, continue and break (Ahmed Samy, Nora).",
 quiz: [
 q(
 "What does break do inside a loop?",
 [
 "Exits the whole loop at once",
 "Skips one iteration",
 "Repeats the loop",
 "Defines a function",
 ],
 0,
 "break exits the loop immediately without finishing the remaining tries."
 ),
 q(
 "What does continue do inside a loop?",
 [
 "Ends the program",
 "Skips the rest of this iteration and goes to the next",
 "Repeats the same line forever",
 "Closes the editor",
 ],
 1,
 "continue jumps to the next iteration before the code below it."
 ),
 q(
 "Password loop with range(3), tried 15, 45, 19 — what prints?",
 [
 "Wrong Password 3 times",
 "Access granted",
 "Nothing",
 "An error",
 ],
 0,
 "All three tries are wrong, and range(3) asks exactly 3 times."
 ),
 q(
 "Guess game with break, secret 7, correct on try 2 — how many tries run?",
 ["2", "5", "1", "0"],
 0,
 "break exits the loop as soon as the guess is correct."
 ),
 q(
 "First Activity 6 code with continue — which numbers print from 1 to 5?",
 [
 "1 2 4 5 plus the warning message",
 "1 2 3 4 5 plus the warning message",
 "3 only",
 "Nothing",
 ],
 0,
 "continue skips print(number) when number is 3."
 ),
 ],
 },
 {
  id: "p5b",
  number: 15,
  month: 4,
  phase: 4,
 kind: "problem",
 title: "Creative Loops: Sequences, Pyramids and the PUM Game",
 subtitle: "Sequence and sum, pyramid, digit sums, PUM, and diamond",
 intro:
 "Build fun things with loops. Print each sequence from N to M with its sum until a zero stops you, draw the Shape2 pyramid with while loops, add numbers whose digit sum is between A and B, play the PUM game — then the diamond Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Solve four loop problems with while, swap, nested counters and digit sums, and print exactly what each statement asks.",
 successCriteria: [
 "Stop the sequence program when N or M is zero or less",
 "Swap N and M so the range always runs upward",
 "Draw the pyramid with spaces, stars and row counters",
 "Add numbers whose digit sum is between A and B",
 "Print N PUM lines that skip every fourth number",
 ],
 commonMistake:
 "Forgetting the break on zero keeps asking forever, and forgetting to swap when N is bigger than M gives an empty range. In shapes, mixing up the spaces and stars counters breaks the pyramid alignment.",
 sections: [
 s(
 "Problem 1: Sequence of Numbers and Sum",
 "Given multiple lines each line contains two numbers N and M.\nFor each line print a single line contains:\n• The numbers between N and M inclusive separated by single space.\n• The message \" sum =\".\n• The summation of all numbers between N and M inclusive.\nNote: The program should be TERMINATED as soon as any of these two numbers is less than or equal to zero and don't print any thing.\nInput\n• The input contains multiple lines.\n• Each line contains two numbers N and M (-100 ≤ N, M ≤ 100).\n• It's guaranteed that the last line of the input will contain a number that is less than or equal to zero.\nOutput\n• For each line print the answer according to the required above in a single line.\nPython idea\n• Use while True with N, M = map(int, input().split()), break when N <= 0 or M <= 0, swap when N > M, then for i in range(N, M + 1) printing each number and adding it to sum.\nExample\n• 5 2 gives 2 3 4 5 sum = 14\n• 5 9 gives 5 6 7 8 9 sum = 35\n• 1 10 gives 1 2 3 4 5 6 7 8 9 10 sum = 55",
 "# Problem 1: Sequence of Numbers and Sum\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 1: Solution",
 "Solution for Problem 1 — compare your answer:",
 'while True:\n    N, M = map(int, input().split())\n    if N <= 0 or M <= 0:\n        break\n    if N > M:\n        N, M = M, N\n    sum = 0\n    for i in range(N, M + 1):\n        print(i, end=" ")\n        sum += i\n    print("sum =", sum)'
 ),
 s(
 "Problem 2: Shape2",
 "Given a number N. Print a pyramid that has N rows.\nFor more clarification see the example below.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 99).\nOutput\n• Print the answer according to the required above.\nPython idea\n• Use outer while row < N with spaces = N - row - 1 printed first, then stars printed stars times, then print() for the next row, stars += 2 and row += 1.\nExample\n• Enter the number 5 gives:\n *\n ***\n *****\n *******\n*********",
 "# Problem 2: Shape2\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 2: Solution",
 "Solution for Problem 2 — compare your answer:",
 'N = int(input("Enter the number "))\nrow = 0\nstars = 1\nwhile row < N:\n    spaces = N - row - 1\n    while spaces > 0:\n        print(" ", end="")\n        spaces -= 1\n    count = 0\n    while count < stars:\n        print("*", end="")\n        count += 1\n    print()\n    stars += 2\n    row += 1'
 ),
 s(
 "Problem 3: Some Sums",
 "Given three numbers N, A, B. Print the summation of the numbers between 1 and N whose sum of digits is between A and B inclusive.\nInput\n• Only one line containing three numbers N, A, B (1 ≤ N ≤ 10^4, 1 ≤ A ≤ B ≤ 36).\nOutput\n• Print a single line contains the answer according to the required above.\nPython idea\n• Use while i <= N, compute each digit_sum with temp % 10 and temp //= 10, add i to answer when A <= digit_sum <= B, then i += 1.\nExample\n• 20 2 5 gives 84",
 "# Problem 3: Some Sums\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 3: Solution",
 "Solution for Problem 3 — compare your answer:",
 "N, A, B = map(int, input().split())\ni = 1\nanswer = 0\nwhile i <= N:\n    temp = i\n    digit_sum = 0\n    while temp > 0:\n        digit_sum += temp % 10\n        temp //= 10\n    if A <= digit_sum <= B:\n        answer += i\n    i += 1\nprint(answer)"
 ),
 s(
 "Problem 4: PUM",
 "Given a number N. Print N lines that describes PUM game.\nFor more clarification see the examples.\nInput\n• Only one line containing a number N (1 ≤ N ≤ 20).\nOutput\n• Print the answer according to the required above.\nPython idea\n• Use outer while row < N, inner while count < 3 printing num three times, then print PUM, skip the fourth number with num += 1, then row += 1.\nExample\n• Enter the number 5 gives:\n1 2 3 PUM\n5 6 7 PUM\n9 10 11 PUM\n13 14 15 PUM\n17 18 19 PUM",
 "# Problem 4: PUM\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Problem 4: Solution",
 "Solution for Problem 4 — compare your answer:",
 'N = int(input("Enter the number "))\nrow = 0\nnum = 1\nwhile row < N:\n    count = 0\n    while count < 3:\n        print(num, end=" ")\n        num += 1\n        count += 1\n    print("PUM")\n    num += 1\n    row += 1'
 ),
 s(
 "Home Work: Diamond",
 "Given a number N. Print a diamond that has 2N rows.\nFor more clarification see the example below.\nInput\n• Only one line containing number N (1 ≤ N ≤ 99).\nOutput\n• Print the answer according to the required above.\nPython idea\n• Draw the pyramid part like Problem 2, then draw it upside down: stars shrink by 2 each row until 1.\nExample\n• Input 4 gives 8 rows with 1, 3, 5, 7, 7, 5, 3, 1 stars.\nWrite your solution in the empty interpreter below — no solved answer here.",
 "# Home Work: Diamond\n# Input 4 gives 8 rows: 1, 3, 5, 7, 7, 5, 3, 1 stars\n# Write your solution here - no solved answer\n"
 ),
 ],
 challenge:
 "Home Work — Diamond. Given N (1 ≤ N ≤ 99), print a diamond with 2N rows. Try 4 gives 8 rows growing 1, 3, 5, 7 then shrinking 7, 5, 3, 1.",
 quiz: [
 q(
 "P1 with 5 2 prints?",
 [
 "2 3 4 5 sum = 14",
 "5 4 3 2 sum = 14",
 "2 3 4 5 sum = 15",
 "Nothing",
 ],
 0,
 "Swap makes the range run from 2 to 5, and 2+3+4+5 = 14."
 ),
 q(
 "When does the Problem 1 program stop?",
 [
 "When N or M is zero or less",
 "After one line",
 "When the sum is even",
 "Never",
 ],
 0,
 "The break runs as soon as either number is <= 0."
 ),
 q(
 "Shape2 with N = 5 — how many stars in the last row?",
 ["9", "5", "1", "10"],
 0,
 "Stars start at 1 and grow by 2 each row: 1, 3, 5, 7, 9."
 ),
 q(
 "Some Sums with 20 2 5 gives?",
 ["84", "20", "36", "210"],
 0,
 "2+3+4+5+11+12+13+14+20 = 84."
 ),
 q(
 "PUM with N = 2 — what is the second line?",
 [
 "5 6 7 PUM",
 "4 5 6 PUM",
 "2 3 4 PUM",
 "1 2 3 PUM",
 ],
 0,
 "The first line uses 1 2 3, 4 is skipped, so the second line is 5 6 7 PUM."
 ),
 ],
 },
 {
  id: "p6a",
  number: 16,
  month: 4,
  phase: 4,
 kind: "problem",
 title: "Printing and Accessing Lists",
 subtitle: "Group variables, store attendance, and read items",
 intro:
 "One box for a whole group. Turn many variables into one list with MyScores, use brackets and commas, measure length with len(), read items with index starting at 0, mix string, boolean and integer types, print the whole list, then Activities 1 to 4 and the allowed_users login Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Create lists with brackets and commas, measure them with len(), read and change items with index 0, and print string and boolean lists.",
 successCriteria: [
 "Build MyScores = [100, 150, 10, 50, 70] and tell items from length",
 "Use len() directly or stored in a variable",
 "Read the second item with [1] because index starts at 0",
 "Print names list and attendance list",
 "Change one item and build the allowed_users login check",
 ],
 commonMistake:
 "Starting counting at 1 instead of 0, so students[1] is the second item not the first. Forgetting brackets or commas, or using len without parentheses.",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Lists syntax in python\n2. Access items in lists\n3. List length with len() and index\n4. Types of items and printing\n5. Activities 1 to 4 + login Home Work"
 ),
 s(
 "2 — Lists in blocks? Variable vs List",
 "Lists store data like a variable.\n• Variable has: one name + one value.\n• List has: one name + more than one value.\nExample MyScores has 100, 150, 10, 50, 70 with length 5.\nEach value has a position number called index.",
 'MyScores = [100, 150, 10, 50, 70]\nprint(MyScores)\nprint(len(MyScores))'
 ),
 s(
 "3 — Lists syntax: brackets and commas",
 "Use square brackets [] and commas to make the list with name MyScores.",
 "MyScores = [100, 150, 10, 50, 70]"
 ),
 s(
 "4 — Items, elements and length",
 "List values are called items or elements. MyScores has 5 items.\nList length is the number of items.\n• [Ahmed, Ali, Samy, George] length is 4.\n• [30, 42, 10, 29, 34.2, 543] length is 6.",
 'names = ["Ahmed", "Ali", "Samy", "George"]\nprint(len(names))\nnumbers = [30, 42, 10, 29, 34.2, 543]\nprint(len(numbers))'
 ),
 s(
 "5 — Length with len() two ways",
 "Find length with len(). Store it in a variable then print it, or print it directly.",
 'MyScores = [100, 150, 10, 50, 70]\nlength = len(MyScores)\nprint(length)\nprint(len(MyScores))'
 ),
 s(
 "6 — Index starts from 0",
 "Each item has an index. Indices start from 0.\nMyScores = [100, 150, 10, 50, 70]\n100 is 0, 150 is 1, 10 is 2, 50 is 3, 70 is 4.",
 'MyScores = [100, 150, 10, 50, 70]\nprint(MyScores[0])\nprint(MyScores[1])\nprint(MyScores[4])'
 ),
 s(
 "7 — Types: string, boolean, integer and mixed",
 "Items can be any type and do not have to be the same type.\n• [2026, BMW, True, 12.2] has integer, string, boolean, float.",
 'names = ["Ahmed", "Ali", "Samy", "George"]\nattendance = [True, True, False, True]\nscores = [10, 20, 30, 40]\nmixed = [2026, "BMW", True, 12.2]\nprint(names)\nprint(attendance)\nprint(scores)\nprint(mixed)'
 ),
 s(
 "8 — Printing lists",
 "Print a list using its name inside print(). Output shows all items with brackets.\n\n🖼️ [IMAGE PLACEHOLDER: list as labeled boxes with indexes 0, 1, 2 — ارفعي الصورة هنا]",
 'MyScores = [100, 150, 10, 50, 70]\nprint(MyScores)'
 ),
 s(
 "Activity 1: questions into one list",
 "How many variables are there? Put them into one list with a suitable name. Write it and run it.\nquestion1 = 1 x 4, question2 = 2 x 10, question3 = 60 / 30, question4 = 30 x 60.",
 "# Activity 1: questions list\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 1: Solution",
 "Solution for Activity 1 — compare your answer:\n• 4 variables, one suitable name is questions.",
 'questions = ["1 x 4", "2 x 10", "60 / 30", "30 x 60"]\nprint(questions)'
 ),
 s(
 "Activity 2: names and attendance",
 "Make two lists, one for student names as strings, one for attendance as booleans. Print both.\nExpected: [Ahmed, Ali, Samy, George] then [True, True, False, True].",
 "# Activity 2: names and attendance\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 2: Solution",
 "Solution for Activity 2 — compare your answer:",
 'studentNames = ["Ahmed", "Ali", "Samy", "George"]\nattendance = [True, True, False, True]\nprint(studentNames)\nprint(attendance)'
 ),
 s(
 "Access items: the second item is [1]",
 "It is common to access some items rather than all of them. To get the second item use index 1.",
 'studentNames = ["Ahmed", "Ali", "Samy", "George"]\nprint(studentNames[1])'
 ),
 s(
 "Activity 3: assign an item to a variable",
 "You can assign any item to a new variable. Write it and run it. What is the output?",
 "# Activity 3: assign item\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 3: Solution",
 "Solution for Activity 3 — compare your answer:\n• Output is Ahmed because studentNames[0] is the first item.",
 'student = ""\nstudentNames = ["Ahmed", "Ali", "Samy", "George"]\nstudent = studentNames[0]\nprint(student)'
 ),
 s(
 "Activity 4: change an item",
 "You can change any item value. Write it and run it. Which item will be replaced with Samir?",
 "# Activity 4: change item\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 4: Solution",
 "Solution for Activity 4 — compare your answer:\n• Ali at index 1 is replaced with Samir.",
 'studentNames = ["Ahmed", "Ali", "Samy", "George"]\nstudentNames[1] = "Samir"\nprint(studentNames)'
 ),
 s(
 "Home Work: login system with allowed_users",
 "Build a simple login system.\n• allowed_users = [Ali, Sara, Noura, Ahmed].\n• Ask for username with input.\n• If it matches one item print Welcome! else print Access denied.\n• Try Ahmed gives Welcome!, Sara gives Welcome!, Hala gives Access denied.\nWrite your solution in the empty interpreter below — no solved answer here.",
 '# Home Work: login system\n# allowed_users = ["Ali", "Sara", "Noura", "Ahmed"]\n# Ask username, check with in, print Welcome! or Access denied.\n# Write your solution here - no solved answer\n'
 ),
 ],
 challenge:
 "Home Work — login with allowed_users = [Ali, Sara, Noura, Ahmed]. Ask username, print Welcome! if found else Access denied. Try Ahmed, Sara and Hala.",
 quiz: [
 q(
 "MyScores = [100, 150, 10, 50, 70] — what is len(MyScores)?",
 ["4", "5", "6", "70"],
 1,
 "Count the items: 100, 150, 10, 50, 70 is 5 items."
 ),
 q(
 "What is the index of the second item?",
 ["0", "1", "2", "The length"],
 1,
 "Python starts list indexes at zero, so second is 1."
 ),
 q(
 "studentNames[1] = Samir replaces which name?",
 ["Ahmed", "Ali", "Samy", "George"],
 1,
 "Index 1 is the second item Ali, it becomes Samir."
 ),
 q(
 "[2026, BMW, True, 12.2] contains which types?",
 [
 "Only integers",
 "Integer, string, boolean, float",
 "Only strings",
 "Only booleans",
 ],
 1,
 "List items do not have to be the same type."
 ),
 q(
 "allowed_users has Ahmed, username Hala prints?",
 ["Welcome!", "Access denied.", "Ahmed", "Nothing"],
 1,
 "Hala is not in the list, so it prints Access denied."
 ),
 ],
 },
 {
  id: "p6b",
  number: 17,
  month: 5,
  phase: 5,
 kind: "problem",
 title: "Loop Through Lists and List Methods",
 subtitle: "Print with for and while, then add, search and remove with methods",
 intro:
 "Make lists work for you. Print every subject one by one, replace 4 prints with for in and while with len(), see i as items vs indices, use append, insert, count, index, pop, remove, reverse, then Activity 5 shopping list and the teacher menu Home Work.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 learningGoal:
 "Loop through a list with for and while, and change it with append, insert, count, index, pop, remove, reverse and sort.",
 successCriteria: [
 "Print each item with for i in list and with while i < len(list)",
 "Tell i as items in for from i as indices in while",
 "Add with append at end and insert at position",
 "Search with count and index, remove with pop and remove",
 "Build shopping list with break on done and teacher menu 1/2/3",
 ],
 commonMistake:
 "Forgetting the : and indentation in for and while, forgetting i = i + 1 so while never ends, or mixing pop(index) with remove(value).",
 sections: [
 s(
 "1 — What You Will Learn Today",
 "Our roadmap today:\n1. Loop through lists\n2. List methods\n3. Exercises: Activity 1, 2, 3.1 to 3.7, 5 + Home Work"
 ),
 s(
 "Activity 1: print every item one by one",
 "This program prints every item one by one. How many print() are used?\n• 4 prints for 4 subjects.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nprint(subjectList[0])\nprint(subjectList[1])\nprint(subjectList[2])\nprint(subjectList[3])'
 ),
 s(
 "Activity 1: Solution",
 "Solution for Activity 1 — compare your answer:\n• 4 print() calls, one per index 0 to 3.\n• What if the list has 10 items or more? Writing print for each item is a waste of time and effort! Use a loop instead.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nprint(subjectList[0])\nprint(subjectList[1])\nprint(subjectList[2])\nprint(subjectList[3])'
 ),
 s(
 "2 — for loop with lists",
 "You can loop through the list using for in. Can you predict the output?\n• It prints Math, Physics, Social Science, English each on a line.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nfor i in subjectList:\n    print(i)'
 ),
 s(
 "3 — while loop with lists",
 "You can loop through the list using while with len() and an index counter.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\ni = 0\nwhile i < len(subjectList):\n    print(subjectList[i])\n    i = i + 1'
 ),
 s(
 "Activity 2: i as items vs indices",
 "Can you notice the difference?\n• In for, i values are the items one by one: Math, Physics, Social Science, English.\n• In while, i values are the indices one by one: 0, 1, 2, 3, used as subjectList[i].",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nfor i in subjectList:\n    print(i)\ni = 0\nwhile i < len(subjectList):\n    print(subjectList[i])\n    i = i + 1'
 ),
 s(
 "4 — Lists Methods toolkit",
 "Lists have special tools called methods to add, remove, sort, and search easily.\n• append adds at end, insert adds at position, count counts matches, index finds first position, pop removes by index, remove removes by value, reverse flips order, sort orders alphabetically.\n\n🖼️ [IMAGE PLACEHOLDER: toolbox cards for append, insert, pop, remove — ارفعي الصورة هنا]",
 'items = ["pen", "book", "pen"]\nitems.append("bag")\nitems.insert(1, "pencil")\nprint(items.count("pen"))\nprint(items.index("book"))\nitems.pop(0)\nitems.remove("pen")\nitems.reverse()\nprint(items)'
 ),
 s(
 "Activity 3.1: append",
 "Adds an item at the end of the list.\n• French is added after English.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nsubjectList.append("French")\nprint(subjectList)'
 ),
 s(
 "Activity 3.2: insert",
 "Adds an item in a specific position.\n• insert(2, Biology) puts Biology at index 2.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nsubjectList.insert(2, "Biology")\nprint(subjectList)'
 ),
 s(
 "Activity 3.3: count",
 "Returns how many times an item appears.\n• count(Math) is 1 here, triangle example count is 2.",
 'subjectList = ["Math", "Physics", "Social Science", "English"]\nprint(subjectList.count("Math"))'
 ),
 s(
 "Activity 3.4: index",
 "Returns the position of the first matching value.\n• Physics appears twice, index returns 1, the first one.",
 'subjectList = ["Math", "Physics", "Social Science", "English", "Physics"]\nprint(subjectList.index("Physics"))'
 ),
 s(
 "Activity 3.5: pop",
 "Removes a specific index.\n• pop(3) removes English at index 3.",
 'subjectList = ["Math", "Physics", "Social Science", "English", "Physics"]\nsubjectList.pop(3)\nprint(subjectList)'
 ),
 s(
 "Activity 3.6: remove",
 "Removes an item by its value.\n• remove(Social Science) deletes it wherever it is.",
 'subjectList = ["Math", "Physics", "Social Science", "English", "Physics"]\nsubjectList.remove("Social Science")\nprint(subjectList)'
 ),
 s(
 "Activity 3.7: reverse and sort",
 "reverse() flips the order. sort() orders alphabetically.\n• Slides typo fixed: reverse reverses, it does not remove by value.",
 'subjectList = ["Math", "Physics", "Social Science", "English", "Physics"]\nsubjectList.reverse()\nprint(subjectList)\nsubjectList.sort()\nprint(subjectList)'
 ),
 s(
 "Activity 5: shopping list",
 "Build a program that lets the user enter items one by one.\n• Create empty shoppingList.\n• while True: ask Add item, if done break, else append.\n• After loop print final list.\n• Try tomato, milk, eggs, flour, done.",
 "# Activity 5: shopping list\n# Write your code here - empty interpreter\n"
 ),
 s(
 "Activity 5: Solution",
 "Solution for Activity 5 — compare your answer:\n• Expected: tomato, milk, eggs, flour, done gives [tomato, milk, eggs, flour].",
 'shoppingList = []\nwhile True:\n    user = input("Add item:")\n    if user == "done":\n        break\n    else:\n        shoppingList.append(user)\nprint("your shopping list items are:", shoppingList)'
 ),
 s(
 "Home Work: teacher menu with reverse, sort, append",
 "Write a program for studentNames = [Ali, Adam, George, Nada, Dina, Fady].\n• Print the list.\n• Print menu: 1 Reverse, 2 Sort alphabetically, 3 Add new student.\n• Ask 1, 2 or 3. 1 uses reverse(), 2 uses sort(), 3 asks name and uses append(), else print not supported.\n• Test 2 gives sorted Adam, Ali, Dina, Fady, George, Nada. Test 3 with John adds John.\nWrite your solution in the empty interpreter below — no solved answer here.",
 '# Home Work: teacher menu\n# studentNames = ["Ali", "Adam", "George", "Nada", "Dina", "Fady"]\n# Print list, print menu 1/2/3, read choice, reverse / sort / append, else not supported\n# Write your solution here - no solved answer\n'
 ),
 ],
 challenge:
 "Home Work — teacher menu for [Ali, Adam, George, Nada, Dina, Fady]. Print list + menu, read 1/2/3, reverse, sort, or append new name, else not supported.",
 quiz: [
 q(
 "for i in subjectList prints what?",
 ["Indices 0-3", "Each item one by one", "Only the first", "Nothing"],
 1,
 "In for, i takes each item value one by one."
 ),
 q(
 "while i < len(subjectList) uses i as?",
 ["Items", "Indices 0,1,2,3", "Only len", "Only break"],
 1,
 "In while, i counts indices and reads subjectList[i]."
 ),
 q(
 "Which method adds French at the end?",
 ["append", "insert", "count", "pop"],
 0,
 "append adds one item at the end of the list."
 ),
 q(
 "subjectList.pop(3) removes what?",
 ["Value Social Science", "Index 3 English", "All items", "Nothing"],
 1,
 "pop removes the item at the given index."
 ),
 q(
 "Teacher chooses 2 in Home Work, what happens?",
 ["reverse", "sort alphabetically", "append John", "not supported"],
 1,
 "Choice 2 sorts the list with sort()."
 ),
 ],
 },
 {
  id: "p7a",
  number: 18,
  month: 5,
  phase: 5,
 kind: "problem",
 title: "Number and Text Checkers",
 subtitle: "Solve positive, parity, maximum, and character-count problems",
 intro:
 "Practice turning problem statements into small functions and clear conditions: positive or negative, even or odd, largest of three, and character occurrence.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
 sections: [
 s(
 "Positive or negative",
 "Cast the input to a number. Greater than zero is positive; less than zero is negative; zero is neither.",
 'number = float(input())\nif number > 0:\n    print("Positive")\nelif number < 0:\n    print("Negative")\nelse:\n    print("Zero")'
 ),
 s(
 "Even or odd",
 "The remainder number % 2 is zero for even integers and one for odd integers.",
 'number = int(input())\nprint("Even" if number % 2 == 0 else "Odd")'
 ),
 s(
 "Largest of three",
 "Read three numbers, compare them, and print the largest using max or conditions.",
 "a, b, c = map(float, input().split())\nprint(max(a, b, c))"
 ),
 s(
 "Count a character",
 "Loop through the text and count exact matches. Uppercase and lowercase are different.",
 "text = input()\ncharacter = input()\ncount = 0\nfor item in text:\n    if item == character:\n        count += 1\nprint(count)"
 ),
 s(
 "Homework: reuse a function",
 "Write suggest(name, birth_year), concatenate the values, return the username, and print it.",
 "def suggest(name, birth_year):\n return name + str(birth_year)\n\nname = input()\nyear = input()\nprint(suggest(name, year))"
 ),
 ],
 challenge:
 "Turn two checkers into reusable functions and test them with boundary values.",
 quiz: [
 q(
 "What does number % 2 show?",
 [
 "The remainder after division by 2",
 "The number doubled",
 "The number as text",
 "The largest number",
 ],
 0,
 "The remainder helps classify an integer as even or odd."
 ),
 q(
 "number = 0 prints?",
 ["Positive", "Negative", "Zero", "Even"],
 2,
 "Zero is neither positive nor negative."
 ),
 q(
 "The number 7 is?",
 ["Even", "Odd", "Zero", "Prime"],
 1,
 "7 % 2 is 1, so it is odd."
 ),
 q(
 "What is max(3.5, 9.1, 2.0)?",
 ["3.5", "9.1", "2.0", "14.6"],
 1,
 "max returns the largest of the three values."
 ),
 q(
 'Counting "A" inside "Sara" gives?',
 ["1", "0", "2", "4"],
 1,
 "Uppercase A is different from lowercase a."
 ),
 ],
 },
 {
  id: "p7b",
  number: 19,
  month: 5,
  phase: 5,
 kind: "problem",
  title: "Final Challenge: One Loop, Many Cases",
  subtitle: "Process repeated input until the stopping rule",
  intro:
  "Real judges give you many cases at once. You will read pairs of numbers line by line, solve the same rule for each pair, print one clean answer per line, and stop exactly at 0 0.",
 accent: "from-red-300/25 to-rose-200/10",
 heroImage: "/curriculum/session1/hero-coding-robot.jpg",
  sections: [
  s(
  "1 — One line is one case",
  "Each pair N and M describes one case. Solve it, print the result, then read the next pair. Example: 4 9 is one case, 2 2 is the next case."
  ),
  s(
  "2 — Worked example: print the larger number",
  "Read 4 9 and print 9. Read 2 2 and print 2. Same rule, applied again for every line until the stopping rule appears.",
  "n, m = 4, 9\nif n > m:\n    print(n)\nelse:\n    print(m)"
  ),
  s(
  "3 — Use a loop over input",
  "When input is provided line by line, split each line into numbers. Use a stopping rule such as 0 0 when the problem gives one.",
  "while True:\n    n, m = map(int, input().split())\n    if n == 0 and m == 0:\n        break\n    print(n + m)"
  ),
  s(
  "4 — Keep the output clean",
  "Competitive programming judges compare output exactly. Print only what the problem requests, without extra friendly text.\n\n🖼️ [IMAGE PLACEHOLDER: exact input vs exact output, side by side — ارفعي الصورة هنا]"
  ),
  s(
  "5 — Practice: sum or max?",
  "Change one line of the loop: print(n + m) gives the sum, while the larger-number rule from step 2 gives the max. Both use the same reading loop — only the solving line changes.",
  "# Practice: same loop, two jobs\n# Job A: print(n + m)\n# Job B: print the larger of n and m\n"
  ),
  ],
 challenge: "Change the solution to print the larger number from each pair.",
 quiz: [
 q(
 "Why do we need a stopping rule?",
 [
 "To make input colorful",
 "To know when cases end",
 "To remove numbers",
 "To avoid loops entirely",
 ],
 1,
 "The stopping rule tells the program there are no more cases."
 ),
  q(
  "Each input line represents?",
  [
  "One separate case",
  "The whole answer",
  "An error",
  "The stopping rule",
  ],
  0,
  "Solve it, print the result, then read the next pair."
  ),
 q(
 "The cases loop stops at?",
 ["0 0", "1 1", "0 1", "End of file only"],
 0,
 "The pair 0 0 means there are no more cases."
 ),
 q(
 "Judges compare output exactly — so print?",
 [
 "Only what is requested",
 "Extra friendly text",
 "Emojis",
 "The input back",
 ],
 0,
 "No extra labels or decorations in the output."
 ),
 q(
 "For the pair 4 9, the larger number is?",
 ["4", "9", "13", "0"],
 1,
 "9 is greater than 4."
 ),
 ],
 },
 {
  id: "p8",
  number: 20,
  month: 5,
  phase: 5,
 kind: "problem",
  title: "Coming Soon — Final Session",
  subtitle: "Reserved for the last lesson — content not added yet",
  intro:
  "This session is intentionally left empty. Add the final lesson content here later.",
 accent: "from-amber-300/25 to-orange-200/10",
 sections: [
  s(
  "1 — Coming soon",
  "Empty placeholder — the final lesson has not been added yet."
  ),
  ],
 challenge: "Coming soon.",
 quiz: [],
 },
];
const studioNotes: Record<
 string,
 {
 learningGoal: string;
 successCriteria: string[];
 commonMistake: string;
 }
> = {
 s1: {
 learningGoal:
 "Explain how a program turns a clear idea into small instructions, then read the output like feedback.",
 successCriteria: [
 "Describe a program in your own words",
 "Write and run a first print statement",
 "Use an error message as a clue",
 ],
 commonMistake:
 "Treating an error as failure instead of information about one specific line.",
 },
 s2: {
 learningGoal:
 "Use named variables to remember information, update it, and choose the right value type.",
 successCriteria: [
 "Create and update a variable",
 "Tell text, integer, float, and Boolean apart",
 "Choose readable names",
 ],
 commonMistake:
 "Putting the value on the left side of = or wrapping a variable name in quotes.",
 },
 s3: {
 learningGoal:
 "Combine arithmetic, comparisons, and Boolean logic to make a program calculate and decide.",
 successCriteria: [
 "Choose the correct math operator",
 "Predict a comparison result",
 "Combine conditions with and, or, and not",
 ],
 commonMistake: "Confusing = for assignment with == for comparison.",
 },
 s4: {
 learningGoal:
 "Collect an answer from the user, convert it safely, and respond with a useful result.",
 successCriteria: [
 "Ask a clear input question",
 "Convert text to int or float",
 "Test the interaction with more than one value",
 ],
 commonMistake:
 "Doing arithmetic on input text before converting it to a number.",
 },
 s5: {
 learningGoal:
 "Solve five math problems by translating formulas and output rules into Python.",
 successCriteria: [
 "Use π and exponentiation for circle area",
 "Extract the last digit with % 10",
 "Use a formula or loop for summation",
 "Use floor, ceil, and round correctly",
 "Reverse a percentage discount",
 ],
 commonMistake:
 "Printing a mathematically correct value with the wrong number of decimal places or forgetting that // is floor division.",
 },
 s6: {
 learningGoal:
 "Choose between independent if statements and one if/elif/else decision chain.",
 successCriteria: [
 "Explain why several if statements may print more than one result",
 "Use elif to stop after the first true condition",
 "Use else for unexpected or unmatched choices",
 "Build an attendance check and a juice menu",
 ],
 commonMistake:
 "Using separate if statements when only one choice should be printed, or forgetting else for an invalid menu choice.",
 },
 s7: {
 learningGoal:
 "Use comparisons and character methods to solve four decision problems.",
 successCriteria: [
 "Find minimum and maximum among three numbers",
 "Compare second names to detect brothers",
 "Distinguish digit, uppercase, and lowercase",
 "Convert lowercase to uppercase and vice versa",
 ],
 commonMistake:
 "Comparing the first names instead of the shared second name, or checking only one character case.",
 },
 s8: {
 learningGoal:
 "Solve five structured problems using digits, signs, coordinates, conversion, and sorting.",
 successCriteria: [
 "Read the first digit of a four-digit number",
 "Classify a point into a quadrant or axis",
 "Convert age in days to years, months, and days",
 "Print sorted values and original values",
 "Print the next lowercase alphabet character",
 ],
 commonMistake:
 "Solving the whole problem at once instead of checking special cases such as the origin and axes first.",
 },
 s9: {
 learningGoal:
 "Repeat a clear action with for and range(), controlling the start, stop, and step.",
 successCriteria: [
 "Use range() to repeat a known number of times",
 "Explain why the stop value is excluded",
 "Print stars, numbered steps, and attendance records",
 ],
 commonMistake:
 "Using range(1, 5) when 5 must be included, or forgetting that the loop variable changes each iteration.",
 },
 s10: {
 learningGoal:
 "Use loops to process numbers, find a maximum, print multiplication tables, calculate factorials, and check primes.",
 successCriteria: [
 "Track the largest value seen so far",
 "Generate a table from 1 through 12",
 "Calculate factorial including 0!",
 "Use a loop to test whether a number is prime",
 ],
 commonMistake:
 "Starting maximum with the wrong value, stopping a range too early, or forgetting that 0! equals 1.",
 },
 s11: {
 learningGoal:
 "Use loops and digit checks to generate divisors, identify lucky numbers, draw patterns, and read digits right to left.",
 successCriteria: [
 "Test divisibility with the remainder operator",
 "Recognize numbers made only from 4 and 7",
 "Build growing and shrinking star patterns",
 "Reverse digit order for repeated test cases",
 ],
 commonMistake:
 "Using the wrong range endpoint or checking lucky numbers without examining every digit.",
 },
 s12: {
 learningGoal:
 "Use while loops to repeat until a condition changes, with counters, password checks, and order loops.",
 successCriteria: [
 "Change a counter so the loop can end",
 "Count upward and downward with while",
 "Repeat password attempts until success",
 "Use a sentinel answer to finish restaurant orders",
 ],
 commonMistake:
 "Forgetting to update the loop condition, which creates an infinite loop.",
 },
  p4: {
  learningGoal:
  "Use while loops with % 10 and // 10 to check passwords, print digits right to left, reverse numbers, and test palindromes.",
  successCriteria: [
  "Stop a password loop with break on 1999",
  "Print digits right to left, including 0",
  "Build reverse with reverse * 10 + digit",
  "Compare the number with its reverse for YES or NO",
  "Add all digits for the Home Work",
  ],
  commonMistake:
  "Forgetting break after Correct (infinite loop), or looping directly on N and losing the original value — copy it to temp first.",
  },
  p5a: {
  learningGoal:
  "Control loops precisely: run code inside the loop body, stop early with break, and skip one step with continue.",
  successCriteria: [
  "Count which lines run inside each loop body",
  "Use if inside a loop for conditional steps",
  "Stop password tries and the guessing game with break",
  "Skip one value or an empty name with continue",
  ],
  commonMistake:
  "Putting break or continue at the wrong indentation, so the wrong loop or the wrong iteration is affected.",
  },
  p5b: {
  learningGoal:
  "Build sequences, shapes, and games with loops: print ranges with sums, draw pyramids and diamonds, filter by digit sums, and play PUM.",
  successCriteria: [
  "Print each N-to-M sequence with its sum until 0 stops you",
  "Draw centered pyramids and diamonds with spaces and stars",
  "Add numbers whose digit sum is between A and B",
  "Print 3 numbers + PUM on every line",
  ],
  commonMistake:
  "Stopping the sequence one number early, misaligning pyramid spaces, or printing PUM on the wrong lines.",
  },
 p6a: {
 learningGoal:
 "Create lists with brackets and commas, measure them with len(), read and change items with index 0, and print string and boolean lists.",
 successCriteria: [
 "Build MyScores = [100, 150, 10, 50, 70] and tell items from length",
 "Use len() directly or stored in a variable",
 "Read the second item with [1] because index starts at 0",
 "Print names list and attendance list",
 "Change one item and build the allowed_users login check",
 ],
 commonMistake:
 "Starting counting at 1 instead of 0, so students[1] is the second item not the first. Forgetting brackets or commas, or using len without parentheses.",
 },
 p6b: {
 learningGoal:
 "Loop through a list with for and while, and change it with append, insert, count, index, pop, remove, reverse and sort.",
 successCriteria: [
 "Print each item with for i in list and with while i < len(list)",
 "Tell i as items in for from i as indices in while",
 "Add with append at end and insert at position",
 "Search with count and index, remove with pop and remove",
 "Build shopping list with break on done and teacher menu 1/2/3",
 ],
 commonMistake:
 "Forgetting the : and indentation in for and while, forgetting i = i + 1 so while never ends, or mixing pop(index) with remove(value).",
 },
  p7a: {
  learningGoal:
  "Turn small checks into reusable functions with parameters and return: positive/negative, even/odd, largest of three, and character counting.",
  successCriteria: [
  "Classify a number as positive, negative, or zero",
  "Test even vs odd with % 2",
  "Return the largest of three values",
  "Count how many times a character appears",
  "Reuse one function with different arguments",
  ],
  commonMistake:
  "Printing inside the function instead of returning the value, so the caller cannot reuse the result.",
  },
 p7b: {
 learningGoal:
 "Treat every input line as a separate case, apply the same algorithm, and stop cleanly at the terminator.",
 successCriteria: [
 "Parse each pair",
 "Solve and print one case at a time",
 "Keep output exactly as requested",
 ],
 commonMistake:
 "Adding friendly labels to output that an automatic judge expects to be only numbers.",
 },
};
const addStudioNotes = (
 lesson: CurriculumLesson,
 index: number
): CurriculumLesson => {
 const note = studioNotes[lesson.id] ?? {
 learningGoal: `Build confidence with ${lesson.title.toLowerCase()} by breaking the idea into small, testable steps.`,
 successCriteria: [
 "Explain the main idea",
 "Follow the example and change one part",
 "Solve the practice challenge and test an edge case",
 ],
 commonMistake:
 "Trying to write the whole solution at once instead of testing one small step at a time.",
 };
 return {...lesson,...note };
};
export const allPythonLessons = [...coreLessons,...problemSolvingLessons].map(
 addStudioNotes
);
export const coreLessonsWithStudio = allPythonLessons.filter(
 lesson => lesson.kind === "core"
);
export const problemSolvingLessonsWithStudio = allPythonLessons.filter(
 lesson => lesson.kind === "problem"
);
export const curriculumPhases = [
 {
 id: 1,
 month: 1,
 en: "Python Foundations",
 meta: "Sessions 1–4",
 color: "from-sky-300 to-blue-400",
 },
 {
 id: 2,
 month: 2,
 en: "Formulas and Decisions",
 meta: "Sessions 5–8",
 color: "from-emerald-300 to-green-400",
 },
 {
 id: 3,
 month: 3,
 en: "For Loops and Repetition",
 meta: "Sessions 9–12",
 color: "from-violet-300 to-purple-400",
 },
  {
  id: 4,
  month: 4,
  en: "Applied Loops Practice",
  meta: "Sessions 13–16",
  color: "from-red-300 to-rose-400",
  },
  {
  id: 5,
  month: 5,
  en: "Lists and Final Challenge",
  meta: "Sessions 17–20",
  color: "from-amber-300 to-orange-400",
  },
];
