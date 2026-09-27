export type WebLessonSection = {
  title: string;
  body: string;
  code?: string;
  emoji?: string;
  images?: string[];
  caption?: string;
};
export type WebLesson = {
  id: string;
  number: number;
  month: number;
  track: "HTML" | "CSS" | "JavaScript";
  title: string;
  subtitle: string;
  intro: string;
  sections: WebLessonSection[];
  challenge: string;
  quiz: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  color: string;
};
const q = (
  question: string,
  options: string[],
  answer: number,
  explanation: string
) => ({ question, options, answer, explanation });
const s = (
  title: string,
  body: string,
  code?: string,
  extra?: Pick<WebLessonSection, "emoji" | "images" | "caption">
) => ({ title, body, code, ...extra });
export const webLessons: WebLesson[] = [
  {
    id: "html-1",
    number: 1,
    month: 1,
    track: "HTML",
    title: "Welcome to the Web!",
    subtitle: "What is a website + your first HTML page",
    intro: "Website = connected pages. HTML = the structure. Let's build it!",
    sections: [
      s(
        "Website = linked pages",
        "Pages with text, pictures, video.\nUse them to: share • connect • show work • shop.",
        undefined,
        { emoji: "🌐", caption: "Like rooms connected by doors" }
      ),
      s(
        "Front-end vs Back-end",
        "What you SEE vs hidden logic & data.\nWe build the front-end: HTML + CSS + JS.",
        undefined,
        { emoji: "🎨", caption: "Front = look • Back = brain" }
      ),
      s(
        "HTML = the skeleton",
        "HyperText Markup Language — NOT programming.\nIt builds structure, like bones of the body.",
        undefined,
        { emoji: "🦴", caption: "HTML = bones • CSS = clothes • JS = moves" }
      ),
      s(
        "Element = 3 parts",
        "Start tag + content + end tag.",
        `<h1>My First Heading</h1>`,
        { emoji: "🧩", caption: "<tag> content </tag>" }
      ),
      s(
        "Page skeleton",
        "html wraps all • head = info • body = what you see.",
        `<!doctype html>\n<html>\n  <head><title>My Page</title></head>\n  <body>\n    <h1>Hello!</h1>\n    <p>My first page.</p>\n  </body>\n</html>`,
        { emoji: "🏠", caption: "head = brain • body = face" }
      ),
      s(
        "See HTML in Google",
        "Right-click → Inspect → find <title> → change it!",
        undefined,
        { emoji: "🔍", caption: "1. Right-click  2. Inspect" }
      ),
    ],
    challenge:
      "1) Download VS Code  2) Create index.html  3) Add h1 with your name + p about your hobby.",
    quiz: q(
      "What builds page structure?",
      ["HTML", "A mouse", "A password", "A speaker"],
      0,
      "HTML builds structure — like bones."
    ),
    color: "from-cyan-500/20 to-blue-500/5",
  },
  {
    id: "html-2",
    number: 2,
    month: 1,
    track: "HTML",
    title: "Headings, Paragraphs & Lines",
    subtitle: "Organize a page so it is easy to read",
    intro:
      "Headings create a clear reading map. Paragraphs hold ideas, line breaks create a new line, and horizontal rules separate big sections.",
    sections: [
      s(
        "A heading ladder",
        "Use h1 for the main page title, then h2 and h3 for smaller sections. Keep the order logical.",
        `<h1>My Space</h1>\n<h2>My Games</h2>\n<p>I love building puzzles.</p>`
      ),
      s(
        "Readable paragraphs",
        "A paragraph is one idea. Do not put the entire page inside one huge paragraph."
      ),
      s(
        "Breaks and separators",
        "Use br for a meaningful line break and hr when two sections need a visual boundary.",
        `Line one<br>Line two\n<hr>`
      ),
    ],
    challenge:
      "Build a mini profile with one h1, two h2 headings, and three short paragraphs.",
    quiz: q(
      "Which tag represents the main heading?",
      ["<p>", "<h1>", "<br>", "<hr>"],
      1,
      "h1 is the main heading of a page."
    ),
    color: "from-sky-500/20 to-indigo-500/5",
  },
  {
    id: "html-3",
    number: 3,
    month: 1,
    track: "HTML",
    title: "Links, Images & Video",
    subtitle: "Make your page travel and tell stories",
    intro:
      "Media elements turn a page into an experience. Links connect places, images show ideas, and video adds motion.",
    sections: [
      s(
        "Hyperlinks",
        "The anchor tag uses href to tell the browser where to go. Write link text that explains the destination.",
        `<a href="https://example.com">Visit the learning lab</a>`
      ),
      s(
        "Images with a story",
        "An image needs src for its path and alt text for accessibility and for moments when the image cannot load.",
        `<img src="cat.png" alt="A curious orange cat">`
      ),
      s(
        "Video controls",
        "The video element can include controls so the learner can play, pause, and change volume.",
        `<video src="demo.mp4" controls></video>`
      ),
    ],
    challenge:
      "Create a favorite-things page with one link, one image, and one video placeholder.",
    quiz: q(
      "Which attribute tells an image its file path?",
      ["href", "src", "alt", "controls"],
      1,
      "src points to the image file."
    ),
    color: "from-blue-500/20 to-violet-500/5",
  },
  {
    id: "html-4",
    number: 4,
    month: 1,
    track: "HTML",
    title: "Audio & Embedded Media",
    subtitle: "Add sound and safe outside content",
    intro:
      "Audio, YouTube embeds, and iframes let a page include more kinds of content while keeping the experience organized.",
    sections: [
      s(
        "Audio controls",
        "Use src for the file and controls for play and pause. loop repeats a sound, while muted starts it silently.",
        `<audio src="music.mp3" controls loop></audio>`
      ),
      s(
        "YouTube iframe",
        "An iframe displays another page inside your page. Use the embed link provided by YouTube rather than a normal watch link.",
        `<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Lesson video"></iframe>`
      ),
      s(
        "Be a responsible embedder",
        "Only embed content you are allowed to use, and give the frame a helpful title."
      ),
    ],
    challenge:
      "Design a media corner with a short audio player and a video frame title.",
    quiz: q(
      "What does controls add?",
      ["Play and pause buttons", "A new color", "A database", "A heading"],
      0,
      "controls gives the learner media controls."
    ),
    color: "from-violet-500/20 to-fuchsia-500/5",
  },
  {
    id: "html-5",
    number: 5,
    month: 2,
    track: "HTML",
    title: "Formatting & Lists",
    subtitle: "Turn information into friendly chunks",
    intro:
      "Bold words, emphasis, ordered lists, and unordered lists help a learner scan and understand information quickly.",
    sections: [
      s(
        "Meaningful formatting",
        "strong marks importance and em adds emphasis. The meaning helps screen readers and future developers.",
        `<p><strong>Important:</strong> Wear your helmet.</p>\n<p><em>Remember to save.</em></p>`
      ),
      s(
        "Two kinds of lists",
        "Use ul when order does not matter and ol when steps must be followed in order.",
        `<ul><li>Red</li><li>Blue</li></ul>\n<ol><li>Plan</li><li>Build</li></ol>`
      ),
      s(
        "Comments",
        "Comments are notes for developers. They do not appear on the page.",
        `<!-- This note is for the team -->`
      ),
    ],
    challenge:
      "Write a recipe page with an ingredient ul and a numbered ol of steps.",
    quiz: q(
      "Which list is best for ordered steps?",
      ["ul", "ol", "img", "em"],
      1,
      "ol creates an ordered list."
    ),
    color: "from-amber-500/20 to-orange-500/5",
  },
  {
    id: "html-6",
    number: 6,
    month: 2,
    track: "HTML",
    title: "Tables & Forms",
    subtitle: "Collect and organize information",
    intro:
      "Tables compare related information, while forms let visitors send answers such as a name, email, or choice.",
    sections: [
      s(
        "Table structure",
        "A table has rows and cells. Use th for headings and td for data.",
        `<table>\n  <tr><th>Game</th><th>Score</th></tr>\n  <tr><td>Maze</td><td>90</td></tr>\n</table>`
      ),
      s(
        "Form controls",
        "A label explains an input. The button is the action that submits the form.",
        `<form>\n  <label for="name">Your name</label>\n  <input id="name" type="text">\n  <button>Join</button>\n</form>`
      ),
      s(
        "Ask clearly",
        "Good forms tell users what to enter and never request information that is not needed."
      ),
    ],
    challenge:
      "Build a club sign-up form with a name, favorite color, and Join button.",
    quiz: q(
      "Which element is used for a table heading?",
      ["td", "th", "tr", "form"],
      1,
      "th marks a heading cell."
    ),
    color: "from-emerald-500/20 to-teal-500/5",
  },
  {
    id: "css-1",
    number: 7,
    month: 3,
    track: "CSS",
    title: "CSS Basics & Syntax",
    subtitle: "Give your HTML a visual personality",
    intro:
      "CSS controls how a page looks. A rule chooses a target and gives it properties such as color or size.",
    sections: [
      s(
        "The CSS rule",
        "A selector chooses an element. Declarations inside braces describe the design.",
        `h1 {\n  color: #5b21b6;\n  font-size: 40px;\n}`
      ),
      s(
        "Where CSS lives",
        "Inline styles are quick, internal styles live in a style tag, and external stylesheets keep a project tidy."
      ),
      s(
        "Think in design tokens",
        "Choose a small color and spacing system so the page feels like one friendly product."
      ),
    ],
    challenge:
      "Style your profile heading and paragraph with a color, size, and text alignment.",
    quiz: q(
      "What does a selector choose?",
      ["An HTML element", "A password", "A video sound", "A database"],
      0,
      "The selector targets the element to style."
    ),
    color: "from-blue-500/20 to-cyan-500/5",
  },
  {
    id: "css-2",
    number: 8,
    month: 3,
    track: "CSS",
    title: "Text Styling",
    subtitle: "Make words speak with color and rhythm",
    intro:
      "Text styling sets color, alignment, decoration, and readable spacing so the message feels clear.",
    sections: [
      s(
        "Color and alignment",
        "Use color to create hierarchy and text-align to choose how the line sits in its container.",
        `p {\n  color: #334155;\n  text-align: center;\n}`
      ),
      s(
        "Decoration",
        "text-decoration can underline or remove a line. Use it carefully so links remain recognizable.",
        `a { text-decoration: none; }`
      ),
      s(
        "Readable choices",
        "Contrast, line height, and a comfortable font size matter more than adding many effects."
      ),
    ],
    challenge:
      "Create a quote card with a centered quote, a highlighted author, and a decorated link.",
    quiz: q(
      "Which property centers text?",
      ["text-align", "font-name", "line-color", "center-text"],
      0,
      "text-align: center centers inline content."
    ),
    color: "from-sky-500/20 to-indigo-500/5",
  },
  {
    id: "css-3",
    number: 9,
    month: 3,
    track: "CSS",
    title: "Selectors & Box Model",
    subtitle: "Understand how every element takes space",
    intro:
      "Every visible element is a box. Selectors target boxes, and the box model explains content, padding, border, and margin.",
    sections: [
      s(
        "Three selectors",
        "Element selectors target tags, class selectors target reusable groups, and id selectors target one special element.",
        `.card {\n  padding: 16px;\n  border: 2px solid #38bdf8;\n}`
      ),
      s(
        "The box model",
        "Content is wrapped by padding, then border, then margin outside the box."
      ),
      s(
        "Inspect and adjust",
        "Use browser devtools to see the box and change one measurement at a time."
      ),
    ],
    challenge:
      "Design three cards with one shared class and different content inside each.",
    quiz: q(
      "What sits outside the border?",
      ["Content", "Padding", "Margin", "Text"],
      2,
      "Margin creates space outside the border."
    ),
    color: "from-fuchsia-500/20 to-purple-500/5",
  },
  {
    id: "css-4",
    number: 10,
    month: 4,
    track: "CSS",
    title: "Backgrounds & Effects",
    subtitle: "Create atmosphere without losing clarity",
    intro:
      "Background colors, images, opacity, and link states can make a page feel alive while still keeping text readable.",
    sections: [
      s(
        "Background layers",
        "Use background-color for a base and background-image when an image adds meaning.",
        `.hero {\n  background-color: #0f172a;\n  background-image: linear-gradient(#0004, #0004), url(hero.jpg);\n}`
      ),
      s(
        "Opacity with care",
        "Opacity affects the whole element, including its children. A translucent overlay can be a better choice for readable text."
      ),
      s(
        "Link states",
        "Use hover and visited states to show that an interactive element responds.",
        `a:hover { color: #f97316; }`
      ),
    ],
    challenge:
      "Create a hero banner with a background, readable overlay, and a hoverable Call to Action link.",
    quiz: q(
      "What can opacity affect?",
      [
        "Only the border",
        "The element and its children",
        "Only the URL",
        "The HTML file name",
      ],
      1,
      "Opacity changes the transparency of the whole element tree."
    ),
    color: "from-rose-500/20 to-orange-500/5",
  },
  {
    id: "css-5",
    number: 11,
    month: 4,
    track: "CSS",
    title: "Display & Flexbox",
    subtitle: "Arrange your interface like building blocks",
    intro:
      "Display controls how an element participates in layout. Flexbox makes one-dimensional rows and columns much easier to arrange.",
    sections: [
      s(
        "Display modes",
        "Block elements take a full line, inline elements share a line, and none hides an element."
      ),
      s(
        "A flex row",
        "A flex container controls its children with direction, gap, alignment, and justification.",
        `.cards {\n  display: flex;\n  gap: 16px;\n  justify-content: center;\n  align-items: stretch;\n}`
      ),
      s(
        "Responsive thinking",
        "Use flex-wrap or a media query so cards can move to a new line on a small screen."
      ),
    ],
    challenge:
      "Build a three-card row that wraps nicely when the screen becomes narrow.",
    quiz: q(
      "Which property turns an element into a flex container?",
      ["display: flex", "position: flex", "layout: row", "box: flex"],
      0,
      "display: flex activates Flexbox for the element."
    ),
    color: "from-emerald-500/20 to-teal-500/5",
  },
  {
    id: "css-6",
    number: 12,
    month: 4,
    track: "CSS",
    title: "Build a Landing Page",
    subtitle: "Combine your CSS superpowers",
    intro:
      "A landing page is a perfect practice lab: a hero, feature cards, a call to action, and a responsive layout.",
    sections: [
      s(
        "Plan before styling",
        "Sketch the sections, choose a small palette, and decide what the visitor should do next."
      ),
      s(
        "Build the hero",
        "Use a heading, paragraph, and button-like link inside a focused visual area.",
        `<section class="hero">\n  <h1>Fresh ideas, every day</h1>\n  <p>Learn by making.</p>\n  <a href="#start">Start now</a>\n</section>`
      ),
      s(
        "Polish the system",
        "Reuse classes, keep spacing consistent, and test the page on both phone and desktop."
      ),
    ],
    challenge:
      "Create a bakery or creative club landing page with a hero and three feature cards.",
    quiz: q(
      "What should you decide before styling?",
      ["The visitor goal", "A random shadow", "Every pixel", "The final error"],
      0,
      "A clear goal guides the layout and content."
    ),
    color: "from-orange-500/20 to-amber-500/5",
  },
  {
    id: "js-1",
    number: 13,
    month: 5,
    track: "JavaScript",
    title: "JavaScript & Variables",
    subtitle: "Make the page respond",
    intro:
      "JavaScript adds behavior. Variables remember values so a page can react to clicks, names, scores, and choices.",
    sections: [
      s(
        "What JS does",
        "HTML is structure and CSS is style; JavaScript is the behavior layer that can change the page."
      ),
      s(
        "Variables",
        "Use let for a value that may change and const for a value that should stay the same.",
        `const gameName = "Maze Quest";\nlet score = 0;\nscore = score + 10;`
      ),
      s(
        "Syntax clues",
        "Statements end with a semicolon in many styles, strings use quotes, and names should explain their values."
      ),
    ],
    challenge:
      "Create a score variable and update it when a player earns ten points.",
    quiz: q(
      "Which keyword is best for a value that should not change?",
      ["const", "let", "loop", "style"],
      0,
      "const communicates that the binding should stay the same."
    ),
    color: "from-yellow-500/20 to-orange-500/5",
  },
  {
    id: "js-2",
    number: 14,
    month: 5,
    track: "JavaScript",
    title: "Operators, Prompt & Decisions",
    subtitle: "Ask, calculate, and choose",
    intro:
      "Operators calculate, prompt collects an answer, and conditions let the program choose a path.",
    sections: [
      s(
        "Operators",
        "Use +, -, *, and / for arithmetic. Use === when comparing values strictly.",
        `const age = Number(prompt("How old are you?"));\nif (age >= 10) {\n  console.log("Ready to build!");\n}`
      ),
      s(
        "Prompt safely",
        "Prompt returns text. Convert it with Number before doing arithmetic."
      ),
      s(
        "If and else",
        "Write the most important question as a condition, then explain the alternative in else."
      ),
    ],
    challenge:
      "Make a welcome checker that asks for a name and age and gives a friendly message.",
    quiz: q(
      "What does prompt return?",
      ["Text", "A CSS class", "An image", "A loop"],
      0,
      "Prompt collects user input as text."
    ),
    color: "from-lime-500/20 to-green-500/5",
  },
  {
    id: "js-3",
    number: 15,
    month: 5,
    track: "JavaScript",
    title: "Loops & Functions",
    subtitle: "Repeat smartly and package actions",
    intro:
      "Loops repeat a pattern, while functions package a job so it can be called whenever the page needs it.",
    sections: [
      s(
        "For and while",
        "Use for when you know the counting pattern. Use while when the program should continue while a condition is true.",
        `for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}\n\nlet energy = 3;\nwhile (energy > 0) {\n  energy--;\n}`
      ),
      s(
        "Functions",
        "A function has a name and a body. Parameters make it reusable with different values.",
        `function sayHello(name) {\n  return "Hello " + name;\n}\nconsole.log(sayHello("Maya"));`
      ),
      s(
        "Activity: count the stars",
        "Use a loop to count stars and a function to display the final message."
      ),
    ],
    challenge:
      "Build a tiny click counter function and display the number of stars earned.",
    quiz: q(
      "Why do we use a function?",
      ["To reuse a job", "To color HTML", "To delete a loop", "To open a file"],
      0,
      "Functions package reusable behavior."
    ),
    color: "from-red-500/20 to-pink-500/5",
  },
  {
    id: "js-4",
    number: 16,
    month: 6,
    track: "JavaScript",
    title: "Interactive Buttons",
    subtitle: "Turn clicks into visible changes",
    intro:
      "The DOM is the page as JavaScript sees it. Select an element, listen for an event, and update what the learner sees.",
    sections: [
      s(
        "Select an element",
        "Use querySelector to find an element by a CSS selector.",
        `const button = document.querySelector("#magic");\nconst message = document.querySelector("#message");`
      ),
      s(
        "Listen for clicks",
        "addEventListener connects an event to a function.",
        `button.addEventListener("click", () => {\n  message.textContent = "You found the magic!";\n});`
      ),
      s(
        "Give feedback",
        "Every click should create a clear visual response so the user knows the interface heard them."
      ),
    ],
    challenge:
      "Build a magic button that changes a heading and a color when clicked.",
    quiz: q(
      "Which event listens for a click?",
      ["click", "hover-only", "load-css", "color"],
      0,
      "click is the browser event for a mouse or keyboard click."
    ),
    color: "from-cyan-500/20 to-teal-500/5",
  },
  {
    id: "js-5",
    number: 17,
    month: 6,
    track: "JavaScript",
    title: "Web Project Lab",
    subtitle: "Build a playful mini app",
    intro:
      "Combine HTML, CSS, and JavaScript in one small project: a quiz, score board, or mood button.",
    sections: [
      s(
        "Plan the interaction",
        "Write the user journey: what does the learner click, what changes, and how do they know they succeeded?"
      ),
      s(
        "Connect the layers",
        "HTML names the elements, CSS gives them a visual state, and JS changes that state after an event.",
        `const score = document.querySelector("#score");\nlet points = 0;\nfunction addPoint() {\n  points++;\n  score.textContent = points;\n}`
      ),
      s(
        "Test the happy path",
        "Click through the full story, then test a reset and an unexpected input."
      ),
    ],
    challenge: "Create a three-question quiz that counts correct answers.",
    quiz: q(
      "Which layer changes after a click?",
      [
        "JavaScript behavior",
        "The keyboard",
        "The file name",
        "The monitor cable",
      ],
      0,
      "JavaScript handles the interaction and updates the page."
    ),
    color: "from-purple-500/20 to-indigo-500/5",
  },
  {
    id: "js-6",
    number: 18,
    month: 6,
    track: "JavaScript",
    title: "Final Web Showcase",
    subtitle: "Present, improve, and celebrate",
    intro:
      "A great final project is not only code. It is a clear idea, friendly experience, and a story you can explain to someone else.",
    sections: [
      s(
        "Choose your story",
        "Pick a problem or playful idea: a quiz, recipe, game, portfolio, or academy landing page."
      ),
      s(
        "Make it kind",
        "Use readable colors, helpful labels, and feedback that encourages the learner instead of blaming them."
      ),
      s(
        "Show your process",
        "Explain what you planned, what you changed, and one bug you solved. That is real developer thinking."
      ),
    ],
    challenge:
      "Prepare a final showcase page with a title, screenshot area, project story, and Try it button.",
    quiz: q(
      "What makes a strong final project?",
      [
        "A clear idea and friendly experience",
        "Many random effects",
        "No testing",
        "Only a long title",
      ],
      0,
      "A project is successful when people understand and enjoy using it."
    ),
    color: "from-pink-500/20 to-violet-500/5",
  },
];
export const webTracks = [
  {
    id: "HTML",
    en: "HTML Foundations",
    description: "Structure, content, media, lists, tables, and forms",
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "CSS",
    en: "CSS Creative Lab",
    description: "Colors, layout, box model, effects, and Flexbox",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "JavaScript",
    en: "JavaScript Playground",
    description: "Variables, decisions, loops, functions, and interactions",
    color: "from-amber-500 to-orange-500",
  },
];
