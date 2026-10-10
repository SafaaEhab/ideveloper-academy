import { readFileSync, writeFileSync } from "node:fs";
const FILE = "client/src/data/webCurriculum.ts";
let src = readFileSync(FILE, "utf8");
const from = " * The CSS track builds one site - a bakery, four pages - layer by layer: a";
const to = " * The CSS track styles one real page - the Family Bakery - layer by layer: a";
if (!src.includes(from)) throw new Error("doc comment not found");
src = src.replace(from, to);
writeFileSync(FILE, src, "utf8");
console.log("doc comment updated");
