import fs from "node:fs";
const path = "client/src/data/pythonCurriculum.ts";
let text = fs.readFileSync(path, "utf8");
let output = "";
let inTemplate = false;
let buffer = "";
for (const char of text) {
  if (char === "`") {
    if (inTemplate) {
      output += JSON.stringify(buffer);
      buffer = "";
      inTemplate = false;
    } else {
      inTemplate = true;
    }
  } else if (inTemplate) {
    buffer += char;
  } else {
    output += char;
  }
}
if (inTemplate) throw new Error("Unclosed template literal");
fs.writeFileSync(path, output);
console.log("Normalized Python code strings");
