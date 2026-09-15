import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { allPythonLessons } from "./pythonCurriculum";

describe("first four Python sessions", () => {
  const lessons = allPythonLessons.filter((lesson) => lesson.id.startsWith("s") && lesson.number <= 4);

  it("keeps the four requested sessions in the first month", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(lessons.every((lesson) => lesson.sections.length >= 3)).toBe(true);
    expect(lessons.every((lesson) => lesson.challenge.length > 40)).toBe(true);
  });

  it("keeps every first-four code example syntactically executable Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: section.code, encoding: "utf8" });
      }
    }
  });
});

describe("updated Python sessions 5 to 8", () => {
  const lessons = allPythonLessons.filter((lesson) => lesson.id >= "s5" && lesson.id <= "s8");

  it("contains the new problem-solving topics and practice", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual(["s5", "s6", "s7", "s8"]);
    expect(lessons.every((lesson) => lesson.sections.length >= 3)).toBe(true);
    expect(lessons.every((lesson) => lesson.challenge.length > 30)).toBe(true);
  });

  it("keeps every Sessions 5 to 8 code example syntactically executable Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: section.code, encoding: "utf8" });
      }
    }
  });
});

describe("updated Python sessions 9 to 12", () => {
  const lessons = allPythonLessons.filter((lesson) => ["s9", "s10", "s11", "s12"].includes(lesson.id));

  it("uses content-aligned titles and substantial lesson guides", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual(["s9", "s10", "s11", "s12"]);
    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "For Loops, range(), and Repetition",
      "Loop Problem Solving: Numbers, Tables and Factorials",
      "Patterns and Numbers: Divisors, Lucky Numbers and Shapes",
      "While Loops: Repeat Until It Is Right",
    ]);
    expect(lessons.every((lesson) => lesson.sections.length >= 4)).toBe(true);
    expect(lessons.every((lesson) => lesson.challenge.length > 30)).toBe(true);
  });

  it("keeps every updated code example syntactically valid Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: section.code, encoding: "utf8" });
      }
    }
  });
});

describe("updated Python sessions 13 to 16", () => {
  const lessons = allPythonLessons.filter((lesson) => ["p4", "p5a", "p5b", "p6a"].includes(lesson.id));

  it("uses content-aligned titles", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual(["p4", "p5a", "p5b", "p6a"]);
    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "Passwords, Digits, and Palindromes",
      "Loop Control: if Inside Loops, break and continue",
      "Creative Loops: Sequences, Pyramids and the PUM Game",
      "Printing and Accessing Lists",
    ]);
    expect(lessons.every((lesson) => lesson.sections.length >= 4)).toBe(true);
    expect(lessons.every((lesson) => lesson.challenge.length > 25)).toBe(true);
  });

  it("keeps every updated code example syntactically valid Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: section.code, encoding: "utf8" });
      }
    }
  });
});

describe("lesson quizzes", () => {
  it("ends every Python lesson with exactly 5 questions", () => {
    expect(allPythonLessons.length).toBe(19);
    for (const lesson of allPythonLessons) {
      expect(`${lesson.id}:${lesson.quiz.length}`).toBe(`${lesson.id}:5`);
      for (const item of lesson.quiz) {
        expect(item.options.length).toBe(4);
        expect(item.answer).toBeGreaterThanOrEqual(0);
        expect(item.answer).toBeLessThan(4);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("first five Python sessions activity format", () => {
  const lessons = allPythonLessons.filter((lesson) =>
    ["s1", "s2", "s3", "s4", "s5"].includes(lesson.id)
  );

  it("keeps homework unsolved (no solution code in homework sections)", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (/home work/i.test(section.title)) {
          expect(section.solutionCode).toBeUndefined();
          // homework code if present must be an empty starter, not a solved perimeter
          if (section.code) {
            expect(section.code).not.toMatch(/perimeter\s*=\s*4\s*\*/);
          }
        }
      }
    }
  });

  it("keeps activities and solutions in separate sections", () => {
    for (const lesson of lessons) {
      const titles = lesson.sections.map((s) => s.title);
      // every Solution section must have a separate Activity/Problem section before it
      for (let i = 0; i < lesson.sections.length; i++) {
        if (/solution/i.test(lesson.sections[i].title)) {
          const prev = titles.slice(Math.max(0, i - 2), i).join(" ");
          expect(/activity|problem/i.test(prev)).toBe(true);
          expect(lesson.sections[i].code).toBeTruthy();
        }
      }
    }
  });

  it("keeps starter and solution code syntactically valid Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        for (const field of [section.code, section.starterCode, section.solutionCode]) {
          if (!field) continue;
          execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: field, encoding: "utf8" });
        }
      }
    }
  });
});

describe("updated Python sessions 17 to 18", () => {
  const lessons = allPythonLessons.filter((lesson) => ["p6b", "p7a"].includes(lesson.id));

  it("uses content-aligned titles and activities", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual(["p6b", "p7a"]);
    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "Loop Through Lists and List Methods",
      "Number and Text Checkers",
    ]);
    expect(lessons.every((lesson) => lesson.sections.length >= 5)).toBe(true);
    expect(lessons.every((lesson) => lesson.challenge.length > 25)).toBe(true);
  });

  it("keeps every updated code example syntactically valid Python", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (!section.code) continue;
        execFileSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<lesson>', 'exec')"], { input: section.code, encoding: "utf8" });
      }
    }
  });
});
