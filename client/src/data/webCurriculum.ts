import {
  q,
  s,
  type CurriculumLesson,
  type CurriculumPhase,
} from "./curriculum";
import { htmlLessons } from "./htmlCurriculum";
import { cssLessons } from "./cssCurriculum";

export type WebTrack = "HTML" | "CSS" | "JavaScript";
export type WebLesson = CurriculumLesson<WebTrack>;

export const WEB_TRACKS: WebTrack[] = ["HTML", "CSS", "JavaScript"];

/** Months covered by the track. Drives the badge on every session. */
export const WEB_MONTHS = 6;

/** The JavaScript mark, the cover of every session in the track. */
const JS_HERO = "https://res.cloudinary.com/alhiemg0/image/upload/js-logo.png";

/** The JavaScript sessions, the last stretch of the Web course. */
const jsLessons: WebLesson[] = [
  {
    id: "js-1",
    number: 13,
    month: 5,
    phase: 3,
    kind: "JavaScript",
    title: "JavaScript Basics: Making the Page React",
    subtitle: "What JavaScript is, where to write it, and your first variables",
    intro:
      "HTML gives a page its structure and CSS gives it its colors. JavaScript is the third language of the front end, and the one that makes a page react. In this session you write your first script, print to the console, change the text the visitor sees, and store values in variables.",
    accent: "from-amber-500/20 to-orange-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Say what JavaScript is, pick the right place to write it, print to the console, change the page with innerHTML, and declare variables with names JavaScript accepts.",
    successCriteria: [
      "Name the three people behind the web: Berners-Lee made the first page, Mosaic was the first browser, Netscape shipped JavaScript",
      "Put a script in a script tag, inline on a button, or in a separate file, and say which one to use in a finished site",
      "Print a message with console.log and find the console with right-click then Inspect",
      "Change a heading on the page with document.getElementById and innerHTML",
      "Declare a variable in lower case with no spaces in the name",
    ],
    commonMistake:
      "JavaScript reads upper and lower letters as different characters, so myName and MyName are two different variables. A name cannot hold a space either — write myName, never my name.",
    sections: [
      s(
        "1 — What You Will Learn Today",
        "Our plan today:\n1. What JavaScript is\n2. Who made it, and the name ECMAScript\n3. Why a website needs JavaScript\n4. Where to write it: script tag, inline, or a separate file\n5. Printing with console.log and alert\n6. Running the page and opening the console\n7. Semicolons, case, and comments\n8. Variables and data types",
        undefined,
        ["https://res.cloudinary.com/alhiemg0/image/upload/js-versions-timeline.png"]
      ),
      s(
        "2 — What Is JavaScript?",
        "JavaScript is the language the browser runs. It is the layer that turns a page from something you read into something you use.\nThe first web page was made by Tim Berners-Lee. Mosaic was the first browser people could download, and Netscape became the browser everyone used.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/history-tim-berners-lee.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/history-first-web-page.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/history-mosaic.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/history-netscape.png",
        ]
      ),
      s(
        "3 — Who Made JavaScript?",
        "JavaScript was written by Brendan Eich and shipped with Netscape. The language itself is standardised by ECMA, so its official name is ECMAScript — that is why the same language turns up as JavaScript, as JS, and as ES followed by a number.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/history-brendan-eich.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/js-versions-timeline.png",
        ]
      ),
      s(
        "4 — Why Use JavaScript?",
        "HTML can only show a page. JavaScript is what makes it useful:\n— Interaction — buttons, menus, sliders, games\n— Validation — checking an email or a password before the form is sent\n— Sending and receiving data — loading new content without refreshing the page\n\nNone of these three can be done with HTML or CSS on their own."
      ),
      s(
        "5 — Where to Write JavaScript",
        "There are three places to write a script, and the third one is the one you use in real work.\n1. Inside a script tag in the page\n2. Inline, straight on an element such as a button\n3. In an external file, linked from the page",
        '<!DOCTYPE html>\n<html>\n  <head>\n    <script src="./js/index.js"></script>\n  </head>\n  <body>\n    <h1 id="Demo"></h1>\n  </body>\n</html>',
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/script-tag.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/inline-script.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/external-script.png",
        ]
      ),
      s(
        "6 — Printing: console.log and alert",
        "console.log() writes into the console panel of the browser. It never blocks the page, so it is the tool you will use most.\nwindow.alert() opens a small box on top of the page and waits until you press OK.\nBoth accept double quotes and single quotes — the two spell the same text.",
        'window.alert("Hello");\n\nwindow.alert(\'Hello\');\n\nconsole.log("Errooooooooooor");'
      ),
      s(
        "7 — Run the Page and Read the Console",
        "1. Right-click anywhere on the page.\n2. Choose Inspect.\n3. Click the Console tab.\n4. Everything you printed with console.log appears there, one line per call.\n\nRefresh the page after you change the file. The browser keeps the copy it loaded, so a save on its own changes nothing on the screen.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/js-inspect-menu.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/devtools-tabs.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/run-in-browser.png",
        ]
      ),
      s(
        "8 — Change the Page With innerHTML",
        "The console shows text to you alone. To change what the visitor sees, you find the element and write into it.\nGive the element an id, find it with document.getElementById(), then assign the new text to innerHTML.",
        'document.getElementById("Demo").innerHTML = "Hello world";'
      ),
      s(
        "9 — Semicolons, Case, and Comments",
        "— Semicolon — end a statement with ;\n— Case — JavaScript treats upper and lower letters as different characters\n— Comment — everything after // on a line is a note for the reader, and the browser ignores it\n\nA commented line does not run, which makes it the quickest way to stop a line without deleting it.",
        '// document.getElementById("Demo").innerHTML = "Hello world";'
      ),
      s(
        "10 — Variables",
        "A variable is a name that holds a value. Declare it with var, then give it something to remember.\nThe name has rules: letters, digits, _ and $ only, and it cannot start with a digit. No spaces, so my name is written myName.",
        'var name = "safaa";'
      ),
      s(
        "11 — Loose Typing and Data Types",
        'JavaScript is loosely typed and dynamic: a variable can hold a number now and text later, and the type follows whatever you last put in it.\n— number — 120, 55265487, 5.699\n— string — \'safaa\', "ahamd"\n— boolean — true, false\n— undefined — a variable declared with no value, as in var z;\n— null — an intentional empty value\n\nDeclaring and assigning are two steps. var y; only declares, and y = "amro"; only assigns.',
        'var x = 50;\n\nvar y;      // Declaration\ny = "amro"; // Assignment\n\nvar c = null;\n\nconsole.log(y);'
      ),
      s(
        "12 — Practice: Fix the Names",
        "Read each line and say why it fails, then write the line the correct way.\n1. var @name = 'safaa';\n2. var 5name = 'safaa';\n3. var docummnet = 'safaa';\n4. var my name = 'safaa';",
        'var myName = "safaa";\nconsole.log(myName);',
        undefined,
        "// Four names are wrong on purpose.\n// Rewrite them, then print the value of myName.\n",
        'var myName = "safaa";\nvar docummnet = "ahamd";\n\nconsole.log(myName);'
      ),
    ],
    quiz: [
      q(
        "Who wrote JavaScript?",
        [
          "Brendan Eich, in 1995",
          "Tim Berners-Lee, in 1989",
          "Brendan Eich, in 1989",
          "Tim Berners-Lee, in 1995",
        ],
        0,
        "Tim Berners-Lee built the first web page. Brendan Eich created JavaScript for Netscape in 1995."
      ),
      q(
        "JavaScript follows a written standard. What is it called?",
        ["ECMAScript", "Netscript", "Webscript", "HTMLscript"],
        0,
        "ECMA standardises the language, which is why the versions are written ES1, ES6, ES2020."
      ),
      q(
        'Which line changes the heading with id="Demo" so it reads Hello world?',
        [
          'document.getElementById("Demo").innerHTML = "Hello world";',
          'console.log("Demo") = "Hello world";',
          "var Demo = getElementById.innerHTML;",
          'alert(innerHTML = "Hello world");',
        ],
        0,
        "innerHTML holds the text inside an element, so assigning to it replaces what the visitor sees."
      ),
      q(
        "Where does the script belong in a finished website?",
        [
          "In an external file, linked with a script tag",
          "Inside the title tag",
          "As plain text inside the body",
          "In the CSS file",
        ],
        0,
        "One external file keeps the HTML readable and lets you change the script without touching the page."
      ),
      q(
        "What does // at the start of a line do?",
        [
          "Writes a comment that the browser ignores",
          "Divides the line into two halves",
          "Starts a new statement",
          "Prints the line in the console",
        ],
        0,
        "A comment is a note for whoever reads the file. The browser skips it completely."
      ),
    ],
  },
  {
    id: "js-2",
    number: 14,
    month: 5,
    phase: 3,
    kind: "JavaScript",
    title: "Operators, Prompt, and Decisions",
    subtitle:
      "Arithmetic and comparison operators, reading input, and if / else",
    intro:
      "This session is about a program that answers back. You work with values using operators, read what the visitor types with prompt(), then choose what to print with a conditional statement.",
    accent: "from-amber-500/20 to-orange-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Add, subtract, multiply and divide, tell value from type when comparing, read input with prompt(), and choose between outcomes with if, else if and else.",
    successCriteria: [
      "Explain why 5 / 10 prints 0.5 while 5 - 10 prints -5",
      "Say that two strings join with + and never add",
      "Wrap a prompt() value in Number() before you do arithmetic on it",
      "Write an if / else if / else chain with more than one branch",
    ],
    commonMistake:
      'prompt() hands back text even when the visitor types digits, so "12" + "9" is 129 and not 21. Put Number() around both values before you add them.',
    sections: [
      s(
        "1 — What You Will Learn Today",
        "Our plan today:\n1. Arithmetic operators\n2. Concatenation, and the error that comes with it\n3. Implicit conversion with Number()\n4. Comparison operators\n5. Reading the visitor with prompt()\n6. The if statement\n7. else if and else"
      ),
      s(
        "2 — Arithmetic Operators and Concatenation",
        "The four arithmetic operators are + - * and /.\nTwo strings joined with + are glued together with no space between them. For + to add, both sides must be numbers — if either side is text, the result is text.",
        '// arithmetic oprators  => + - * /\nconsole.log(5 + 10); // 15\nconsole.log(5 - 10); // -5\nconsole.log(5 * 10); // 50\nconsole.log(5 / 10); // 0.5\n\n// concatenation (string + string)\nconsole.log("Safaa" + "Ehab"); // SafaaEhab\n\n// Error\nconsole.log("Safaa" + 5);'
      ),
      s(
        "3 — Implicit Conversion With Number()",
        'When an operator meets a number and text, JavaScript quietly converts the text on its own. This is called implicit conversion, and Number() shows you what it decided.\n— Number("2") = 2\n— Number(true) = 1\n— Number(false) = 0\n— Number("") = 0\n— Number(" ") = 0\n— Number("Safaa") = NaN, which means not a number',
        'console.log(10 * "2");\nconsole.log(10 * true);\nconsole.log(10 * false);\nconsole.log(10 * "");\nconsole.log(10 * " ");\nconsole.log(10 * "Safaa");'
      ),
      s(
        "4 — Comparison Operators",
        'A comparison answers with true or false, and that answer is what a conditional statement runs on.\n— = assigns a value\n— == compares the value only\n— === compares the value and the type\n— != is not equal to\n— >= and <= are greater or equal, and less or equal\n\nFor x = 20, x == "20" is true, while x === "20" is false because one side is a number and the other is text.',
        'var x = 20;\nconsole.log(x == 20);  // Value  - True\nconsole.log(x == "20"); // Value  - True\nconsole.log(x === 20); // Value &Type - True\nconsole.log(x === "20"); // Value &Type - False\n\nconsole.log(x != 20); // False\nconsole.log(x >= 20); // True\nconsole.log(x <= 10); // False'
      ),
      s(
        "5 — Reading the Visitor With prompt()",
        "window.prompt() opens a small box with a text field and waits for an answer. Whatever the visitor types comes back as text.\nThat is why num1 + num2 glues the two answers together. Wrap each one in Number() and the same line adds them.",
        'var num1 = window.prompt("Enter the first Number");\nvar num2 = window.prompt("Enter the second Number");\n\nconsole.log(num1);\nconsole.log(num2);\n\n// concatination == string\nconsole.log(num1 + num2);\n\n// pluse\nconsole.log(Number(num1) + Number(num2));',
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/prompt.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/prompt-in-browser.png",
        ]
      ),
      s(
        "6 — The if Statement",
        "An if statement runs its block only when the condition is true. The condition goes inside round brackets, and the block goes inside curly brackets.\nThe else catches everything the if did not, so exactly one of the two branches always runs.",
        'var age = 22;\n\nif (age > 18) {\n  console.log("Hello ");\n} else {\n  console.log("No Hello");\n}'
      ),
      s(
        "7 — else if and else",
        "When you have more than two possible answers, chain the branches with else if. JavaScript reads them from the top and stops at the first one that is true, so the order matters — put the narrowest condition first and the last else catches the rest.",
        'var skill = "js";\n\nif (skill == "js") {\n  console.log("Front End ");\n} else if (skill == "PHP") {\n  console.log("Back End");\n} else if (skill == "Python") {\n  console.log("AI");\n} else {\n  console.log("Kick out");\n}'
      ),
      s(
        "8 — Practice: The Larger of Two",
        "Write a program that reads two numbers from the visitor and prints the larger one. Read them with prompt(), and remember that what comes back is text.",
        undefined,
        undefined,
        "// 1. Read two numbers with prompt()\n// 2. Compare them\n// 3. Print the larger one\n",
        'var num1 = Number(window.prompt("Enter the first number"));\nvar num2 = Number(window.prompt("Enter the second number"));\n\nif (num1 > num2) {\n  console.log(num1);\n} else {\n  console.log(num2);\n}'
      ),
    ],
    quiz: [
      q(
        "What does console.log(5 / 10) print?",
        ["0.5", "15", "50", "-5"],
        0,
        "The / operator divides, and 5 out of 10 is one half."
      ),
      q(
        'What does console.log("Safaa" + "Ehab") print?',
        ["SafaaEhab", "Safaa Ehab", "0", "NaN"],
        0,
        "Two strings are joined by +, with no space inserted between them."
      ),
      q(
        "The visitor types 12 in a prompt box. What type comes back?",
        [
          "A string, so wrap it in Number() to add it",
          "A number, ready to use",
          "A boolean",
          "undefined",
        ],
        0,
        'prompt() always returns text. Number("12") is what turns it into 12.'
      ),
      q(
        "With x = 20, which comparison is false?",
        ['x === "20"', "x == 20", "x === 20", "x >= 20"],
        0,
        '=== compares the value and the type, and 20 is a number while "20" is text.'
      ),
      q(
        "In an if / else if / else chain, which branch runs when the first two conditions are false?",
        ["The final else", "The first if", "Every branch", "None of them"],
        0,
        "JavaScript stops at the first true condition, and the last else catches the rest."
      ),
    ],
  },
  {
    id: "js-3",
    number: 15,
    month: 5,
    phase: 3,
    kind: "JavaScript",
    title: "Loops: Repeating Work Without Repeating Text",
    subtitle: "for and while, and sending the result into the page",
    intro:
      "The first tool that changes how much code you write. A loop repeats a block without repeating the text, and once you can count, you can build things no one has hand-written.",
    accent: "from-amber-500/20 to-orange-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Repeat a block with for and while, write the counter so the loop stops, and send the result of each turn into the page instead of the console.",
    successCriteria: [
      "Write a for loop with a starting value, a condition, and the step that moves it",
      "Write a while loop and remember that forgetting the step makes it run forever",
      "Say which of the three parts of a for loop is the one that stops it",
      "Append to an element with += instead of replacing it with =",
    ],
    commonMistake:
      "A for loop that never changes its counter runs until the tab freezes. The same is true of a while loop without its x++ step, because the condition never becomes false.",
    sections: [
      s(
        "1 — What You Will Learn Today",
        "Our plan today:\n1. The for loop\n2. The while loop\n3. Sending loop output into the page\n4. Practice: print every number from 1 to n"
      ),
      s(
        "2 — The for Loop",
        "A for loop repeats a block a set number of times. It takes three parts, separated by semicolons: where the counter starts, the condition that keeps it going, and the step that moves the counter.\nHere the counter starts at 0, runs while it is below 10, and grows by one each time — so the block runs ten times.",
        '// for loop\nfor (var index = 0; index < 10; index++) {\n  console.log("Hello");\n  console.log("Bye");\n}'
      ),
      s(
        "3 — The while Loop",
        "A while loop keeps running as long as its condition is true. The counter is declared before the loop and moved inside the block.\nIf the step is missing, the condition stays true and the page stops responding.",
        '// while loop\nvar x = 0;\nwhile (x < 10) {\n  console.log("hello");\n  console.log("Bye");\n\n  x++;\n}'
      ),
      s(
        "4 — Sending Loop Output Into the Page",
        "The same loop can write into the page instead of the console. Note the += : it appends to what is already inside the element, so each turn adds one more heading.",
        'var cartona = "";\n\nfor (var i = 0; i < 100; i++) {\n  console.log("Hello");\n  document.getElementById("Demo").innerHTML += "<h1>Hello World</h1>";\n}'
      ),
      s(
        "5 — Practice: Every Number From 1 to n",
        "Ask the visitor for a number, then print every number from 1 up to it — one line each.\nExample: input 5, output 1, 2, 3, 4, 5.\nRead the number the way you did last session: prompt() hands back text, so wrap it in Number() before you compare it.",
        undefined,
        undefined,
        "// 1. Read a number from the visitor with prompt()\n// 2. Wrap it in Number()\n// 3. for loop: print 1, 2, 3 ... up to that number\n",
        'var limit = Number(window.prompt("Print numbers up to"));\n\nfor (var i = 1; i <= limit; i++) {\n  console.log(i);\n}'
      ),
    ],
    quiz: [
      q(
        "How many times does the block run in for (var index = 0; index < 10; index++) ?",
        ["9 times", "10 times", "11 times", "Once"],
        1,
        "The counter starts at 0 and stops before it reaches 10, so it takes the values 0 to 9."
      ),
      q(
        "What is missing when a while loop never ends?",
        [
          "The condition",
          "The curly brackets",
          "console.log",
          "The step that changes the counter",
        ],
        3,
        "Without the step the condition stays true, so the loop keeps running and the tab freezes."
      ),
      q(
        'What does += do inside document.getElementById("Demo").innerHTML += ... ?',
        [
          "Deletes the element",
          "Creates a new element",
          "Adds to the text already in the element",
          "Runs the line once",
        ],
        2,
        "A single = replaces the content, while += appends to it."
      ),
      q(
        "Which part of for (var index = 0; index < 10; index++) is what finally stops the loop?",
        ["var index = 0", "index < 10", "the two semicolons", "index++"],
        1,
        "The condition is checked before every turn, and the loop ends the moment it comes back false."
      ),
    ],
  },
  {
    id: "js-3b",
    number: 16,
    month: 5,
    phase: 3,
    kind: "JavaScript",
    title: "Functions: Naming a Job So You Can Run It Again",
    subtitle: "declare a function, call it, and give it parameters",
    intro:
      "The second tool that changes how much code you write. A function gives a name to a job, so the steps are written once and can be run again from anywhere with different values.",
    accent: "from-amber-500/20 to-orange-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Turn a block of code into a named function, call it by writing its name and brackets, and give it parameters so the same body works on any values.",
    successCriteria: [
      "Call a function by writing its name and brackets",
      "Say that nothing runs until a function is called",
      "Give a function two parameters and pass two different values to it",
      "Call the same function twice and get a different answer each time",
    ],
    commonMistake:
      "Writing a function does not run it. Nothing appears until the name and the brackets are written below it — a function with no call is a note, not a program.",
    sections: [
      s(
        "1 — What You Will Learn Today",
        "Our plan today:\n1. The same average, written twice\n2. Your first function\n3. Functions that take values\n4. Practice: the power function"
      ),
      s(
        "2 — The Same Average, Written Twice",
        "Finding an average takes three lines. Here they are written once for x and y, then again for x1 and y2. The steps never change, only the numbers.\nThe second copy is the problem: it is the same job with different names. When you notice that, it is time for a function.",
        "var x = 10;\nvar y = 20;\n\nvar sum = x + y;\nvar avg = sum / 2;\n\nconsole.log(avg);\n\nvar x1 = 40;\nvar y2 = 60;\n\nvar sum1 = x1 + y2;\nvar avg1 = sum1 / 2;\n\nconsole.log(avg1);"
      ),
      s(
        "3 — Your First Function",
        "A function is a named block of code. You write it once with function and the name, then run it any time by writing the name and brackets. Nothing happens until you call it.",
        'function SayHello() {\n  console.log("Hello");\n}\n\nSayHello()'
      ),
      s(
        "4 — Functions That Take Values",
        "The average is now a function that takes the two numbers as parameters. You call it with any pair you like and it does the same three steps each time.\nThe body never changes, only the values that arrive at the parameters.",
        "function GetAvg(x, y) {\n  var sum = x + y;\n  var avg = sum / 2;\n\n  console.log(avg);\n}\n\nGetAvg(10, 20);"
      ),
      s(
        "5 — Practice: The Power Function",
        "Raise the first number to the power of the second: input 4 and 3, output 64, because 4^3 = 4 * 4 * 4.\nWrite it as a function called Power that takes the two numbers, then call it with 4 and 3. You already have the loop you need — it goes inside the function.",
        undefined,
        undefined,
        "// Write a function that takes two integers\n// and prints the first raised to the power of the second.\n",
        "function Power(base, times) {\n  var result = 1;\n  for (var i = 0; i < times; i++) {\n    result = result * base;\n  }\n  console.log(result);\n}\n\nPower(4, 3);"
      ),
    ],
    quiz: [
      q(
        "When does a function actually run?",
        [
          "The moment you write it",
          "When you call it by writing its name and brackets",
          "When the page loads",
          "Only inside a loop",
        ],
        1,
        "Writing a function stores the steps. Calling it is what runs them."
      ),
      q(
        "In function GetAvg(x, y), what are x and y?",
        [
          "The answer the function prints",
          "Two different functions",
          "Comments",
          "Parameters — the values the function is given",
        ],
        3,
        "Parameters are the names in the brackets. GetAvg(10, 20) fills them with 10 and 20."
      ),
      q(
        "You call GetAvg(10, 20) and then GetAvg(100, 200). What changes?",
        [
          "Nothing — a function only ever gives the first answer",
          "Only the answer",
          "The body of the function",
          "The name of the function",
        ],
        1,
        "The body is the same every time; the values arriving at the parameters are what change."
      ),
      q(
        "What does a function with no call after it do?",
        [
          "It runs once when the page loads",
          "It runs in a loop",
          "Nothing at all",
          "It prints its own name",
        ],
        2,
        "The steps are stored and never reached, so the console stays empty."
      ),
    ],
  },
  {
    id: "js-4",
    number: 17,
    month: 6,
    phase: 4,
    kind: "JavaScript",
    title: "Project: Quote of the Day",
    subtitle: "A dark card that shows a new quote every time the button is clicked",
    intro:
      "This session is a full project. You build the Quote of the Day page: a dark card, a heading, one line telling the visitor what to do, a button, and two empty lines for the quote and the author. Every press of the button shows a different quote, and the page never reloads.",
    accent: "from-rose-500/20 to-red-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Build the Quote of the Day page: keep the quotes as objects, pick one at random, stop it repeating the one already on screen, and write the quote and its author into the page on every click.",
    successCriteria: [
      "Lay out the card, the heading, the instruction line and the button in the right order",
      "Keep the quotes in an array of objects, each with a text and an author",
      "Pick one with Math.floor(Math.random() * quotes.length)",
      "Stop the same quote from appearing twice in a row",
      "Write both the quote and the author into the page with innerHTML",
    ],
    commonMistake:
      "Math.random() returns a decimal such as 0.4172, and that is not an array index. Multiply it by quotes.length and round the result before you use it.",
    sections: [
      s(
        "1 — The Finished Page",
        "This is the page you are building. Nothing moves until the button is pressed, and the quote starts completely empty — the whole work is in what happens on the click.",
        undefined,
        ["https://res.cloudinary.com/alhiemg0/image/upload/random-quote-app.png"]
      ),
      s(
        "2 — What the Page Needs",
        "Six parts, and only the last one is JavaScript.\n1. The Bootstrap stylesheet, linked from the head\n2. Your own rules — a reset, and the gradient on the card\n3. The heading — Quote of the Day\n4. The instruction line — Press the button below to receive a random quote!\n5. The button — New Quote\n6. Two empty lines, one for the quote and one for the author\n\nEverything up to the button is HTML and CSS. Choosing a quote, writing it into those two lines, and never showing the same one twice is the script."
      ),
      s(
        "3 — The Look: Bootstrap and the Card",
        "Bootstrap is a stylesheet someone else already wrote. Link it and the page arrives with a card, a button and a dark background, and every class name in the HTML comes from it.\nYour own rules go in a style tag underneath. The reset starts every element from zero so nothing adds itself on top, and the card is given the gradient: linear-gradient() takes two colours and fades from the first to the second.\nThe preview beside this shows one card with that rule on it, so you can see the gradient before you build the whole page.",
        '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"\n      rel="stylesheet"\n      integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"\n      crossorigin="anonymous">\n\n<style>\n  *,\n  *::after,\n  *::before {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n  }\n\n  .card-body {\n    background: linear-gradient(#0d2d68, rgba(0, 153, 204, 0.779));\n  }\n</style>\n\n<div class="card-body p-5 text-center">\n  <h1 class="fs-1 fw-bold text-light">Quote of the Day</h1>\n  <p class="text-light fw-lighter">Press the button below to receive a random quote!</p>\n</div>'
      ),
      s(
        "4 — The HTML of the Page",
        "Write this into index.html and open it in the browser. The card is already in the right colours, but nothing happens when you press the button and the two lines are empty.\nOne class matters more than the rest: text-light. Without it the quote is written in black, and black on a dark blue card cannot be read at all.",
        '<body class="bg-dark">\n  <div class="container d-flex justify-content-center align-items-center vh-100">\n    <div class="card text-center w-75 border-0">\n      <div class="card-body">\n        <h1 class="card-title fs-1 fw-bold py-4 text-light">Quote of the Day</h1>\n        <p class="card-text py-1 text-light fw-lighter">Press the button below to receive a random quote!</p>\n        <button type="button" class="btn btn-outline-light" id="newQuote">New Quote</button>\n        <p class="py-4 fw-bold fs-1 text-light" id="quote"></p>\n        <p class="py-4 fw-lighter text-light" id="author"></p>\n      </div>\n    </div>\n  </div>\n</body>'
      ),
      s(
        "5 — Keeping the Quotes",
        "A quote here is two pieces of text, not one — the line itself, and who said it. So each entry in the array is an object with a text and an author, written inside curly brackets.\nThe length of the array is the number of valid indexes, so the array is what tells you the range of numbers you may pick from.",
        'var quotes = [\n  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },\n  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },\n  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }\n];'
      ),
      s(
        "6 — Picking One at Random",
        "Math.random() gives a decimal between 0 and 1. Multiply it by the length of the array, then round it down, and the result is an index that is guaranteed to exist.\nThe quote you land on is an object, so its two pieces are read with quotes[index].text and quotes[index].author.",
        'var quotes = [\n  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },\n  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },\n  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }\n];\n\nvar index = Math.floor(Math.random() * quotes.length);\n\ndocument.getElementById("quote").innerHTML = quotes[index].text;\ndocument.getElementById("author").innerHTML = quotes[index].author;'
      ),
      s(
        "7 — Never the Same Quote Twice in a Row",
        "Random means random, so the same quote can come up twice in a row — and a visitor who presses twice, sees the same words, decides the button is broken.\nRemember the index you used last time, and if the new one matches it, step one along the array instead. The % is what wraps back to the start after the last quote, and without it this would run off the end of the array.",
        'var quotes = [\n  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },\n  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },\n  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }\n];\n\n// -1 so the first pick can never match it\nvar lastRandom = -1;\n\nvar index = Math.floor(Math.random() * quotes.length);\n\nif (index === lastRandom) {\n  index = (index + 1) % quotes.length;\n}\n\nlastRandom = index;\n\nconsole.log("showing quote " + index);'
      ),
      s(
        "8 — Wiring the Button",
        "The whole job is now written as a function called display, so the button can be handed it by name. Find the button, listen for the click, and the code inside the function runs once per press.\nThe script tag sits at the end of the body, after the button. That is deliberate: by then the button already exists, so the script never goes looking for something the page has not built yet.",
        'var quotes = [\n  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },\n  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },\n  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }\n];\n\nvar lastRandom = -1;\n\nfunction display() {\n  var index = Math.floor(Math.random() * quotes.length);\n\n  if (index === lastRandom) {\n    index = (index + 1) % quotes.length;\n  }\n  lastRandom = index;\n\n  document.getElementById("quote").innerHTML = quotes[index].text;\n  document.getElementById("author").innerHTML = quotes[index].author;\n}\n\ndocument.getElementById("newQuote").addEventListener("click", display);'
      ),
      s(
        "9 — Build It Yourself",
        "Write the whole file, then test it properly: press the button twenty times and check that the quote really does change, that the author always belongs to the quote above it, and that the page never reloads. Seven quotes will show the repeat rule working well before it ever has to fire.",
        undefined,
        undefined,
        '<!DOCTYPE html>\n<html lang="en">\n\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Quote of the Day</title>\n  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"\n    rel="stylesheet"\n    integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"\n    crossorigin="anonymous">\n  <style>\n    *,\n    *::after,\n    *::before {\n      margin: 0;\n      padding: 0;\n      box-sizing: border-box;\n    }\n\n    .card-body {\n      background: linear-gradient(#0d2d68, rgba(0, 153, 204, 0.779));\n    }\n  </style>\n</head>\n\n<body class="bg-dark">\n  <div class="container d-flex justify-content-center align-items-center vh-100">\n    <div class="card text-center w-75 border-0">\n      <div class="card-body">\n        <h1 class="card-title fs-1 fw-bold py-4 text-light">Quote of the Day</h1>\n        <p class="card-text py-1 text-light fw-lighter">Press the button below to receive a random quote!</p>\n        <button type="button" class="btn btn-outline-light" id="newQuote">New Quote</button>\n        <p class="py-4 fw-bold fs-1 text-light" id="quote"></p>\n        <p class="py-4 fw-lighter text-light" id="author"></p>\n      </div>\n    </div>\n  </div>\n\n  <script>\n    var quotes = [\n\n    ];\n\n    var lastRandom = -1;\n\n    function display() {\n\n    }\n\n    document.getElementById("newQuote").addEventListener("click", display);\n  </script>\n</body>\n\n</html>\n',
        '<!DOCTYPE html>\n<html lang="en">\n\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Quote of the Day</title>\n  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"\n    rel="stylesheet"\n    integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"\n    crossorigin="anonymous">\n  <style>\n    *,\n    *::after,\n    *::before {\n      margin: 0;\n      padding: 0;\n      box-sizing: border-box;\n    }\n\n    .card-body {\n      background: linear-gradient(#0d2d68, rgba(0, 153, 204, 0.779));\n    }\n  </style>\n</head>\n\n<body class="bg-dark">\n  <div class="container d-flex justify-content-center align-items-center vh-100">\n    <div class="card text-center w-75 border-0">\n      <div class="card-body">\n        <h1 class="card-title fs-1 fw-bold py-4 text-light">Quote of the Day</h1>\n        <p class="card-text py-1 text-light fw-lighter">Press the button below to receive a random quote!</p>\n        <button type="button" class="btn btn-outline-light" id="newQuote">New Quote</button>\n        <p class="py-4 fw-bold fs-1 text-light" id="quote"></p>\n        <p class="py-4 fw-lighter text-light" id="author"></p>\n      </div>\n    </div>\n  </div>\n\n  <script>\n    var quotes = [\n      { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },\n      { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },\n      { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },\n      { text: "I am so clever that sometimes I don\'t understand a single word of what I am saying.", author: "Oscar Wilde" },\n      { text: "It is better to be hated for what you are than to be loved for what you are not.", author: "Andre Gide" },\n      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },\n      { text: "Everything you can imagine is real.", author: "Pablo Picasso" }\n    ];\n\n    var lastRandom = -1;\n\n    function display() {\n      var index = Math.floor(Math.random() * quotes.length);\n\n      if (index === lastRandom) {\n        index = (index + 1) % quotes.length;\n      }\n      lastRandom = index;\n\n      document.getElementById("quote").innerHTML = quotes[index].text;\n      document.getElementById("author").innerHTML = quotes[index].author;\n    }\n\n    document.getElementById("newQuote").addEventListener("click", display);\n  </script>\n</body>\n\n</html>\n'
      ),
    ],
    quiz: [
      q(
        "What does Math.random() return?",
        [
          "The first quote in the array",
          "A decimal between 0 and 1",
          "A whole number inside the array",
          "A true or false value",
        ],
        1,
        "The result is a decimal, so you multiply it by the length of the array and round it to get an index."
      ),
      q(
        "Why do you multiply Math.random() by quotes.length?",
        [
          "To make the quotes longer",
          "To count the buttons on the page",
          "To turn the decimal into a valid index",
          "To sort the quotes in order",
        ],
        2,
        "The result then falls between 0 and the number of quotes, so it can never be out of range."
      ),
      q(
        "How is the author's name read once a quote has been picked?",
        [
          "quotes[index].text",
          "quotes.author",
          "quotes[index].author",
          'getElementById("author")',
        ],
        2,
        "The array holds objects, so the chosen entry is read as one object with a dot for each of its two keys."
      ),
      q(
        "What is lastRandom for?",
        [
          "To count how many times the button was pressed",
          "To hold the number of quotes in the array",
          "To remember the last index, so the same quote is not shown twice in a row",
          "To round the result of Math.random()",
        ],
        2,
        "It holds the index just used. When the new index matches it, the code steps one along instead."
      ),
      q(
        'What does addEventListener("click", display) give the page?',
        [
          "One quote when the page loads",
          "A new quote on every press of the button",
          "A page reload on every press",
          "A quote per quote in the array",
        ],
        1,
        "display is handed to the button by name, so the whole function runs once per click and nothing reloads."
      ),
    ],
  },
  {
    id: "js-5",
    number: 18,
    month: 6,
    phase: 4,
    kind: "JavaScript",
    title: "Project: Bookmarker",
    subtitle: "Save a site with a name and a link, then open it or delete it",
    intro:
      "The Bookmarker page has two text boxes, a Submit button, and a table that lists everything you have saved. The table has four columns: Index, Website Name, Visit, Delete. The picture is the finished page.",
    accent: "from-rose-500/20 to-red-500/5",
    heroImage: JS_HERO,
    learningGoal:
      "Build the Bookmarker page: read the two inputs, add a row to the table on submit, and wire the Visit and Delete buttons in that row.",
    successCriteria: [
      "Read both inputs with .value and check that neither is empty",
      "Add one table row per submission, with the index counting up",
      "Open the saved link when Visit is pressed",
      "Remove the row when Delete is pressed, and keep the numbering correct",
    ],
    commonMistake:
      "Two bookmarks can have the same name, so the table is keyed by the row number and not by the name. Renaming a bookmark should never be needed to delete it.",
    sections: [
      s(
        "1 — The Finished Page",
        "This is the page you are building. Two inputs at the top, a Submit button between them and the table, and a table that starts with its header row only.",
        undefined,
        ["https://res.cloudinary.com/alhiemg0/image/upload/bookmarker-app.png"]
      ),
      s(
        "2 — The Form and the Table",
        "The form holds the two inputs and the Submit button. Give each input an id, because that is how the script will reach it.\nThe table needs the four columns from the picture: Index, Website Name, Visit, Delete.",
        '<h1>Bookmarker</h1>\n<h3>Bookmark your favorite sites</h3>\n\n<form id="bookmarkForm">\n  <label for="siteName">Site Name</label>\n  <input type="text" id="siteName" placeholder="Bookmark Name" />\n\n  <label for="siteUrl">Site URL</label>\n  <input type="text" id="siteUrl" placeholder="Website URL" />\n\n  <button type="submit">Submit</button>\n</form>\n\n<table id="bookmarkTable">\n  <thead>\n    <tr>\n      <th>Index</th>\n      <th>Website Name</th>\n      <th>Visit</th>\n      <th>Delete</th>\n    </tr>\n  </thead>\n  <tbody id="bookmarkRows"></tbody>\n</table>'
      ),
      s(
        "3 — Reading the Two Inputs",
        ".value gives you what the visitor typed, and it is always text. Check both boxes before you go on — an empty bookmark is never what anyone wanted.",
        'var siteName = document.getElementById("siteName").value;\nvar siteUrl = document.getElementById("siteUrl").value;\n\nif (siteName === "" || siteUrl === "") {\n  console.log("Fill in the name and the link");\n}'
      ),
      s(
        "4 — Adding a Row",
        "A table row is a tr holding its cells. Building the row with text content, then adding it with appendChild, keeps the page safe from the text the visitor typed.",
        'var row = document.createElement("tr");\n\nvar nameCell = document.createElement("td");\nnameCell.textContent = document.getElementById("siteName").value;\n\nvar urlCell = document.createElement("td");\nurlCell.textContent = document.getElementById("siteUrl").value;\n\nrow.appendChild(nameCell);\nrow.appendChild(urlCell);\n\ndocument.getElementById("bookmarkRows").appendChild(row);'
      ),
      s(
        "5 — Visit and Delete",
        "Visit opens the saved link in a new tab. Delete finds the row the button sits in and takes it out of the table, so the page is ready for the next bookmark.\nThe index column is the row number, so it keeps counting in the order the bookmarks were added.",
        'var link = "https://www.ideveloper-academy.com";\n\nvar row = document.createElement("tr");\ndocument.getElementById("bookmarkRows").appendChild(row);\n\n// Visit\nwindow.open(link, "_blank");\n\n// Delete\nrow.remove();\n\ndocument.getElementById("siteName").value = "";\ndocument.getElementById("siteUrl").value = "";'
      ),
      s(
        "6 — Where the Bookmarks Live",
        "Every bookmark is one object with a name and a link, and all of them sit in one array. Adding a bookmark pushes to the end of the array, deleting removes one item from it, and that array is what the table rows are built from.\nWhile the page is open the array is enough. Keeping the bookmarks after the page closes is the next step, and localStorage is where they go.",
        'var bookmarks = [];\n\nbookmarks.push({ name: "I Developer", url: "https://www.ideveloper-academy.com" });\n\nconsole.log(bookmarks.length);'
      ),
      s(
        "7 — Build It Yourself",
        "Write the form, the table and the script, then test the whole flow: add two bookmarks, open one of them, delete the other, and add a third to check the numbering.",
        undefined,
        undefined,
        '<h1>Bookmarker</h1>\n<h3>Bookmark your favorite sites</h3>\n\n<label for="siteName">Site Name</label>\n<input type="text" id="siteName" placeholder="Bookmark Name" />\n\n<label for="siteUrl">Site URL</label>\n<input type="text" id="siteUrl" placeholder="Website URL" />\n\n<button type="button" id="submitBookmark">Submit</button>\n',
        '<h1>Bookmarker</h1>\n<h3>Bookmark your favorite sites</h3>\n\n<label for="siteName">Site Name</label>\n<input type="text" id="siteName" placeholder="Bookmark Name" />\n\n<label for="siteUrl">Site URL</label>\n<input type="text" id="siteUrl" placeholder="Website URL" />\n\n<button type="button" id="submitBookmark">Submit</button>\n\n<table>\n  <thead>\n    <tr><th>Index</th><th>Website Name</th><th>Visit</th><th>Delete</th></tr>\n  </thead>\n  <tbody id="bookmarkRows"></tbody>\n</table>\n\n<script>\n  var bookmarks = [];\n\n  document.getElementById("submitBookmark").addEventListener("click", function () {\n    var name = document.getElementById("siteName").value;\n    var url = document.getElementById("siteUrl").value;\n\n    if (name === "" || url === "") {\n      console.log("Fill in the name and the link");\n      return;\n    }\n\n    bookmarks.push({ name: name, url: url });\n\n    var row = document.createElement("tr");\n    var indexCell = document.createElement("td");\n    indexCell.textContent = bookmarks.length;\n    var nameCell = document.createElement("td");\n    nameCell.textContent = name;\n    var visitCell = document.createElement("td");\n    var visitButton = document.createElement("button");\n    visitButton.textContent = "Visit";\n    visitButton.addEventListener("click", function () {\n      window.open(url, "_blank");\n    });\n    visitCell.appendChild(visitButton);\n    var deleteCell = document.createElement("td");\n    var deleteButton = document.createElement("button");\n    deleteButton.textContent = "Delete";\n    deleteButton.addEventListener("click", function () {\n      row.remove();\n    });\n    deleteCell.appendChild(deleteButton);\n\n    row.appendChild(indexCell);\n    row.appendChild(nameCell);\n    row.appendChild(visitCell);\n    row.appendChild(deleteCell);\n    document.getElementById("bookmarkRows").appendChild(row);\n\n    document.getElementById("siteName").value = "";\n    document.getElementById("siteUrl").value = "";\n  });\n</script>\n'
      ),
    ],
    quiz: [
      q(
        "How does the script read what the visitor typed in a box?",
        [
          "document.getElementById(id).value",
          "document.getElementById(id).innerText",
          "document.getElementById(id).name",
          "document.getElementById(id).html",
        ],
        0,
        ".value is the text currently in the input. It is always a string, even when the visitor types digits."
      ),
      q(
        "Why does each input need an id?",
        [
          "So the script can find that exact box",
          "So the table can be sorted",
          "So the page loads faster",
          "So the label is shown on top",
        ],
        0,
        "The id is the name the script uses to reach the element."
      ),
      q(
        "What does the Delete button do in this page?",
        [
          "Removes the one row it belongs to",
          "Clears both input boxes",
          "Deletes the whole page",
          "Closes the browser tab",
        ],
        0,
        "The listener is attached to the button inside that row, so it removes that row only."
      ),
      q(
        "Where should the bookmarks be kept while the page is open?",
        [
          "In an array, one object per bookmark",
          "In the heading text",
          "In the button label",
          "In a separate image file",
        ],
        0,
        "The array holds the data, and the table rows are built from it."
      ),
      q(
        "What keeps the bookmarks after the page is closed?",
        ["localStorage", "console.log", "A CSS class", "The title tag"],
        0,
        "localStorage belongs to the browser and keeps its values between visits to the page."
      ),
    ],
  },
];

/**
 * Which roadmap entry a session is published under.
 *
 * The HTML track is one course but two stretches of work, so it gets two
 * entries on the roadmap: the first four sessions open the page, the next three
 * build it out. The phase the source lesson carries says which track it belongs
 * to; this says which box it sits in on the student's map, which is why the
 * mapping lives here instead of in the lesson data.
 */
const HTML_PHASES: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
};

/**
 * Which roadmap box each month sits in.
 *
 * One box per month is the shape the course actually sells, and month 3 and
 * month 4 being the two halves of CSS is a fact about the calendar, not about
 * the lessons — so it is written once here instead of stamped on all thirteen
 * records. Move a session into another month and its box moves with it, so
 * nothing ever has to be renumbered by hand and nothing can be left pointing at
 * the wrong month.
 */
const MONTH_PHASES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
};

const publishedPhase = (lesson: WebLesson) => {
  // HTML keeps a map of its own: the track was reorganised once already, and a
  // session there is allowed to sit in a box that is not its own month.
  if (lesson.kind === "HTML") {
    const session = Number(lesson.id.split("-")[1]);
    return HTML_PHASES[session] ?? 1;
  }
  return MONTH_PHASES[lesson.month] ?? lesson.phase + 1;
};

/**
 * The published course: the HTML track, then the CSS track, then JavaScript.
 *
 * `number` is assigned here rather than inside each track, so a track can grow
 * or shrink without anyone having to renumber a sibling. It always runs 1..N
 * across the whole course, which is what the certificate and the badge read.
 */
export const coreLessons: WebLesson[] = [
  ...htmlLessons,
  ...cssLessons,
  ...jsLessons,
].map((lesson, index) => ({
  ...lesson,
  number: index + 1,
  phase: publishedPhase(lesson),
}));

export const allWebLessons: WebLesson[] = coreLessons;

export const curriculumPhases: CurriculumPhase[] = [
  {
    id: 1,
    month: 1,
    en: "HTML Foundations",
    meta: "Month 1 · 4 sessions",
    color: "from-cyan-300 to-blue-400",
  },
  {
    id: 2,
    month: 2,
    en: "HTML Attributes, Media & Forms",
    meta: "Month 2 · 4 sessions",
    color: "from-sky-300 to-cyan-400",
  },
  {
    id: 3,
    month: 3,
    en: "CSS Foundations",
    meta: "Month 3 · 4 sessions",
    color: "from-violet-300 to-purple-400",
  },
  {
    id: 4,
    month: 4,
    en: "CSS Layout & Build",
    meta: "Month 4 · 4 sessions",
    color: "from-fuchsia-300 to-pink-400",
  },
  {
    id: 5,
    month: 5,
    en: "JavaScript Interactivity",
    meta: "Month 5",
    color: "from-amber-300 to-orange-400",
  },
  {
    id: 6,
    month: 6,
    en: "Projects",
    meta: "Month 6",
    color: "from-rose-300 to-red-400",
  },
];

export const LESSON_ACCENTS: Record<WebTrack, string> = {
  HTML: "from-cyan-500/20 to-blue-500/5",
  CSS: "from-violet-500/20 to-fuchsia-500/5",
  JavaScript: "from-amber-500/20 to-orange-500/5",
};

/** Badge label for a track, matching the way Python labels core / problem. */
export const TRACK_LABEL: Record<WebTrack, string> = {
  HTML: "HTML",
  CSS: "CSS",
  JavaScript: "JavaScript",
};

export { q, s };
