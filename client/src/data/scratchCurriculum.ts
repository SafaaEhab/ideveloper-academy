// Scratch curriculum: 3-month journey (Apple, Shark, Ping Pong, Calculator).
export type CurriculumSection = {
  title: string;
  body: string;
  code?: string;
  // ده مكان الصور بتاعة السكشن - أي رابط هنا هو صورة، علشان تعرف تعدله
  images?: string[];
  // ده مكان الفيديوهات بتاعة السكشن - أي رابط هنا هو فيديو بيشتغل بمشغل
  videos?: string[];
  starterCode?: string;
  solutionCode?: string;
};
export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  // صور توضيحية للسؤال نفسه (بلوكات سكراتش) - من الصور المستخدمة في الشرح
  questionImages?: string[];
  // صور لكل اختيار - لو موجودة بتتعرض بدل النص (البلوك كصورة مش كتابة)
  // optionImages[i] = قائمة صور للاختيار رقم i
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
    title: "Apple Game - Part 1",
    subtitle: "Apple game — build the falling-apple setup",
    intro:
      "In this session, we build the Apple Collector game from the beginning. We prepare the game stage, choose the Blue Sky backdrop, add the Apple and Bowl sprites, create the Score and Lives variables, then build the Apple blocks that place the apple at the top and make it fall down.",
    accent: "from-sky-500/20 to-cyan-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Create the Apple Collector setup and build the first falling-apple behavior.",
    successCriteria: [
      "Prepare the Apple Collector game stage",
      "Choose Blue Sky backdrop and add Apple + Bowl sprites",
      "Create Score and Lives variables",
      "Reset Score to 0 and Lives to 3 on Green Flag",
      "Start apple at y = 180 and fall with change y by -5 in forever",
    ],
    commonMistake:
      "Forgetting to reset Score and Lives when the Green Flag is clicked, or forgetting to set y to 180 before the falling loop.",
    sections: [
      s(
        "1 — Game",
        "Start with the Apple Collector game.\n• Red apple falls from the top of the sky.\n• Brown bowl waits at the bottom to catch it.\n• Score shows points, Lives shows chances.\nWatch the video below, then build the game step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        ["https://res.cloudinary.com/alhiemg0/video/upload/v1788977794/sv4.mp4"]
      ),
      s(
        "2 — Sprite: Delete Cat",
        "Delete the default Cat sprite (Sprite1) ",
        undefined,
        // دي صورة واحدة فقط - سبريت التفاحة على المسرح
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s3.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s18.png",
        ]
      ),
      s(
        "3 — Backdrop: Choose a Backdrop",
        "Click Choose a Backdrop at the bottom right to open the backdrop gallery.",
        undefined,
        // دي صورة واحدة فقط - زر Choose a Backdrop
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974220/s1.png"]
      ),
      s(
        "4 — Backdrop: Blue Sky",
        "Choose Blue Sky — light blue sky with green hills. This is the scene where the game takes place.",
        undefined,
        // دي صورة واحدة فقط - اختيار Blue Sky
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s2.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s19.png",
        ]
      ),
      s(
        "5 — Sprite: Choose Apple",
        "Click Choose a Sprite, then choose the red Apple. This is the object that falls from the top.",
        undefined,
        // دي صورة واحدة فقط - اختيار التفاحة
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s4.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s5.png",
        ]
      ),

      s(
        "6 — Sprite: Apple added",
        "The Apple sprite is now on the stage.",
        undefined,
        // دي صورة واحدة فقط - سبريت التفاحة على المسرح
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788980924/s20.png"]
      ),
      s(
        "7 — Sprite: Choose Bowl",
        "Click Choose a Sprite again and choose the brown Bowl.",
        undefined,
        // دي صورة واحدة فقط - اختيار الطبق
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s6.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s7.png",
        ]
      ),
      s(
        "8 — Sprite: Bowl at the bottom",
        "Drag the Bowl to the bottom of the stage. It will catch the falling apple.",
        undefined,
        // دي صورة واحدة فقط - الطبق أسفل المسرح
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788980924/s21.png"]
      ),
      s(
        "9 — Variable: Make Score",
        "Go to Variables > Make a Variable. Type Score, choose For all sprites, then OK. Score stores the points.",
        "",
        // دي صورة واحدة فقط - نافذة Score
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s8.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s9.png",
        ]
      ),
      s(
        "10 — Variable: Make Lives",
        "Make a Variable again. Type Lives, choose For all sprites, then OK. Lives stores the chances.",
        "",
        // دي صورة واحدة فقط - نافذة Lives
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s10.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s11.png",
        ]
      ),

      s(
        "11 — Trigger: Green Flag",
        "Use when green flag clicked to start the Apple's code. Click the Green Flag to start.",
        "",
        // دي صورة واحدة فقط - بلوك Green Flag
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s12.png"]
      ),
      s(
        "12 — Reset: place apple at top",
        "Set y to 180. This places the apple at the top of the screen.",
        "",
        // دي صورة واحدة فقط - set y to 180
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s13.png"]
      ),
      s(
        "13 — Reset: Score to 0",
        "Set Score to 0 so every game starts fresh.",
        "",
        // دي صورة واحدة فقط - set Score to 0
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s14.png"]
      ),
      s(
        "14 — Reset: Lives to 3",
        "Set Lives to 3. This gives the player 3 lives.",
        "",
        // دي صورة واحدة فقط - set Lives to 3
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s15.png"]
      ),
      s(
        "15 — Forever loop",
        "Add the forever block. It repeats the apple falling process again and again.",
        "",
        // دي صورة واحدة فقط - بلوك forever
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s16.png"]
      ),
      s(
        "16 — Fall down",
        "Snap change y by -5 inside forever. This makes the apple fall down step by step.",
        "",
        // دي صورة واحدة فقط - change y by -5
        ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s17.png"]
      ),
    ],
    challenge:
      "Build Apple Collector setup: choose Blue Sky backdrop, add Apple and Bowl sprites, create Score and Lives, reset Score to 0 and Lives to 3, set apple y to 180, and make it fall with change y by -5 inside forever. Test with Green Flag.",
    quiz: [
      q(
        "Why do we set Score to 0 and Lives to 3 under Green Flag?",
        [
          "To change the backdrop to Blue Sky",
          "So every game starts fresh with 0 points and 3 chances",
          "To make the apple fall faster",
          "To delete the Bowl sprite",
        ],
        1,
        "Green Flag resets the game. Score 0 clears old points and Lives 3 restores all chances.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s12.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s14.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s15.png",
          ],
        }
      ),
      q(
        "Which pair correctly places the apple at the top?",
        [
          "go to x: 0 y: 0 + point in direction 90",
          "set y to 180 at the top",
          "set y to -180 at the bottom",
          "change y by -5 inside forever",
        ],
        1,
        "Set y to 180 puts the apple at the top before it starts falling.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s13.png",
          ],
          optionImages: [
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s13.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s13.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s16.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s17.png",
            ],
          ],
        }
      ),
      q(
        "The apple moves once then stops and never falls again. What is missing?",
        [
          "switch backdrop to Blue Sky",
          "set Score to 0",
          "forever loop around change y by -5",
          "go to random position",
        ],
        2,
        "Change y by -5 moves one step only. Forever repeats it so the apple keeps falling.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s17.png",
          ],
          optionImages: [
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s14.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s16.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s17.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974701/s2.2.png"],
          ],
        }
      ),
      q(
        "If you change change y by -5 to change y by -10, what happens?",
        [
          "The apple moves to the bottom instantly and stops",
          "The Score becomes 10",
          "The Bowl moves to the top",
          "The apple falls faster because steps are bigger",
        ],
        3,
        "A bigger negative step means bigger jumps down each loop, so falling looks faster.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s17.png",
          ],
        }
      ),
    ],
  },

  {
    id: "s2",
    number: 2,
    month: 1,
    phase: 1,
    kind: "core",
    title: "Apple Game - Part 2",
    subtitle: "Apple game - conditions, lives, sound, and score",
    intro:
      "In this session, we finish the Apple Collector game. We check when the apple touches the ground, move it to a random position, remove a life when it is missed, end the game when all lives are lost, and reward the player with sound and score when the Bowl catches the apple.",
    accent: "from-sky-500/20 to-cyan-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Complete the Apple Collector logic using conditions, random position, Lives, sound, and Score.",
    successCriteria: [
      "Check when the apple reaches y < -180",
      "Move the apple to a random position and back to y = 180",
      "Remove one life when the apple is missed",
      "End the game when Lives = 0",
      "Play Chomp and add 1 to Score when the Bowl catches the apple",
    ],
    commonMistake:
      "Putting the catch condition in the wrong place or forgetting to send the apple back to the top after it is missed or caught.",
    sections: [
      s(
        "1 — Game",
        "Start with the finished Apple Collector game.\n• Misses cost a life, catches earn a point and play Chomp.\n• Score grows, Lives shrink until the game ends.\nWatch how each block below builds one piece of this behavior.",
        undefined,
        undefined,
        undefined,
        undefined,
        // حط هنا لينك فيديو اللعبة لو موجود
        ["https://res.cloudinary.com/alhiemg0/video/upload/v1788977794/sv4.mp4"]
      ),
      s(
        "2 — CONDITION: apple touches ground",
        "Checks if the apple touches the ground/color.\nInside forever, add: if y position < -180 then.",
        "",
        // حط هنا لينك صورة شرط الأرض
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974700/s2.1.png",
        ]
      ),
      s(
        "3 — RANDOM: random position",
        "Moves the apple to a new random position.\nInside the ground condition, add: go to random position.",
        "",
        // حط هنا لينك صورة random position
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974701/s2.2.png",
        ]
      ),
      s(
        "4 — Top: back to the top",
        "Sends the apple back to the top.\nAfter random position, add: set y to 180.",
        "",
        // حط هنا لينك صورة set y to 180
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974702/s2.3.png",
        ]
      ),
      s(
        "5 — Lives: lose a life",
        "Removes one life when the apple is missed.\nIn the ground condition, add: change Lives by -1.",
        "",
        // حط هنا لينك صورة change Lives
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.4.png",
        ]
      ),
      s(
        "6 — Condition: all lives lost",
        "Checks if the player has lost all lives.\nAdd: if Lives = 0 then.",
        "",
        // حط هنا لينك صورة شرط Lives
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.5.png",
        ]
      ),
      s(
        "7 — End: stop all",
        "Ends the game.\nInside the Lives condition, add: stop all.",
        "",
        // حط هنا لينك صورة stop all
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png",
        ]
      ),
      s(
        "8 — Random: bowl catches apple",
        "Checks if the bowl catches the apple.\nAdd: if touching Bowl? then, with go to random position inside.",
        "",
        // حط هنا لينك صورة شرط touching Bowl
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974720/s2.7.png",
        ]
      ),
      s(
        "9 — Top: back to top after catch",
        "Sends the apple back to the top after a catch.\nInside the catch condition, add: set y to 180.",
        "",
        // حط هنا لينك صورة set y بعد الالتقاط
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974725/s2.8.png",
        ]
      ),
      s(
        "10 — Sound: Chomp",
        "Plays a sound when the apple is caught.\nInside the catch condition, add: start sound Chomp.",
        "",
        // حط هنا لينك صورة start sound
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974728/s2.9.png",
        ]
      ),
      s(
        "11 — SCORE: add 1 point",
        "Adds 1 point to the score.\nInside the catch condition, add: change Score by 1.",
        "",
        // حط هنا لينك صورة change Score
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974726/s2.10.png",
        ]
      ),
    ],
    challenge:
      "Finish Apple Collector: inside forever add the ground condition (y < -180) with random position, y to 180, and Lives -1; add Lives = 0 with stop all; add touching Bowl with random position, y to 180, Chomp, and Score +1. Test misses and catches with Green Flag.",
    quiz: [
      q(
        "How do we know the apple missed the Bowl and hit the ground?",
        [
          "if touching Bowl? then",
          "if Lives = 0 then",
          "if y position < -180 then",
          "if Score = 10 then",
        ],
        2,
        "Y = -180 is the bottom. Below that the apple passed the Bowl and touched the ground.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974700/s2.1.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974720/s2.7.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.5.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974700/s2.1.png"],
            undefined,
          ],
        }
      ),
      q(
        "Inside the missed-apple condition, which full set must run?",
        [
          "go to random position + set y to 180 + change Lives by -1",
          "start sound Chomp + change Score by 1",
          "stop all",
          "point in direction 90 + move 10 steps",
        ],
        0,
        "A miss needs escape to a new top position plus losing one life. All three together.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974700/s2.1.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974701/s2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974702/s2.3.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.4.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974728/s2.9.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974726/s2.10.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.15.png",
            ],
          ],
        }
      ),
      q(
        "The apple is caught, Score goes up, but the apple stays stuck at the Bowl. What is missing inside touching Bowl?",
        [
          "stop all",
          "change Lives by -1",
          "go to random position + set y to 180",
          "set Score to 0",
        ],
        2,
        "After a catch the apple must jump back to the top. Without random position + y 180 it never leaves the Bowl.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974720/s2.7.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.4.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974701/s2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974725/s2.8.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s14.png"],
          ],
        }
      ),
      q(
        "When should stop all run?",
        [
          "Every time the apple is caught",
          "Every time the apple falls one step",
          "Only inside if Lives = 0 then, after all lives are lost",
          "When Score reaches 1",
        ],
        2,
        "Stop all ends the game. It runs only when Lives hits 0, not on every catch or miss.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png",
          ],
          optionImages: [
            undefined,
            undefined,
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png",
            ],
            undefined,
          ],
        }
      ),
    ],
  },

  {
    id: "s3",
    number: 3,
    month: 1,
    phase: 1,
    kind: "core",
    title: "Apple Game - Part 3",
    subtitle: "Apple game - bowl movement and win mission",
    intro:
      "In this session, we control the Bowl. We start the Bowl's code, place it at the starting position, keep checking the keyboard in a forever loop, move it right and left with the arrow keys, then take the win mission when Score reaches 10.",
    accent: "from-sky-500/20 to-cyan-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Move the Bowl with the arrow keys and set a win mission at Score 10.",
    successCriteria: [
      "Start the Bowl's code with Green Flag",
      "Place the Bowl at x: 0 y: -141",
      "Keep checking the keyboard inside forever",
      "Move right 10 steps and left 10 steps with arrow keys",
      "Win when Score = 10",
    ],
    commonMistake:
      "Putting the key checks outside forever so the Bowl moves once, or mixing up change x by 10 and change x by -10.",
    sections: [
      s(
        "1 — Game",
        "Start with the Bowl in the Apple Collector game.\n• The Bowl waits at the bottom and follows your arrow keys.\n• Catch apples to reach Score 10 and win.\nWatch how each block below moves the Bowl.",
        undefined,
        undefined,
        undefined,
        undefined,
        // حط هنا لينك فيديو اللعبة لو موجود
        ["https://res.cloudinary.com/alhiemg0/video/upload/v1788977794/sv4.mp4"]
      ),
      s(
        "2 — Start: green flag",
        "Starts the game.\nSelect the Bowl sprite, then add: when green flag clicked.",
        "",
        // حط هنا لينك صورة Start
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974878/s3.1.png",
        ]
      ),
      s(
        "3 — Position: starting point",
        "Places the bowl at the starting position.\nAdd: go to x: 0 y: -141.",
        "",
        // حط هنا لينك صورة Position
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974880/s3.2.png",
        ]
      ),
      s(
        "4 — Loop: keep checking",
        "Keeps checking the keyboard continuously.\nAdd a forever loop under the position block.",
        "",
        // حط هنا لينك صورة Loop
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974881/s3.3.png",
        ]
      ),
      s(
        "5 — Direction: right arrow",
        "Checks if the right arrow key is pressed.\nInside forever, add: if key right arrow pressed? then.",
        "",
        // حط هنا لينك صورة Direction يمين
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
        ]
      ),
      s(
        "6 — Move: 10 steps right",
        "Moves the bowl 10 steps to the right.\nInside the right-arrow condition, add: change x by 10.",
        "",
        // حط هنا لينك صورة Move يمين
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
        ]
      ),
      s(
        "7 — Direction: left arrow",
        "Checks if the left arrow key is pressed.\nInside forever, add: if key left arrow pressed? then.",
        "",
        // حط هنا لينك صورة Direction شمال
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974893/s3.6.png",
        ]
      ),
      s(
        "8 — Move: 10 steps left",
        "Moves the bowl 10 steps to the left.\nInside the left-arrow condition, add: change x by -10.",
        "",
        // حط هنا لينك صورة Move شمال
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1788974895/s3.7.png",
        ]
      ),
    ],
    challenge:
      "MISSION: When Score = 10, you win! Build the full Bowl code: Green Flag, go to x: 0 y: -141, forever with right-arrow + change x by 10 and left-arrow + change x by -10. Play until Score reaches 10.",
    quiz: [
      q(
        "Why must the arrow-key checks live inside forever?",
        [
          "So the Bowl checks the keyboard all the time while playing",
          "So the Bowl starts at x: 0 y: -141 once",
          "So Score resets to 0",
          "So the apple falls faster",
        ],
        0,
        "Forever keeps asking every frame if a key is pressed. Outside forever the check runs once and stops.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974881/s3.3.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
          ],
          optionImages: [
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974880/s3.2.png"],
            undefined,
            undefined,
          ],
        }
      ),
      q(
        "Which pair correctly moves the Bowl to the right?",
        [
          "if key left arrow pressed? + change x by 10",
          "if key right arrow pressed? + change x by -10",
          "if key right arrow pressed? + change x by 10",
          "if key right arrow pressed? + change y by 10",
        ],
        2,
        "Right arrow selects direction, change x by 10 steps right. Left uses -10, Y moves up-down.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974893/s3.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974895/s3.7.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974891/s3.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
          ],
        }
      ),
      q(
        "The Bowl moves right when you press left, and left when you press right. What is wrong?",
        [
          "Green Flag is missing",
          "change x by 10 and change x by -10 are swapped",
          "go to x: 0 y: -141 is missing",
          "Score = 10 check is missing",
        ],
        1,
        "Right must pair with +10 and left with -10. Swapped values reverse the controls.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1788974895/s3.7.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974878/s3.1.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974895/s3.7.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974880/s3.2.png"],
            undefined,
          ],
        }
      ),
      q(
        "You win at Score = 10 but the game never celebrates. Which check is the win mission?",
        [
          "if Lives = 0 then stop all",
          "if y position < -180 then change Lives by -1",
          "if Score = 10 then win",
          "if touching Bowl? then change Score by 1",
        ],
        2,
        "Score counts catches. Only Score = 10 means the win goal is reached. Lives = 0 is game over.",
        {
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974700/s2.1.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974707/s2.4.png",
            ],
            undefined,
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974720/s2.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974726/s2.10.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s4",
    number: 4,
    month: 1,
    phase: 1,
    kind: "core",
    title: "Shark Game - Part 1",
    subtitle: "Shark game — swim in all directions",
    intro:
      "In this session, we start the Hungry Shark game. We choose the Underwater backdrop, add Fish, Shark 2 and Octopus sprites, then build all the Shark blocks to swim up, down, right and left, reset the Score, and stay inside the screen.",
    accent: "from-green-500/20 to-emerald-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Build the Hungry Shark stage and program Shark 2 to swim in all directions with Score reset and edge bounce.",
    successCriteria: [
      "Choose Underwater 1 backdrop and delete Sprite1 Cat",
      "Add Fish, Shark 2, and Octopus sprites",
      "Swim up with up arrow + change y by 10",
      "Swim down with down arrow + change y by -10",
      "Point right with right arrow + point in direction 90",
      "Use left-right rotation style so the shark never flips",
      "Move right with change x by 10 and left with change x by -10",
      "Reset Score to 0 on Green Flag and stay in bounds with if on edge, bounce",
    ],
    commonMistake:
      "Choosing Shark 1 instead of Shark 2, forgetting set rotation style left-right so the shark flips upside down, or putting the movement blocks without their key-pressed trigger.",
    sections: [
      s(
        "1 — Game",
        "Start with the Hungry Shark game.\n• Blue shark swims in the Underwater ocean.\n• Orange fish is food, orange octopus is the enemy.\n• Score shows points when the shark eats.\nWatch the video below, then build the game step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789417951/Scratch_3.29.1_2026-08-27_13-49-00.mp4",
        ]
      ),
      s(
        "2 — Backdrop: Choose a Backdrop",
        "Click Choose a Backdrop at the bottom right to open the backdrop gallery.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.1.png",
        ]
      ),
      s(
        "3 — Backdrop: Underwater 1",
        "Choose the Underwater category, then choose Underwater 1 — blue water with corals, seaweed and starfish. This is the ocean where the shark lives.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.2.png",
        ]
      ),
      s(
        "4 — Sprite: Delete Cat",
        "Delete the default Cat sprite (Sprite1) so the stage is clean for the ocean game. Click the trash icon on Sprite1.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.3.png",
        ]
      ),
      s(
        "5 — Sprite: Choose a Sprite",
        "Click Choose a Sprite at the bottom to open the sprite gallery.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.4.png",
        ]
      ),
      s(
        "6 — Sprite: Fish",
        "Type fi in Search, then choose Fish — the orange clownfish. This is the shark's food.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.5.png",
        ]
      ),
      s(
        "7 — Sprite: Choose a Sprite again",
        "Click Choose a Sprite again to add the player.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.6.png",
        ]
      ),
      s(
        "8 — Sprite: Shark 2",
        "Type shark in Search, then choose Shark 2 — the blue cartoon shark with big teeth. This is our player, the King of the Ocean!",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.7.png",
        ]
      ),
      s(
        "9 — Sprite: Choose a Sprite again",
        "Click Choose a Sprite again to add the last character.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.8.png",
        ]
      ),
      s(
        "10 — Sprite: Octopus",
        "Type octopus in Search, then choose Octopus — the orange octopus. It lives in the pink coral on the right.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789416107/s4.9.png",
        ]
      ),
      s(
        "11 — Shark Blocks",
        "Now we program the Shark! We will build: Swimming Up, Moving Up, Swimming Down, Turning Right, Rotation Style, Moving Right, Moving Left, then the Green Flag trigger with Score reset, Forever loop, and Staying in Bounds.",
        ""
      ),
      s(
        "12 — Swimming Up",
        "Tells the shark to swim up.\nAdd: when up arrow key pressed.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
        ]
      ),
      s(
        "13 — Moving Up",
        "Makes the shark swim upwards.\nAdd: change y by 10.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
        ]
      ),
      s(
        "14 — Swimming Down",
        "Tells the shark to swim down.\nAdd: when down arrow key pressed.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.12.png",
        ]
      ),
      s(
        "15 — Turning Right",
        "Points the shark to the right.\nAdd: when right arrow key pressed, point in direction 90.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png",
        ]
      ),
      s(
        "16 — Rotation Style",
        "Keeps the shark straight when turning.\nAdd: set rotation style left-right.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.14.png",
        ]
      ),
      s(
        "17 — Moving Right",
        "Moves the shark to the right.\nAdd: change x by 10.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.15.png",
        ]
      ),
      s(
        "18 — Moving Left",
        "Points the shark to the left and swims left.\nAdd: when left arrow key pressed, point in direction -90, left-right style, change x by -10.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.16.png",
        ]
      ),
      s(
        "19 — The Trigger",
        "Starts the Shark's code.\nSelect Shark 2, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.17.png",
        ]
      ),
      s(
        "20 — Block 1: Resetting the Game",
        "Resets the game so every game starts fresh.\nUnder Green Flag, add: set Score to 0.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png",
        ]
      ),
      s(
        "21 — The Forever Loop",
        "Keeps checking the shark's rules all the time.\nUnder the reset blocks, add: forever.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.20.png",
        ]
      ),
      s(
        "22 — Staying in Bounds",
        "Keeps the shark inside the ocean.\nInside forever, add: if on edge, bounce.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.20.png",
        ]
      ),
    ],
    challenge:
      "MISSION: Build Hungry Shark movement — Underwater 1 backdrop, Fish + Shark 2 + Octopus, full Shark movement (up y 10 / down y -10 / right x 10 + direction 90 / left x -10 + direction -90 with left-right style), Green Flag with set Score to 0, forever with if on edge, bounce. Press Green Flag and swim with the arrows!",
    quiz: [
      q(
        "The shark turns left and flips upside down. Which block fixes it and why?",
        [
          "point in direction 90 to face right",
          "change x by -10 to swim left",
          "set rotation style left-right so it never turns upside down",
          "set Score to 0 to reset points",
        ],
        2,
        "Left-right style locks the shark upright. Without it, pointing to -90 flips the costume.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.14.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.16.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.16.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.14.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png"],
          ],
        }
      ),
      q(
        "Which pair moves the shark up correctly?",
        [
          "when down arrow pressed + change y by 10",
          "when up arrow pressed + change y by 10",
          "when up arrow pressed + change x by 10",
          "when up arrow pressed + change y by -10",
        ],
        1,
        "Up arrow selects the direction and +10 on Y swims up. -10 on Y swims down, X moves sideways.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.12.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.15.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
          ],
        }
      ),
      q(
        "The shark swims off the screen and disappears. What keeps it inside the ocean?",
        [
          "point in direction -90",
          "change Score by 1",
          "if on edge, bounce inside forever",
          "set rotation style left-right",
        ],
        2,
        "If on edge, bounce turns the shark back. Inside forever it checks all the time.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.20.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.16.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.20.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.14.png"],
          ],
        }
      ),
      q(
        "Which full start keeps the game fair every run?",
        [
          "when up arrow pressed + change y by 10",
          "point in direction 90 + change x by 10",
          "go to random position + next costume",
          "when Green Flag clicked + set Score to 0 + forever",
        ],
        3,
        "Green Flag starts fresh, Score 0 clears old points, forever keeps all rules running.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.17.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.10.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.15.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.17.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.20.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s5",
    number: 5,
    month: 2,
    phase: 2,
    kind: "core",
    title: "Shark Game - Part 2",
    subtitle: "Shark game — eat fish, score points, change colors",
    intro:
      "In this session, we build the Hungry Shark game. First the Shark learns to sense the Fish and chomp with costumes, then we build the full Fish code: trigger, loop, sensing Shark 2, tiny wait, swim to random position, Score +1, and next costume.",
    accent: "from-green-500/20 to-emerald-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Program the Shark to sense and eat the Fish, and program the Fish to escape, score points, and change colors.",
    successCriteria: [
      "Select Shark 2 and check if touching Fish",
      "Chomp with switch costume to shark2-b, wait 0.25, shark2-a",
      "Start Fish code with Green Flag + forever",
      "Sense with if touching Shark 2 then",
      "Add wait 0.1 + go to random position + change Score by 1 + next costume",
      "Finish homework mission: make the fish appear faster",
    ],
    commonMistake:
      "Putting touching Fish on the Fish sprite instead of touching Shark 2, forgetting the tiny wait so Score jumps too fast, or forgetting next costume so the fish never changes color.",
    sections: [
      s(
        "1 — Game",
        "Start with the Hungry Shark game.\n• The shark opens its mouth and chomps the fish.\n• Each eaten fish earns 1 point and changes color.\n• The fish escapes to a random position.\nWatch how each block below builds the eating and scoring.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789417951/Scratch_3.29.1_2026-08-27_13-49-00.mp4",
        ]
      ),
      s(
        "2 — Sensing Fish",
        "Checks if the shark is touching a tasty fish to eat it.\nSelect Shark 2, then add: if touching Fish? then.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.1.png",
        ]
      ),
      s(
        "3 — Chomp: open and close",
        "Makes the shark open and close its mouth.\nInside the touching condition, add: switch costume to shark2-b, wait 0.25 seconds, switch costume to shark2-a.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.2.png",
        ]
      ),
      s(
        "4 — Fish code",
        "Now we program the Fish! We will build: trigger, loop, sensing, tiny wait, escape, scoring, and colors."
      ),
      s(
        "5 — Trigger: green flag",
        "Starts the fish's code.\nSelect the Fish sprite, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.3.png",
        ]
      ),
      s(
        "6 — Loop: forever",
        "Repeats the fish's actions forever.\nUnder Green Flag, add: forever.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.4.png",
        ]
      ),
      s(
        "7 — Sense: touching Shark 2",
        "Checks if the fish is touching the Shark.\nInside forever, add: if touching Shark 2? then.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.5.png",
        ]
      ),
      s(
        "8 — Wait: 0.1 seconds",
        "We add a tiny wait so the game runs smoothly.\nInside the touching condition add: wait 0.1 seconds.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png",
        ]
      ),
      s(
        "9 — Escape: random position",
        "The fish swims to a random position to escape the shark!\nAfter wait, add: go to random position.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png",
        ]
      ),
      s(
        "10 — Score: add 1 point",
        "Adds 1 point every time the shark eats a fish.\nAfter random position, add: change Score by 1.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png",
        ]
      ),
      s(
        "11 — Look: next costume",
        "Changes the fish's color.\nAt the end of the condition, add: next costume.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
        ]
      ),
      s(
        "12 — Mission: faster fish",
        "MISSION: Make the fish appear faster!\nThe fish waits 0.1 seconds before swimming away. Try a smaller wait to make it appear faster and the game harder. Test with Green Flag in the Underwater stage with Score showing.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.10.png",
        ]
      ),
    ],
    challenge:
      "MISSION: Make the fish appear faster! Open the Fish code, make the wait smaller than 0.1, keep go to random position + change Score by 1 + next costume. Press Green Flag and check the shark eats faster in the Underwater game with Score.",
    quiz: [
      q(
        "Shark code says touching Fish? and Fish code says touching Shark 2?. Why are they different?",
        [
          "They are the same check, names do not matter",
          "Each sprite checks for the other sprite: Shark looks for Fish, Fish looks for Shark 2",
          "Fish should also check touching Fish?",
          "Shark should check touching Shark 2?",
        ],
        1,
        "Touching checks the other sprite. Shark hunts Fish, Fish escapes from Shark 2. Same touch, opposite sides.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.1.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.5.png",
          ],
          optionImages: [
            undefined,
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.1.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.5.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.1.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.5.png"],
          ],
        }
      ),
      q(
        "Inside Fish touching Shark 2, which order is correct?",
        [
          "change Score by 1 + go to random position + wait 0.1",
          "wait 0.1 seconds + go to random position + change Score by 1 + next costume",
          "next costume + wait 0.1 + set Score to 0",
          "go to random position + if on edge, bounce",
        ],
        1,
        "Wait first for smoothness, then escape, then +1 point, then new color. Order keeps scoring fair.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.5.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
            ],
          ],
        }
      ),
      q(
        "Score jumps from 0 to 12 in one bite. What is missing in the Fish code?",
        [
          "go to random position",
          "wait 0.1 seconds before escaping",
          "next costume",
          "when green flag clicked",
        ],
        1,
        "Without the tiny wait the condition fires every frame while touching. Wait 0.1 slows it to one point per bite.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.7.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.6.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.3.png"],
          ],
        }
      ),
      q(
        "The shark opens its mouth once but the fish never changes color. Which chomp + color set is complete?",
        [
          "switch costume to shark2-b + wait 0.25 + shark2-a on Shark, plus next costume on Fish",
          "set Score to 0 on Shark",
          "point in direction 90 on Fish",
          "if on edge, bounce on Fish",
        ],
        0,
        "Shark needs open-wait-close for chomp, Fish needs next costume for a new color each time it is eaten.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.2.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.9.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png"],
          ],
        }
      ),
    ],
  },

  {
    id: "s6",
    number: 6,
    month: 2,
    phase: 2,
    kind: "core",
    title: "Shark Game - Part 3",
    subtitle: "Octopus enemy — catch, escape, and mouse control",
    intro:
      "In this session, we add a new enemy to Hungry Shark. We build the full Octopus code: Green Flag trigger, forever loop, sensing Shark 2, tiny wait, next costume, escape to random position, and Score -1. Then we control Shark 2 with the mouse using point towards mouse-pointer and move 10 steps.",
    accent: "from-green-500/20 to-emerald-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Program the Octopus enemy to catch the Shark, and control the Shark with the mouse.",
    successCriteria: [
      "Meet the Octopus enemy that catches the Shark",
      "Start the Octopus code with Green Flag + forever",
      "Sense with if touching Shark 2? then",
      "Add wait 0.1 + next costume + random position + Score -1",
      "Control Shark 2 with point towards mouse-pointer",
      "Swim with move 10 steps and finish the mission",
    ],
    commonMistake:
      "Putting touching Shark 2 on the Shark sprite instead of the Octopus, forgetting the tiny wait so Score drops too fast, or forgetting next costume so the Octopus never looks alive.",
    sections: [
      s(
        "1 — Game",
        "Start with the Hungry Shark game.\n• The Octopus is a new enemy — if it touches the shark, you lose points.\n• The Shark now follows your mouse with point towards + move steps.\nWatch how each block below builds the Octopus escape and the mouse control.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789417951/Scratch_3.29.1_2026-08-27_13-49-00.mp4",
        ]
      ),
      s(
        "2 — Meet: Octopus",
        "The Octopus is a new enemy! If it touches the shark, you lose points.\nSelect the Octopus sprite — all the blocks below live on the Octopus, not on the Shark.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.1.png",
        ]
      ),
      s(
        "3 — Octopus code",
        "Now we program the Octopus! We will build: the trigger, keep checking, sensing, tiny wait, look, escape, and losing points."
      ),
      s(
        "4 — Trigger: green flag",
        "Starts the Octopus's code.\nSelect the Octopus sprite, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.2.png",
        ]
      ),
      s(
        "5 — Loop: keep checking",
        "Keeps checking for the shark all the time.\nUnder Green Flag, add: forever.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.3.png",
        ]
      ),
      s(
        "6 — Sense: touching Shark 2",
        "Catches the shark when they touch.\nInside forever, add: if touching Shark 2? then.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.4.png",
        ]
      ),
      s(
        "7 — Wait: 0.1 seconds",
        "Waits a tiny moment before moving away.\nInside the touching condition, add: wait 0.1 seconds.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.5.png",
        ]
      ),
      s(
        "8 — Look: next costume",
        "Makes the Octopus look alive when moving.\nAfter wait, add: next costume.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.6.png",
        ]
      ),
      s(
        "9 — Escape: random position",
        "Jumps to a random position to escape the shark.\nAfter next costume, add: go to random position.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.7.png",
        ]
      ),
      s(
        "10 — Score: lose 1 point",
        "Loses 1 point when the Octopus catches you.\nAt the end of the condition, add: change Score by -1.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.8.png",
        ]
      ),
      s(
        "11 — Mouse code",
        "Now we control the Shark with the mouse! We will build: point towards the mouse, then move 10 steps.\nSelect Shark 2 — it already has Green Flag + set Score to 0 + forever from Part 1, we only add the two mouse blocks inside forever."
      ),
      s(
        "12 — Mouse: point towards",
        "Aims the Shark at the mouse.\nInside Shark 2 forever, add: point towards mouse-pointer.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422025/s6.10.png",
        ]
      ),
      s(
        "13 — Mouse: move 10 steps",
        "Swims the Shark towards the mouse.\nAfter point towards, add: move 10 steps.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422024/s9.11.png",
        ]
      ),
      s(
        "14 — Mission: octopus + mouse",
        "MISSION: Build the Octopus enemy + mouse Shark!\nOctopus: Green Flag, forever with touching Shark 2 + wait 0.1 + next costume + random position + Score -1. Shark 2: point towards mouse-pointer + move 10 steps inside forever. Press Green Flag and test!",
        ""
      ),
    ],
    challenge:
      "MISSION: Build the Octopus enemy + mouse Shark! Octopus: Green Flag, forever with touching Shark 2 + wait 0.1 + next costume + random position + Score -1. Shark: point towards mouse-pointer + move 10 steps inside forever. Press Green Flag and test!",
    quiz: [
      q(
        "Fish gives +1 but Octopus gives -1. How do you tell which touch happened?",
        [
          "Both use touching Shark 2? but Fish adds Score +1 and Octopus adds Score -1",
          "Both add Score +1",
          "Octopus uses if on edge, bounce",
          "Fish uses point towards mouse-pointer",
        ],
        0,
        "Same touching check, opposite results. Fish is food +1, Octopus is enemy -1. The Score block tells them apart.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.8.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.8.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789419361/s5.8.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422025/s6.10.png"],
          ],
        }
      ),
      q(
        "Score drops from 5 to -8 in one touch of the Octopus. What is missing?",
        [
          "next costume",
          "go to random position",
          "wait 0.1 seconds inside touching Shark 2? before escaping",
          "when green flag clicked",
        ],
        2,
        "Without wait the -1 fires every frame while touching. A tiny wait makes it lose one point per catch.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.5.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.6.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.7.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.5.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.2.png"],
          ],
        }
      ),
      q(
        "The Octopus teleports but looks frozen. Which pair makes it look alive while escaping?",
        [
          "wait 0.1 seconds + next costume before go to random position",
          "set Score to 0 + forever",
          "point in direction 90 + change x by 10",
          "stop all + switch backdrop",
        ],
        0,
        "Wait smooths the catch, next costume switches arms and face, then it jumps away.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.6.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.7.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.7.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.3.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.13.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.15.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974722/s2.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png",
            ],
          ],
        }
      ),
      q(
        "Shark follows the mouse but spins in circles. Which mouse pair is correct and where?",
        [
          "change x by 10 + change y by 10 outside forever",
          "point towards mouse-pointer + move 10 steps inside Shark forever",
          "go to random position + next costume inside forever",
          "wait 0.1 + change Score by -1 inside forever",
        ],
        1,
        "Point towards aims at the mouse each frame, move 10 swims to it. Both must stay inside forever to keep following.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422025/s6.10.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422024/s9.11.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974892/s3.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422025/s6.10.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422024/s9.11.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.3.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422015/s6.8.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s7",
    number: 7,
    month: 2,
    phase: 2,
    kind: "core",
    title: "Ping Pong Game - Part 1",
    subtitle: "Ball mastery — make the ball move and bounce!",
    intro:
      "In this session, we build Ball Mastery in the Ping Pong game (Session 2). We meet the Ball, choose the Neon Tunnel backdrop, add the Ball and Paddle sprites, draw the red line, then build the full Ball Blocks: Green Flag start, backdrop switch, starting position, diagonal direction, and forever moving with bounce, paddle hits, and sound.",
    accent: "from-violet-500/20 to-purple-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Build the Ball code: stage, position, direction, and forever bouncing.",
    successCriteria: [
      "Choose Neon Tunnel backdrop with Ball + Paddle sprites",
      "Start with Green Flag + switch backdrop to Neon Tunnel",
      "Place the Ball at x: 20 y: 150 and point in direction 45",
      "Bounce forever with edge bounce + move 15 steps + paddle hits",
      "Finish mission: make the ball faster from 15 to 25 steps",
    ],
    commonMistake:
      "Building the Ball code on the wrong sprite, or forgetting forever so the Ball moves once and stops.",
    sections: [
      s(
        "1 — Game",
        "Start with the Ball in the Ping Pong game.\n• Yellow ball is the star — it moves and bounces off the walls.\n• Neon Tunnel is the stage, green Paddle waits below.\n• Make it faster in the mission: from 15 to 25 steps.\nWatch the video below, then build the game step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789423314/Scratch_3.29.1_2026-08-28_15-45-22.mp4",
        ]
      ),
      s(
        "2 — Backdrop: Choose a Backdrop",
        "Click Choose a Backdrop at the bottom right to open the backdrop gallery.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.1.png",
        ]
      ),
      s(
        "3 — Backdrop: Neon Tunnel",
        "Choose the Space category, then choose Neon Tunnel — the blue glowing tunnel. This is the stage where the ball bounces.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.2.png",
        ]
      ),
      s(
        "4 — Sprite: Delete Cat",
        "Delete the default Cat sprite (Sprite1) so the stage is clean for the game. Click the trash icon on Sprite1.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.3.png",
        ]
      ),
      s(
        "5 — Sprite: Choose a Sprite",
        "Click Choose a Sprite at the bottom to open the sprite gallery.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.4.png",
        ]
      ),
      s(
        "6 — Sprite: Ball",
        "Choose Ball — the yellow ball. The Ball is the star of the game! It moves around and bounces off the walls.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422549/s7.5.png",
        ]
      ),
      s(
        "7 — Sprite: Choose a Sprite again",
        "Click Choose a Sprite again to add the player bar.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.6.png",
        ]
      ),
      s(
        "8 — Sprite: Paddle",
        "Type paddle in Search, then choose Paddle — the green paddle. It waits below to hit the ball.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.7.png",
        ]
      ),
      s(
        "9 — Sprites: Ball + Paddle ready",
        "The Ball and Paddle sprites are now on the stage with 2 Backdrops.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.8.png",
        ]
      ),
      s(
        "10 — Stage: open Backdrops",
        "Click the Backdrops tab at the top to edit the stage. We will draw the red Game Over line.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.9.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.10.png",
        ]
      ),
      s(
        "11 — Draw: red line",
        "Select the Rectangle tool, pick red color, then draw a red line at the bottom of the Neon Tunnel. The Ball will touch it when you miss.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.11.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422736/s7.12.png",
        ]
      ),
      s(
        "12 — Ball Blocks",
        "Now we program the Ball! We will build: the start trigger, stage switch, starting position, direction, then forever moving with bounce, move steps, paddle hits, sound, and surprise turn."
      ),
      s(
        "13 — Meet: Ball",
        "The Ball is the star of the game! It moves around and bounces off the walls.\nSelect the Ball sprite — all the blocks below live on the Ball, not on the Paddle."
      ),
      s(
        "14 — Start: green flag",
        "This block starts the game when the Green Flag is clicked.\nSelect the Ball sprite, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.13.png",
        ]
      ),
      s(
        "15 — Stage: Neon Tunnel",
        "This block switches the stage to the Neon Tunnel backdrop.\nUnder Green Flag, add: switch backdrop to Neon Tunnel.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png",
        ]
      ),
      s(
        "16 — Position: starting point",
        "This block sets the ball's starting position using X and Y.\nAdd: go to x: 20 y: 150.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.15.png",
        ]
      ),
      s(
        "17 — Direction: 45",
        "This block points the ball in a diagonal direction.\nAdd: point in direction 45.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.16.png",
        ]
      ),
      s(
        "18 — Loop: keep checking",
        "This Forever block keeps the ball moving throughout the game.\nUnder the direction block, add: forever around all the moving blocks below.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.17.png",
        ]
      ),
      s(
        "19 — Bounce: if on edge",
        "Bounces the ball when it hits the wall.\nInside forever, add: if on edge, bounce.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
        ]
      ),
      s(
        "20 — Move: 15 steps",
        "Makes the ball fly across the stage.\nInside forever, add: move 15 steps.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
        ]
      ),
      s(
        "21 — Hit: touching Paddle",
        "Checks if the ball hits the paddle.\nInside forever, add: if touching Paddle? then.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png",
        ]
      ),
      s(
        "22 — Sound: Water Drop",
        "Plays a sound on every paddle hit.\nInside the hit condition, add: start sound Water Drop.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.21.png",
        ]
      ),
      s(
        "23 — Turn: surprise direction",
        "Sends the ball back in a surprise direction.\nInside the hit condition, add: turn pick random 160 to 200 degrees.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.22.png",
        ]
      ),
      s(
        "24 — Move: push away + test",
        "Pushes the ball away after the surprise turn.\nInside the hit condition, add: move 15 steps. Then check the whole stack: Green Flag + backdrop + position + direction + forever with bounce, move, and paddle hits. Press Green Flag and watch it bounce!",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.23.png",
        ]
      ),
      s(
        "25 — Mission: faster ball",
        "MISSION: Make the ball move faster! Change the steps from 15 to 25.\nOpen the Ball code, change move 15 steps to move 25 steps, press Green Flag, and watch it fly.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.24.png",
        ]
      ),
    ],
    challenge:
      "MISSION: Make the ball move faster! Build the full Ball code: Green Flag + switch backdrop to Neon Tunnel + go to x: 20 y: 150 + point in direction 45 + forever with edge bounce + move 15 + touching Paddle (Water Drop + turn random 160 to 200 + move 15). Then change 15 to 25 and test!",
    quiz: [
      q(
        "The Ball never appears in Neon Tunnel when you press Green Flag. Which start pair is missing on the Ball?",
        [
          "point in direction 45 + move 15 steps",
          "if on edge, bounce + if touching Paddle?",
          "when green flag clicked + switch backdrop to Neon Tunnel",
          "go to x: 20 y: 150 + turn random 160 to 200",
        ],
        2,
        "Green Flag starts the Ball code and switch backdrop forces Neon Tunnel. Without them the stage stays wrong.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.13.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.16.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.13.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.15.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.22.png",
            ],
          ],
        }
      ),
      q(
        "Why does the Ball use go to x: 20 y: 150 plus point in direction 45?",
        [
          "To make the Ball faster from 15 to 25 steps",
          "To start at the same top spot each game and fly diagonally",
          "To play Water Drop sound",
          "To delete the Paddle",
        ],
        1,
        "Fixed X Y gives a fair start every run. Direction 45 aims diagonally so bounces are interesting.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.15.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.16.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.24.png",
            ],
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.21.png"],
            undefined,
          ],
        }
      ),
      q(
        "The Ball flies once then freezes in the wall. What keeps it moving and bouncing?",
        [
          "switch backdrop to Neon Tunnel",
          "start sound Water Drop",
          "forever with if on edge, bounce + move 15 steps inside",
          "go to x: 20 y: 150 once",
        ],
        2,
        "Forever repeats the flight, edge bounce turns it at walls, move 15 pushes it. One move alone stops.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.17.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.21.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.17.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.15.png"],
          ],
        }
      ),
      q(
        "The Ball hits the Paddle silently and passes straight through. Which hit set is complete?",
        [
          "if on edge, bounce + move 15 steps",
          "when green flag clicked + switch backdrop to Neon Tunnel",
          "go to x: 20 y: 150 + point in direction 45",
          "if touching Paddle? then start sound Water Drop + turn pick random 160 to 200 + move 15 steps",
        ],
        3,
        "Touching Paddle detects the hit, Water Drop rewards it, random turn sends it back with surprise, move pushes away.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.13.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.14.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.15.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.16.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.21.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.22.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.23.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s8",
    number: 8,
    month: 2,
    phase: 2,
    kind: "core",
    title: "Ping Pong Game - Part 2",
    subtitle: "Paddle mastery — move and control the game!",
    intro:
      "In this session, we build Paddle Mastery in the Ping Pong game. We meet the Paddle — the player-controlled bar — then build its full code: Green Flag trigger, forever keep checking, move right with the right arrow, and move left with the left arrow.",
    accent: "from-violet-500/20 to-purple-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Move the Paddle left and right with the arrow keys inside forever.",
    successCriteria: [
      "Select the Paddle and start with Green Flag",
      "Keep checking the keyboard inside forever",
      "Move right 10 steps with right arrow + change x by 10",
      "Move left 10 steps with left arrow + change x by -10",
      "Finish mission: make the paddle move faster",
    ],
    commonMistake:
      "Putting the key checks outside forever so the Paddle moves once, or mixing up change x by 10 and change x by -10.",
    sections: [
      s(
        "1 — Game",
        "Start with the Ball in the Ping Pong game.\n• Yellow ball is the star — it moves and bounces off the walls.\n• Neon Tunnel is the stage, green Paddle waits below.\n• Make it faster in the mission: from 15 to 25 steps.\nWatch the video below, then build the game step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789423314/Scratch_3.29.1_2026-08-28_15-45-22.mp4",
        ]
      ),
      s(
        "2 — Meet: Paddle",
        "Meet the Paddle!\nThe Paddle is the player-controlled bar that moves left and right to hit the ball.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423325/s8.1.png",
        ]
      ),
      s(
        "3 — Paddle code",
        "Now we program the Paddle! We will build: the trigger, keep checking, move right, and move left."
      ),
      s(
        "4 — Trigger: green flag",
        "Starts the Paddle's code.\nSelect the Paddle sprite, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423325/s8.2.png",
        ]
      ),
      s(
        "5 — Loop: keep checking",
        "Keeps checking the keyboard while the game is running.\n",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png",
        ]
      ),
      s(
        "6 — Direction: right arrow",
        "Checks the right arrow before moving the paddle.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
        ]
      ),
      s(
        "7 — Move: 10 steps right",
        "Moves the paddle 10 steps to the right.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
        ]
      ),
      s(
        "8 — Direction: left arrow",
        "Checks the left arrow before moving the paddle.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.6.png",
        ]
      ),
      s(
        "9 — Move: 10 steps left",
        "Moves the paddle 10 steps to the left.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
        ]
      ),
      s(
        "10 — Mission: faster paddle",
        "MISSION: Make the paddle move faster!\nChange 10 steps to a bigger number, press Green Flag, and test it.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.8.png",
        ]
      ),
    ],
    challenge:
      "MISSION: Make the paddle move faster! Build the full Paddle code: Green Flag + forever with right-arrow + change x by 10 and left-arrow + change x by -10. Test with Green Flag, then make it faster!",
    quiz: [
      q(
        "The Paddle moves once then ignores the arrows. Where must the arrow checks live?",
        [
          "Outside forever, under Green Flag only",
          "Inside forever so keys are checked every frame",
          "Inside touching Paddle? then",
          "Inside if on edge, bounce",
        ],
        1,
        "Keys must be polled all the time. Outside forever they run once at start and never again.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789423325/s8.2.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png"],
          ],
        }
      ),
      q(
        "Which pair moves the Paddle right, and which moves it left?",
        [
          "right arrow + change x by 10 for right, left arrow + change x by -10 for left",
          "right arrow + change x by -10 for right, left arrow + change x by 10 for left",
          "right arrow + change y by 10 for right, left arrow + change y by -10 for left",
          "right arrow + move 15 steps for right, left arrow + move 15 steps for left",
        ],
        0,
        "X moves sideways. +10 goes right, -10 goes left. Y would move up-down, not sideways.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.11.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png"],
          ],
        }
      ),
      q(
        "The Paddle goes left when you press right. What is swapped?",
        [
          "Green Flag and forever are swapped",
          "change x by 10 and change x by -10 are swapped between the two arrow checks",
          "Ball and Paddle sprites are swapped",
          "Neon Tunnel and Blue Sky are swapped",
        ],
        1,
        "Right must hold +10 and left must hold -10. Swapped values reverse the controls.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423325/s8.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422549/s7.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423325/s8.1.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s2.png",
            ],
          ],
        }
      ),
      q(
        "You want a faster Paddle for the mission but it still misses the Ball. Which change is correct?",
        [
          "Delete forever and use one move",
          "Change backdrop to Blue Sky",
          "Change move 15 steps on the Ball to 5 steps",
          "Change both change x values to a bigger number and keep them inside forever",
        ],
        3,
        "Bigger X steps mean faster slides. They must stay inside forever so speed applies every frame.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.8.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s2.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423326/s8.3.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s9",
    number: 9,
    month: 3,
    phase: 3,
    kind: "core",
    title: "Ping Pong Game - Part 3",
    subtitle: "Paddle mastery — move with the mouse and detect a loss!",
    intro:
      "In this session, we build Paddle Mastery in the Ping Pong game. We meet the Paddle — the player-controlled bar that follows the mouse — then build its mouse-control code: Green Flag trigger, forever keep checking, set x to mouse x, then detect a loss when the Ball touches the red edge and show Game Over with switch backdrop and stop all.",
    accent: "from-violet-500/20 to-purple-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal: "Move the paddle with the mouse smoothly and detect a loss!",
    successCriteria: [
      "Meet the Paddle that follows the mouse to keep the ball in play",
      "Start mouse-control with Green Flag + forever keep checking",
      "Follow the mouse with set x to mouse x",
      "Check a loss with if touching color red?",
      "Show Game Over with switch backdrop to next backdrop + stop all",
    ],
    commonMistake:
      "Putting set x to mouse x outside forever so the Paddle moves once, or checking touching color on the Paddle instead of the Ball, or forgetting stop all so the game keeps running after Game Over.",
    sections: [
      s(
        "1 — Game",
        "Start with the Ball in the Ping Pong game.\n• Yellow ball is the star — it moves and bounces off the walls.\n• Neon Tunnel is the stage, green Paddle waits below.\n• Make it faster in the mission: from 15 to 25 steps.\nWatch the video below, then build the game step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789423314/Scratch_3.29.1_2026-08-28_15-45-22.mp4",
        ]
      ),
      s(
        "2 — Meet: Paddle",
        "Meet the Paddle!\nThe paddle follows the mouse to help keep the ball in play.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.1.png",
        ]
      ),
      s(
        "3 — Paddle + Loss code",
        "Now we program the Paddle + Loss! We will build: the trigger, mouse control, follow mouse X, keep checking, then the Ball loss check and Game Over."
      ),
      s(
        "4 — Trigger: green flag",
        "Starts the Paddle's code.\nSelect the Paddle sprite,",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.2.png",
        ]
      ),
      s(
        "5 — Block 1: Mouse Control",
        "This block starts the mouse-control script when the Green Flag is clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.3.png",
        ]
      ),
      s(
        "6 — Block 2: Follow Mouse X",
        "This block moves the paddle to the mouse X position.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.4.png",
        ]
      ),
      s(
        "7 — Block 3: Keep Checking",
        "This Forever loop keeps checking the mouse while the game runs.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.5.png",
        ]
      ),
      s(
        "8 — Ball code",
        "Now we detect a loss! We will build: the loss check, Game Over backdrop, and stop all."
      ),
      s(
        "9 — Loss check: touching color red?",
        "This condition checks whether the ball has reached the losing edge.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.6.png",
        ]
      ),
      s(
        "10 — Block 5: Game Over backdrop",
        "This block shows Game Over when the ball is missed.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.7.png",
        ]
      ),
      s(
        "11 — Block 5: Game Over stop",
        "This block stops the game when the ball is missed.backdrop to next backdrop, then stop all.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.8.png",
        ]
      ),
      s(
        "12 — Mission: smooth paddle + Game Over",
        "MISSION: Make the paddle follow the mouse smoothly and show Game Over when the ball is missed!",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.9.png",
        ]
      ),
    ],
    challenge:
      "MISSION: Make the paddle follow the mouse smoothly and show Game Over when the ball is missed! Build Paddle code: Green Flag + forever + set x to mouse x. Build Ball loss: if touching color red? then switch backdrop to next backdrop + stop all. Press Green Flag and test!",
    quiz: [
      q(
        "The Paddle jumps to the mouse once then freezes. Which mouse set keeps it following smoothly?",
        [
          "when green flag clicked + set x to mouse x once outside forever",
          "when green flag clicked + forever with set x to mouse x inside",
          "when green flag clicked + change x by 10 inside forever",
          "when green flag clicked + switch backdrop to next backdrop",
        ],
        1,
        "Set x to mouse x must run every frame inside forever. Once outside it never follows again.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.4.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.5.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.4.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.4.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.7.png",
            ],
          ],
        }
      ),
      q(
        "Who should check touching red color — Ball or Paddle — and why?",
        [
          "Paddle, because it follows the mouse",
          "Ball, because it is the one that falls and touches the red losing edge",
          "Both, because both touch red at the same time",
          "Neither, red is only decoration",
        ],
        1,
        "The Ball travels down and hits the red line on a miss. The Paddle stays above it, so Ball owns the loss check.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.6.png",
          ],
          optionImages: [
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.6.png"],
            undefined,
            undefined,
          ],
        }
      ),
      q(
        "Game Over appears but the Ball keeps bouncing behind it. What is missing after switch backdrop?",
        [
          "move 15 steps",
          "set x to mouse x",
          "stop all to end all scripts",
          "change x by 10",
        ],
        2,
        "Switch backdrop only changes the picture. Stop all freezes Ball and Paddle so the game truly ends.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.7.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.8.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.4.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.8.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png"],
          ],
        }
      ),
      q(
        "Which full loss set correctly detects a miss and ends the game?",
        [
          "if touching Paddle? then start sound Water Drop",
          "if on edge, bounce + move 15 steps",
          "if touching color red? then switch backdrop to next backdrop + stop all",
          "if key right arrow pressed? then change x by 10",
        ],
        2,
        "Touching red checks the losing edge, switch backdrop shows Game Over, stop all ends the game.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.6.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.20.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.21.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.18.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789422544/s7.19.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.6.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.7.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789424917/s10.8.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789423328/s8.5.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s10",
    number: 10,
    month: 3,
    phase: 3,
    kind: "core",
    title: "Calculator - Part 1",
    subtitle: "Calculator setup — robot, backdrop, and variables",
    intro:
      "In this session, we start the Calculator project. We delete the Cat, choose the purple Space City backdrop, add the Retro Robot sprite, create three variables — First Number, The Operator, Second Number — then reset them to 0 and say welcome when Green Flag is clicked.",
    accent: "from-orange-500/20 to-amber-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Set up the Calculator stage, robot, variables, reset, and welcome message.",
    successCriteria: [
      "Delete Sprite1 Cat and choose the Space City 2 backdrop",
      "Add the Retro Robot sprite at x: 112 y: -53",
      "Create First Number, The Operator, and Second Number for all sprites",
      "Reset all three variables to 0 on Green Flag",
      "Say welcome for 2 seconds once before the loop",
    ],
    commonMistake:
      "Creating variables for one sprite only so the robot cannot see them, or forgetting to reset them to 0 so old answers stay on the stage.",
    sections: [
      s(
        "1 — Game",
        "Start with the Calculator project.\n• Retro Robot asks for two numbers and an operator.\n• First Number, The Operator, and Second Number show on the stage.\n• The robot says each answer out loud for 2 seconds.\nBuild it step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789493552/calc.mp4",
        ]
      ),
      s(
        "2 — Sprite: Delete Cat",
        "Delete the default Cat sprite (Sprite1) so the stage is clean for the calculator. Click the trash icon on Sprite1.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.1.png",
        ]
      ),
      s(
        "3 — Backdrop: Space City 2",
        "Click Choose a Backdrop, open the Space category, then choose Space City 2 — the purple moon city with stars. This is the robot's planet.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.3.png",
        ]
      ),
      s(
        "4 — Sprite: Retro Robot",
        "Click Choose a Sprite, type robot in Search, then choose Retro Robot — the grey robot with orange feet. Place it on the right side at x: 112 y: -53, Size 100.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.4.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.5.png",
        ]
      ),
      s(
        "5 — Variable: Make First Number",
        "Go to Variables > Make a Variable. Type First Number, choose For all sprites, then OK. It stores the first typed number.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.6.png",
        ]
      ),
      s(
        "6 — Variable: Make The Operator",
        "Make a Variable again. Type The Operator, choose For all sprites, then OK. It stores the symbol: + - * or /.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.7.png",
        ]
      ),
      s(
        "7 — Variable: Make Second Number",
        "Make a Variable again. Type Second Number, choose For all sprites, then OK. It stores the second typed number.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.8.png",
        ]
      ),
      s(
        "8 — Calculator code",
        "Now we program the Calculator! We will build: the Green Flag trigger, reset to 0, and the welcome message. Ask blocks come in Part 2, operations in Part 3."
      ),
      s(
        "9 — Trigger: green flag",
        "Starts the calculator's code.\nSelect Retro Robot, then add: when green flag clicked.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.9.png",
        ]
      ),
      s(
        "10 — Reset: numbers to 0",
        "Clears old answers so every run starts fresh.\nUnder Green Flag, add: set First Number to 0, set The Operator to 0, set Second Number to 0.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png",
        ]
      ),
      s(
        "11 — Welcome: say message",
        "Greets the user once before asking.\nAdd: say Welcome to your Calculator for 2 seconds. Keep it above forever so it runs once, not every loop.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png",
        ]
      ),
      s(
        "12 — Mission: setup test",
        "MISSION: Build the setup and test it! Press Green Flag — the stage must show 0 0 0 and the robot says welcome once. If old numbers stay, your reset blocks are missing."
      ),
    ],
    challenge:
      "MISSION: Build the Calculator setup: delete Cat, Space City 2 backdrop, Retro Robot at x: 112 y: -53, three For-all-sprites variables, Green Flag with all three set to 0 plus say Welcome to your Calculator for 2 seconds. Press Green Flag and check the stage shows 0 0 0.",
    quiz: [
      q(
        "Why do we need three variables instead of one?",
        [
          "One variable calculates faster",
          "To delete the Cat sprite",
          "To choose the Space backdrop",
          "First Number and Second Number hold the two inputs, The Operator holds + - * /",
        ],
        3,
        "Each answer needs its own box. Two numbers plus the symbol means three variables.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.6.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.7.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.8.png",
          ],
        }
      ),
      q(
        "What should the stage show right after Green Flag, before typing anything?",
        [
          "First Number 0, The Operator 0, Second Number 0",
          "First Number 7, The Operator +, Second Number 3",
          "All variables hidden",
          "Score 0 and Lives 3",
        ],
        0,
        "Reset to 0 clears last run's answers so the new calculation starts clean.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.3.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.5.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.7.png",
            ],
            undefined,
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s14.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1788974219/s15.png",
            ],
          ],
        }
      ),
      q(
        "The robot says welcome again and again without stopping. What is wrong?",
        [
          "The variables are For this sprite only",
          "say welcome sits inside forever so it repeats every loop",
          "The backdrop is wrong",
          "The robot is at x: 112",
        ],
        1,
        "Welcome belongs above forever to run once. Inside forever it greets on every round.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.6.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.4.png"],
          ],
        }
      ),
      q(
        "Old answer 7 still shows after pressing Green Flag. What is missing?",
        [
          "say welcome for 2 seconds",
          "Space City 2 backdrop",
          "set First Number, The Operator, and Second Number to 0 under Green Flag",
          "Retro Robot sprite",
        ],
        2,
        "Without reset blocks the variables keep last run's values. Set all three to 0 at the start.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.4.png"],
          ],
        }
      ),
    ],
  },

  {
    id: "s11",
    number: 11,
    month: 3,
    phase: 3,
    kind: "core",
    title: "Calculator - Part 2",
    subtitle: "Calculator input — ask and save answers",
    intro:
      "In this session, we build the input loop. Inside forever the robot asks for the first number, the operator, and the second number — and saves each typed answer into its variable with set ... to answer.",
    accent: "from-orange-500/20 to-amber-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Ask for two numbers and an operator in a forever loop and save each answer.",
    successCriteria: [
      "Keep Green Flag + reset + welcome + forever from Part 1",
      "Ask What's the First Number? then set First Number to answer",
      "Ask What's the Operator? then set The Operator to answer",
      "Ask What's the Second Number? then set Second Number to answer",
      "Test by typing and watching the variables change on the stage",
    ],
    commonMistake:
      "Asking without set ... to answer so the typed value vanishes, or putting ask blocks outside forever so the calculator runs once and stops.",
    sections: [
      s(
        "1 — Game",
        "Start with the Calculator project.\n• Retro Robot asks for two numbers and an operator.\n• First Number, The Operator, and Second Number show on the stage.\n• The robot says each answer out loud for 2 seconds.\nBuild it step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789493552/calc.mp4",
        ]
      ),
      s(
        "2 — Input code",
        "Now we build the input! We will add: forever, three ask blocks, and three set-to-answer blocks. Part 1 reset + welcome already sit above."
      ),
      s(
        "3 — Loop: forever",
        "Repeats the questions for every new calculation.\nUnder the welcome block, add: forever. Everything below lives inside it.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png",
        ]
      ),
      s(
        "4 — Ask: first number",
        "Asks the user to type the first value.\nInside forever, add: ask What's the First Number? and wait.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
        ]
      ),
      s(
        "5 — Save: First Number to answer",
        "Keeps what was typed.\nAdd: set First Number to answer. Answer always holds the last typed value.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.3.png",
        ]
      ),
      s(
        "6 — Ask: operator",
        "Asks for the symbol.\nAdd: ask What's the Operator? and wait. The user types + - * or /.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
        ]
      ),
      s(
        "7 — Save: The Operator to answer",
        "Keeps the symbol.\nAdd: set The Operator to answer.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.5.png",
        ]
      ),
      s(
        "8 — Ask: second number",
        "Asks for the last input.\nAdd: ask What's the Second Number? and wait.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
        ]
      ),
      s(
        "9 — Save: Second Number to answer",
        "Keeps it.\nAdd: set Second Number to answer.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.7.png",
        ]
      ),
      s(
        "10 — Mission: test input",
        "MISSION: Type answers and watch! Press Green Flag, type 7, then +, then 3. First Number must show 7, The Operator +, Second Number 3. If a box stays 0, its set-to-answer block is missing."
      ),
    ],
    challenge:
      "MISSION: Build the input loop: forever with ask First Number + set First to answer, ask Operator + set Operator to answer, ask Second Number + set Second to answer. Test with 7, +, 3 and watch the stage boxes change.",
    quiz: [
      q(
        "What do ask ... and wait plus set ... to answer do together?",
        [
          "Change the backdrop to Space City 2",
          "Show a typing box, wait for typing, then store the typed value with set ... to answer",
          "Play a sound for 2 seconds",
          "Move Retro Robot to x: 112",
        ],
        1,
        "Ask pops the typing box and pauses. Answer carries the typed text, and set saves it into the variable.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.3.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.3.png",
            ],
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.4.png"],
          ],
        }
      ),
      q(
        "Second Number always stays 0 no matter what you type. What is missing?",
        [
          "The Space backdrop",
          "The welcome message",
          "forever around the asks",
          "set Second Number to answer right after its ask",
        ],
        3,
        "Ask alone shows the box then throws the typing away. Only set ... to answer saves it.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.7.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.7.png"],
          ],
        }
      ),
      q(
        "The calculator asks once, answers once, then never asks again. Why?",
        [
          "The ask blocks sit outside forever so they run a single time",
          "The variables are For all sprites",
          "The robot says welcome",
          "The operator typed was +",
        ],
        0,
        "Questions must live inside forever. Outside it they run once at Green Flag and stop.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.6.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png"],
          ],
        }
      ),
      q(
        "Which ask order matches the code and the three save blocks?",
        [
          "Operator, First Number, Second Number",
          "Second Number, Operator, First Number",
          "First Number, Operator, Second Number",
          "Operator, Second Number, First Number",
        ],
        2,
        "The code asks first, then operator, then second — and each set saves to its matching variable in the same order.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
          ],
          optionImages: [
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
            ],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.4.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.6.png",
            ],
          ],
        }
      ),
    ],
  },

  {
    id: "s12",
    number: 12,
    month: 3,
    phase: 3,
    kind: "core",
    title: "Calculator - Part 3",
    subtitle: "Calculator operations — check the symbol and say the answer",
    intro:
      "In this session, we finish the Calculator. Inside forever, after the three answers are saved, four conditions check The Operator: if + say the sum, if - say the difference, if * say the product, if / say the quotient — each for 2 seconds.",
    accent: "from-orange-500/20 to-amber-500/5",
    // دي صورة سكراتش الخلفية للدرس - نفس صورة الكورس
    heroImage: "/curriculum/scratch/logoscratch.png",
    learningGoal:
      "Check The Operator with four if conditions and say each result for 2 seconds.",
    successCriteria: [
      "Check if The Operator = + then say First + Second",
      "Check if The Operator = - then say the difference",
      "Check if The Operator = * then say the product",
      "Check if The Operator = / then say the quotient",
      "Say each result for 2 seconds and finish the mission",
    ],
    commonMistake:
      "Checking First Number instead of The Operator, or forgetting the say block inside the condition so correct math stays silent.",
    sections: [
      s(
        "1 — Game",
        "Start with the Calculator project.\n• Retro Robot asks for two numbers and an operator.\n• First Number, The Operator, and Second Number show on the stage.\n• The robot says each answer out loud for 2 seconds.\nBuild it step by step using Scratch blocks.",
        undefined,
        undefined,
        undefined,
        undefined,
        // ده فيديو اللعبة - بيشتغل بمشغل تحت الشرح
        [
          "https://res.cloudinary.com/alhiemg0/video/upload/v1789493552/calc.mp4",
        ]
      ),
      s(
        "2 — Operations code",
        "Now we finish the math! We will build four checks inside forever, after the three saves: one if for each of + - * /. Each if holds its own say.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.1.png",
        ]
      ),
      s(
        "3 — Add: if + then say sum",
        "Adds when the symbol is plus.\nInside forever after the saves, add: if The Operator = + then, with say First Number + Second Number for 2 seconds inside.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.2.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.3.png",
        ]
      ),
      s(
        "4 — Subtract: if - then say difference",
        "Subtracts when the symbol is minus.\nAdd: if The Operator = - then, with say First Number - Second Number for 2 seconds inside.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.4.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.5.png",
        ]
      ),
      s(
        "5 — Multiply: if * then say product",
        "Multiplies when the symbol is star.\nAdd: if The Operator = * then, with say First Number * Second Number for 2 seconds inside.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.6.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.7.png",
        ]
      ),
      s(
        "6 — Divide: if / then say quotient",
        "Divides when the symbol is slash.\nAdd: if The Operator = / then, with say First Number / Second Number for 2 seconds inside.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.8.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.9.png",
        ]
      ),
      s(
        "7 — Full stack: test everything",
        "Checks the whole Calculator together.\nGreen Flag + reset 0 0 0 + welcome + forever with 3 asks, 3 saves, and 4 ifs. Type 20 / 4 and the robot must say 5.",
        "",
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.10.png",
        ]
      ),
      s(
        "8 — Mission: calculator challenge",
        "MISSION: Test all four operations! Try 9 + 4 = 13, 9 - 4 = 5, 7 * 6 = 42, 20 / 4 = 5. Then type x as the operator — nothing should answer, because no condition matches x."
      ),
    ],
    challenge:
      "MISSION: Build all four operations inside forever after the saves: if + say sum, if - say difference, if * say product, if / say quotient, each for 2 seconds. Test 9+4, 9-4, 7*6, 20/4, then type x and confirm silence.",
    quiz: [
      q(
        "You type 7, then *, then 6. Which condition runs?",
        [
          "if The Operator = * then",
          "if The Operator = + then",
          "if First Number = * then",
          "if Second Number = 6 then",
        ],
        0,
        "Conditions check The Operator symbol, not the numbers. Star matches multiply.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.6.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.6.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.2.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.6.png"],
            undefined,
          ],
        }
      ),
      q(
        "You type + with the right numbers saved, but the robot stays silent. What is wrong?",
        [
          "forever is missing",
          "The welcome message is missing",
          "The + condition checks First Number instead of The Operator, or its say block is missing",
          "The backdrop is wrong",
        ],
        2,
        "The if must compare The Operator to +. Checking a number never matches a symbol, and without say nothing speaks.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.2.png",
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.3.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.1.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png"],
            [
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.2.png",
              "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.3.png",
            ],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.2.png"],
          ],
        }
      ),
      q(
        "What does say First Number + Second Number for 2 seconds do with 9 and 4?",
        [
          "Hides both variables",
          "Calculates 9 + 4 and says 13 for 2 seconds",
          "Sets Score to 0",
          "Asks the next question at once",
        ],
        1,
        "The + joins the two stored values into 13, say speaks it, and 2 seconds keeps it readable.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.3.png",
          ],
          optionImages: [
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.3.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789417669/s4.19.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789494711/ss2.2.png"],
          ],
        }
      ),
      q(
        "You type x as the operator. What happens and why?",
        [
          "Says 0 because of the reset",
          "Crashes the project",
          "Says welcome again",
          "Nothing answers because no if matches x — only + - * / have conditions",
        ],
        3,
        "The four ifs cover four symbols only. An unknown symbol matches none, so every say stays silent.",
        {
          questionImages: [
            "https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.1.png",
          ],
          optionImages: [
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.10.png"],
            undefined,
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789493955/s1.11.png"],
            ["https://res.cloudinary.com/alhiemg0/image/upload/v1789495849/ss3.1.png"],
          ],
        }
      ),
    ],
  },
];

export const problemSolvingLessons: CurriculumLesson[] = [];
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
      "Create the Apple Collector game setup and build the first falling-apple behavior.",
    successCriteria: [
      "Prepare the Apple Collector game",
      "Choose Blue Sky backdrop and add Apple + Bowl sprites",
      "Create Score and Lives variables",
      "Reset Score to 0 and Lives to 3",
      "Make the apple start at y = 180 and fall by -5",
    ],
    commonMistake:
      "Forgetting to reset Score and Lives when the Green Flag is clicked, or forgetting to place the apple at the top before the falling loop.",
  },
  s2: {
    learningGoal:
      "Complete the Apple Collector logic using conditions, random position, Lives, sound, and Score.",
    successCriteria: [
      "Check when the apple reaches y < -180",
      "Move the apple to a random position and back to y = 180",
      "Remove one life when the apple is missed",
      "End the game when Lives = 0",
      "Play Chomp and add 1 to Score when the Bowl catches the apple",
    ],
    commonMistake:
      "Putting the catch condition in the wrong place or forgetting to send the apple back to the top after it is missed or caught.",
  },
  s3: {
    learningGoal:
      "Move the Bowl with the arrow keys and set a win mission at Score 10.",
    successCriteria: [
      "Start the Bowl's code with Green Flag",
      "Place the Bowl at x: 0 y: -141",
      "Keep checking the keyboard inside forever",
      "Move right 10 steps and left 10 steps with arrow keys",
      "Win when Score = 10",
    ],
    commonMistake:
      "Putting the key checks outside forever so the Bowl moves once, or mixing up change x by 10 and change x by -10.",
  },
  s4: {
    learningGoal:
      "Build the Hungry Shark stage and program Shark 2 to swim in all directions with Score reset and edge bounce.",
    successCriteria: [
      "Choose Underwater 1 backdrop and delete Sprite1 Cat",
      "Add Fish, Shark 2, and Octopus sprites",
      "Swim up with up arrow + change y by 10",
      "Swim down with down arrow + change y by -10",
      "Point right with right arrow + point in direction 90",
      "Use left-right rotation style so the shark never flips",
      "Move right with change x by 10 and left with change x by -10",
      "Reset Score to 0 on Green Flag and stay in bounds with if on edge, bounce",
    ],
    commonMistake:
      "Choosing Shark 1 instead of Shark 2, forgetting set rotation style left-right so the shark flips upside down, or putting the movement blocks without their key-pressed trigger.",
  },
  s5: {
    learningGoal:
      "Program the Shark to sense and eat the Fish, and program the Fish to escape, score points, and change colors.",
    successCriteria: [
      "Select Shark 2 and check if touching Fish",
      "Chomp with switch costume to shark2-b, wait 0.25, shark2-a",
      "Start Fish code with Green Flag + forever",
      "Sense with if touching Shark 2 then",
      "Add wait 0.1 + go to random position + change Score by 1 + next costume",
      "Finish homework mission: make the fish appear faster",
    ],
    commonMistake:
      "Putting touching Fish on the Fish sprite instead of touching Shark 2, forgetting the tiny wait so Score jumps too fast, or forgetting next costume so the fish never changes color.",
  },
  s6: {
    learningGoal:
      "Program the Octopus enemy to catch the Shark, and control the Shark with the mouse.",
    successCriteria: [
      "Meet the Octopus enemy that catches the Shark",
      "Start the Octopus code with Green Flag + forever",
      "Sense with if touching Shark 2? then",
      "Add wait 0.1 + next costume + random position + Score -1",
      "Control Shark 2 with point towards mouse-pointer",
      "Swim with move 10 steps and finish the mission",
    ],
    commonMistake:
      "Putting touching Shark 2 on the Shark sprite instead of the Octopus, forgetting the tiny wait so Score drops too fast, or forgetting next costume so the Octopus never looks alive.",
  },
  s7: {
    learningGoal:
      "Build the Ball code: stage, position, direction, and forever bouncing.",
    successCriteria: [
      "Choose Neon Tunnel backdrop with Ball + Paddle sprites",
      "Start with Green Flag + switch backdrop to Neon Tunnel",
      "Place the Ball at x: 20 y: 150 and point in direction 45",
      "Bounce forever with edge bounce + move 15 steps + paddle hits",
      "Finish mission: make the ball faster from 15 to 25 steps",
    ],
    commonMistake:
      "Building the Ball code on the wrong sprite, or forgetting forever so the Ball moves once and stops.",
  },
  s8: {
    learningGoal:
      "Move the Paddle left and right with the arrow keys inside forever.",
    successCriteria: [
      "Select the Paddle and start with Green Flag",
      "Keep checking the keyboard inside forever",
      "Move right 10 steps with right arrow + change x by 10",
      "Move left 10 steps with left arrow + change x by -10",
      "Finish mission: make the paddle move faster",
    ],
    commonMistake:
      "Putting the key checks outside forever so the Paddle moves once, or mixing up change x by 10 and change x by -10.",
  },
  s9: {
    learningGoal: "Move the paddle with the mouse smoothly and detect a loss!",
    successCriteria: [
      "Meet the Paddle that follows the mouse to keep the ball in play",
      "Start mouse-control with Green Flag + forever keep checking",
      "Follow the mouse with set x to mouse x",
      "Check a loss with if touching color red?",
      "Show Game Over with switch backdrop to next backdrop + stop all",
    ],
    commonMistake:
      "Putting set x to mouse x outside forever so the Paddle moves once, or checking touching color on the Paddle instead of the Ball, or forgetting stop all so the game keeps running after Game Over.",
  },
  s10: {
    learningGoal:
      "Set up the Calculator stage, robot, variables, reset, and welcome message.",
    successCriteria: [
      "Delete Sprite1 Cat and choose the Space City 2 backdrop",
      "Add the Retro Robot sprite at x: 112 y: -53",
      "Create First Number, The Operator, and Second Number for all sprites",
      "Reset all three variables to 0 on Green Flag",
      "Say welcome for 2 seconds once before the loop",
    ],
    commonMistake:
      "Creating variables for one sprite only so the robot cannot see them, or forgetting to reset them to 0 so old answers stay on the stage.",
  },
  s11: {
    learningGoal:
      "Ask for two numbers and an operator in a forever loop and save each answer.",
    successCriteria: [
      "Keep Green Flag + reset + welcome + forever from Part 1",
      "Ask What's the First Number? then set First Number to answer",
      "Ask What's the Operator? then set The Operator to answer",
      "Ask What's the Second Number? then set Second Number to answer",
      "Test by typing and watching the variables change on the stage",
    ],
    commonMistake:
      "Asking without set ... to answer so the typed value vanishes, or putting ask blocks outside forever so the calculator runs once and stops.",
  },
  s12: {
    learningGoal:
      "Check The Operator with four if conditions and say each result for 2 seconds.",
    successCriteria: [
      "Check if The Operator = + then say First + Second",
      "Check if The Operator = - then say the difference",
      "Check if The Operator = * then say the product",
      "Check if The Operator = / then say the quotient",
      "Say each result for 2 seconds and finish the mission",
    ],
    commonMistake:
      "Checking First Number instead of The Operator, or forgetting the say block inside the condition so correct math stays silent.",
  },
};
const addStudioNotes = (
  lesson: CurriculumLesson,
  index: number
): CurriculumLesson => {
  const note = studioNotes[lesson.id] ?? {
    learningGoal:
      "Build confidence with ${lesson.title.toLowerCase()} by breaking the idea into small, testable steps.",
    successCriteria: [
      "Explain the main idea",
      "Follow the example and change one part",
      "Solve the practice challenge and test an edge case",
    ],
    commonMistake:
      "Trying to write the whole solution at once instead of testing one small step at a time.",
  };
  return { ...lesson, ...note };
};
export const allScratchLessons = [...coreLessons, ...problemSolvingLessons].map(
  addStudioNotes
);
export const coreScratchLessonsWithStudio = allScratchLessons.filter(
  lesson => lesson.kind === "core"
);
export const problemSolvingScratchLessonsWithStudio = allScratchLessons.filter(
  lesson => lesson.kind === "problem"
);
export const curriculumPhases = [
  {
    id: 1,
    month: 1,
    en: "Apple Game + Shark Start",
    meta: "Sessions 1–4",
    color: "from-sky-300 to-blue-400",
  },
  {
    id: 2,
    month: 2,
    en: "Shark + Ping Pong",
    meta: "Sessions 5–8",
    color: "from-emerald-300 to-green-400",
  },
  {
    id: 3,
    month: 3,
    en: "Ping Pong + Calculator",
    meta: "Sessions 9–12",
    color: "from-violet-300 to-purple-400",
  },
];
