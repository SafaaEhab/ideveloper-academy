import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let t = fs.readFileSync(path, "utf8");
const log = [];
// s6 empty solution bodies -> guidance text (keep code arg intact)
const sols = [
  ["Activity 1: Solution", "Compare your prediction with the running code below. Age 14 prints nothing (14 >= 16 is False), age 20 prints the ID line."],
  ["Activity 2: Solution", "Compare your prediction below. late = True prints the first line only, because not(late) is False."],
  ["Activity 3: Solution — 4 separate if", "Compare your calculator below. Each if is checked independently — try +, -, *, / and watch which single line prints."],
  ["Activity 4: Solution", "Compare your entry check below. Only yes + yes opens the session, because and needs both sides to be True."],
];
for (const [title, body] of sols) {
  const re = new RegExp('"' + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '",\\s*\\r?\\n\\s*""');
  if (re.test(t)) { t = t.replace(re, '"' + title + '",\n  "' + body + '"'); log.push("OK " + title); }
  else log.push("MISS " + title);
}
// image placeholders appended to specific section bodies (first sentence kept, note added)
function appendNote(title, note) {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp('("' + esc + '",\\s*\\r?\\n\\s*")([^"]*)(")');
  const m = t.match(re);
  if (!m) { log.push("MISS note " + title); return; }
  if (m[2].includes("IMAGE PLACEHOLDER")) { log.push("SKIP note " + title); return; }
  t = t.replace(re, "$1$2" + note + "$3");
  log.push("OK note " + title);
}
const NL = "\\n\\n";
appendNote("7 — More about range(): 3 main forms", NL + "🖼️ [IMAGE PLACEHOLDER: counter diagram for start, stop, step — ارفعي الصورة هنا]");
appendNote("6 — Infinite loop", NL + "🖼️ [IMAGE PLACEHOLDER: while-loop flowchart, condition diamond with arrow back — ارفعي الصورة هنا]");
appendNote("8 — Printing lists", NL + "🖼️ [IMAGE PLACEHOLDER: list as labeled boxes with indexes 0, 1, 2 — ارفعي الصورة هنا]");
appendNote("4 — Lists Methods toolkit", NL + "🖼️ [IMAGE PLACEHOLDER: toolbox cards for append, insert, pop, remove — ارفعي الصورة هنا]");
appendNote("2 — Loops in blocks? Repeat some steps", NL + "🖼️ [IMAGE PLACEHOLDER: blocks repeat vs Python for, side by side — ارفعي الصورة هنا]");
appendNote("3 — While loop: repeat while a condition is true", NL + "🖼️ [IMAGE PLACEHOLDER: fan ON while temperature > 30 illustration — ارفعي الصورة هنا]");
fs.writeFileSync(path, t);
console.log(log.join("\n"));
