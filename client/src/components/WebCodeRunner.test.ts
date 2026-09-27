import { describe, expect, it } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";
import {
  buildPreviewDocument,
  classifySnippet,
} from "@/components/WebCodeRunner";
import { webLessons } from "../data/webCurriculum";

/**
 * Every lesson snippet must become a complete, runnable document. This is the
 * guarantee that the "Run example" button never opens a blank or broken frame.
 */
describe("web code runner", () => {
  const snippets = webLessons.flatMap(lesson =>
    lesson.sections
      .map((section, sectionIndex) => ({
        id: `${lesson.id}#${sectionIndex}`,
        code: section.code ?? "",
      }))
      .filter(item => item.code.trim().length > 0)
  );

  it("finds code snippets across the whole web curriculum", () => {
    expect(snippets.length).toBeGreaterThanOrEqual(15);
  });

  it("turns every curriculum snippet into a complete HTML5 document", () => {
    for (const { id, code } of snippets) {
      const doc = buildPreviewDocument(code);
      expect(doc, id).toMatch(/^<!doctype html>/i);
      expect(doc, id).toMatch(/<html[\s>]/i);
      expect(doc, id).toMatch(/<head[\s>]/i);
      expect(doc, id).toMatch(/<body[\s>]/i);
      expect(doc, id).toMatch(/<meta[^>]+charset/i);
      expect(doc, id).toMatch(/__webRunner/);
      expect(doc, id).toContain(code.trim().split("\n")[0]);
      expect(doc, id).toMatch(/<\/html>/i);
    }
  });

  it("classifies fragments so CSS and JS snippets are not shown as raw text", () => {
    expect(classifySnippet("<h1>Hi</h1>")).toBe("markup");
    expect(classifySnippet("h1 { color: red; }")).toBe("css");
    expect(classifySnippet(".card { display: flex; }")).toBe("css");
    expect(classifySnippet('const age = Number(prompt("Age?"))')).toBe("js");
    expect(classifySnippet("<!DOCTYPE html><html><body>x</body></html>")).toBe(
      "document"
    );
  });

  it("ignores words inside HTML comments when classifying", () => {
    // "for" is a JavaScript keyword, so a naive check would read this as JS.
    expect(classifySnippet("<!-- This note is for the team -->")).toBe(
      "markup"
    );
  });

  it("keeps empty code safe", () => {
    expect(buildPreviewDocument("")).toMatch(/^<!doctype html>/i);
  });

  it("runs every curriculum snippet in a real DOM without errors", () => {
    for (const { id, code } of snippets) {
      const problems: string[] = [];
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("jsdomError", (error: Error) =>
        problems.push(`jsdomError: ${error.message}`)
      );
      const dom = new JSDOM(buildPreviewDocument(code), {
        runScripts: "dangerously",
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(window) {
          // jsdom has no dialogs; answer like a student would.
          (window as unknown as { prompt: () => string }).prompt = () => "12";
          (window as unknown as { alert: () => void }).alert = () => {};
        },
      });
      const printed =
        dom.window.document.getElementById("output")?.textContent?.trim() ?? "";
      if (printed.startsWith("Error:")) problems.push(`preview: ${printed}`);
      dom.window.close();
      expect(problems, id).toEqual([]);
    }
  });
});
