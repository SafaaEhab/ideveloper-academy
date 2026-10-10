import { describe, expect, it } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";
import {
  buildPreviewDocument,
  classifySnippet,
  MAX_MEDIA_BYTES,
} from "@/components/WebCodeRunner";
import { allWebLessons } from "../data/webCurriculum";

/**
 * One representative snippet per shape a web session can contain, plus every
 * snippet the published sessions ship. Each is turned into a complete document
 * and executed in a real DOM, which is what keeps "Run example" from ever
 * opening a blank or broken frame.
 */
const fixtures: { id: string; code: string }[] = [
  {
    id: "full-document",
    code: "<!DOCTYPE html>\n<html>\n  <head><title>T</title></head>\n  <body><h1>Yo</h1></body>\n</html>",
  },
  { id: "single-tag", code: "<h1>My First Heading</h1>" },
  { id: "body-fragment", code: "<body>\n  <h1>Hi</h1>\n  <hr>\n</body>" },
  { id: "text-and-break", code: "Line one<br>Line two\n<hr>" },
  { id: "comment-only", code: "<!-- This note is for the team -->" },
  { id: "css-rule", code: "h1 { color: #0ea5e9; font-size: 32px; }" },
  { id: "css-block", code: ".cards {\n  display: flex;\n  gap: 16px;\n}" },
  { id: "js-prompt", code: 'const age = Number(prompt("How old are you?"));' },
  {
    id: "js-loop",
    code: "for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}",
  },
  {
    id: "js-dom",
    code: 'const button = document.querySelector("#magic");\nbutton.addEventListener("click", () => { console.log("clicked"); });',
  },
  { id: "empty", code: "" },
  ...allWebLessons.flatMap(lesson =>
    lesson.sections
      .map((section, sectionIndex) => ({
        id: `${lesson.id}#${sectionIndex}`,
        code: section.code ?? "",
      }))
      .filter(item => item.code.trim().length > 0)
  ),
];

describe("web code runner", () => {
  it("covers a snippet of every supported shape", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(11);
  });

  it("turns every snippet into a complete HTML5 document", () => {
    for (const { id, code } of fixtures) {
      const doc = buildPreviewDocument(code);
      expect(doc, id).toMatch(/^<!doctype html>/i);
      expect(doc, id).toMatch(/<html[\s>]/i);
      expect(doc, id).toMatch(/<head[\s>]/i);
      expect(doc, id).toMatch(/<body[\s>]/i);
      expect(doc, id).toMatch(/<meta[^>]+charset/i);
      expect(doc, id).toMatch(/__webRunner/);
      expect(doc, id).toMatch(/<\/html>/i);
    }
  });

  it("classifies fragments so CSS and JS are not shown as raw text", () => {
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

  it("runs every snippet in a real DOM without errors", () => {
    for (const { id, code } of fixtures) {
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
          // jsdom has no window manager either, so a new tab stays unopened.
          (window as unknown as { open: () => null }).open = () => null;
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

/**
 * A student writes `<img src="cake.png">` and the file is sitting next to
 * index.html on their own disk. The preview cannot see their disk, so the file
 * is handed over through the media button and the src is pointed at it. These
 * checks are the contract for that swap — and, just as importantly, for what it
 * must never touch.
 */
describe("student media in the preview", () => {
  const PIXEL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='teal'/%3E%3C/svg%3E";

  it("points a bare file name at the file the student added", () => {
    const doc = buildPreviewDocument('<img src="cake.png">', {
      "cake.png": PIXEL,
    });
    expect(doc).toContain(`src="${PIXEL}"`);
    expect(doc).not.toContain('src="cake.png"');
  });

  it("matches the way a student actually writes the path", () => {
    // They will write the folder, a Windows separator, or a capital letter.
    for (const written of [
      "images/cake.png",
      "images\\cake.png",
      "./cake.png",
      "CAKE.PNG",
    ]) {
      const doc = buildPreviewDocument(`<img src="${written}">`, {
        "cake.png": PIXEL,
      });
      expect(doc, written).toContain(`src="${PIXEL}"`);
    }
  });

  it("reaches a video and an audio file the same way", () => {
    const doc = buildPreviewDocument(
      '<video src="intro.mp4" controls></video><audio src="bell.mp3" controls></audio>',
      {
        "intro.mp4": "data:video/mp4;base64,AAA",
        "bell.mp3": "data:audio/mpeg;base64,BBB",
      }
    );
    expect(doc).toContain('src="data:video/mp4;base64,AAA"');
    expect(doc).toContain('src="data:audio/mpeg;base64,BBB"');
  });

  it("never rewrites a link the student typed", () => {
    // A src that is already a full address is already reachable, and rewriting
    // it would break a lesson that points at the academy's own pictures.
    for (const src of [
      "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/websites.png",
      "//cdn.example.com/cake.png",
      "data:image/png;base64,ZZZ",
    ]) {
      const doc = buildPreviewDocument(`<img src="${src}">`, {
        "cake.png": PIXEL,
      });
      expect(doc, src).toContain(`src="${src}"`);
    }
  });

  it("leaves the page alone when nothing has been added", () => {
    const doc = buildPreviewDocument('<img src="cake.png"><img src="pie.png">');
    expect(doc).toContain('src="cake.png"');
    expect(doc).toContain('src="pie.png"');
  });

  it("swaps files in before the bridge goes in, so the bridge is never touched", () => {
    // The bridge reads `getAttribute("src")` at runtime. If the rewrite ran
    // after it, the bridge's own source would be fair game for a data URL.
    const doc = buildPreviewDocument('<img src="cake.png">', {
      "cake.png": PIXEL,
      'getAttribute("src")': PIXEL,
    });
    expect(doc).toContain('el.getAttribute("src")||""');
  });

  it("has a size ceiling a student can be told about", () => {
    // Without one, a 200MB video would be a 270MB string in a tab that is
    // already holding a lesson.
    expect(MAX_MEDIA_BYTES).toBeGreaterThan(0);
    expect(MAX_MEDIA_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
  });

  it("tells a student which of the two problems they have", () => {
    // A bare name and a broken link are different mistakes, and the old
    // message told a student to "save it next to index.html" — which is what
    // they had already done, and does nothing inside a browser.
    const doc = buildPreviewDocument('<img src="cake.png">');
    expect(doc).toMatch(/Add media button/);
    expect(doc).toMatch(/could not be opened/);
    expect(doc).not.toMatch(/Save it next to index\.html/);
  });
});

/**
 * A file the preview cannot load has to be explained on the page, not swallowed.
 *
 * The HTML track's media lesson names four files that were never added to the
 * repository, and the browser refuses every one of them. Before, the error landed
 * on the `<source>` inside the player and the bridge only watched the player, so
 * the student got an empty audio bar and no idea why — a silent hole in the one
 * section about media. These are the checks that say a hole cannot come back.
 */
describe("a file the preview cannot load", () => {
  /** Loads a document and returns its window, with the bridge already running. */
  const open = (code: string) => {
    const dom = new JSDOM(buildPreviewDocument(code), {
      runScripts: "dangerously",
      virtualConsole: new VirtualConsole(),
    });
    return dom;
  };

  it("explains a missing file named in a <source>, and keeps the player", () => {
    const dom = open(
      '<audio controls><source src="music.mp3" type="audio/mpeg"></audio>'
    );
    const { document, Event } = dom.window;
    const source = document.querySelector("source")!;
    const player = document.querySelector("audio")!;

    // The real thing does not bubble, which is why the bridge listens in capture.
    const event = new Event("error", { bubbles: false });
    source.dispatchEvent(event);

    const note = document.querySelector(".preview-missing");
    expect(note, "nothing explained the missing file").not.toBeNull();
    expect(note!.textContent).toContain("music.mp3");
    expect(note!.textContent).toMatch(/no file added for this name/);
    // The point of the lesson is the tag itself, so it must survive.
    expect(document.querySelector("audio")).toBe(player);
    expect(player.style.outline).not.toBe("");
    // And it sits beside the player, not inside it.
    expect(player.nextElementSibling).toBe(note);
    dom.window.close();
  });

  it("says which one of two problems it is, for a picture and for a link", () => {
    const missingFile = open('<img src="cake.png">');
    missingFile.window.document
      .querySelector("img")!
      .dispatchEvent(new missingFile.window.Event("error"));
    expect(missingFile.window.document.querySelector(".preview-missing")!.textContent)
      .toMatch(/no file added for this name: "cake\.png"/);

    const brokenLink = open('<img src="https://example.com/gone.png">');
    brokenLink.window.document
      .querySelector("img")!
      .dispatchEvent(new brokenLink.window.Event("error"));
    expect(brokenLink.window.document.querySelector(".preview-missing")!.textContent)
      .toMatch(/this file did not load/);
    missingFile.window.close();
    brokenLink.window.close();
  });

  it("mentions a missing poster without blaming the video", () => {
    const dom = open(
      '<video controls width="400" poster="images/poster.jpg"><source src="movie.mp4" type="video/mp4"></video>'
    );
    dom.window.document
      .querySelector("video")!
      .dispatchEvent(new dom.window.Event("error"));

    const notes = [...dom.window.document.querySelectorAll(".preview-missing")].map(
      node => node.textContent ?? ""
    );
    expect(notes.join(" ")).toMatch(/POSTER/);
    expect(notes.join(" ")).toContain("images/poster.jpg");
    // The video is still there to be looked at.
    expect(dom.window.document.querySelector("video")).not.toBeNull();
    dom.window.close();
  });

  it("explains a script file it cannot fetch, which otherwise looks like the student's fault", () => {
    // The JavaScript track's "where to write your script" section links an
    // external file. The preview has no such file, so the page simply does not
    // change — and a student reads that as their own broken code. The tag raises
    // an error event like any other, so the bridge has only to listen for it.
    const dom = open(
      '<!DOCTYPE html><html><head><script src="./js/index.js"></script></head><body><h1 id="Demo"></h1></body></html>'
    );
    const { document, Event } = dom.window;
    const script = document.querySelector("script[src]")!;
    script.dispatchEvent(new Event("error", { bubbles: false }));

    const note = document.querySelector(".preview-missing");
    expect(note, "nothing explained the missing script").not.toBeNull();
    expect(note!.textContent).toMatch(/SCRIPT/);
    expect(note!.textContent).toContain("./js/index.js");
    // A script has no visible box, so the note goes at the end of the page.
    expect(note!.parentElement).toBe(document.body);
    // Asked twice, it is still one problem.
    script.dispatchEvent(new Event("error", { bubbles: false }));
    expect(document.querySelectorAll(".preview-missing").length).toBe(1);
    dom.window.close();
  });

  it("goes looking for a poster that raises no error of its own", () => {
    // A poster is named in an attribute, so a missing one raises nothing at all:
    // the video just plays with a black rectangle in front of it. Catching that
    // means asking the browser to fetch the picture after the page is up, which
    // is the only way it can be found out. jsdom cannot load images, so this
    // checks the sweep is there rather than pretending to run it.
    const doc = buildPreviewDocument('<video poster="images/poster.jpg"></video>');
    expect(doc).toContain('querySelectorAll("[poster]")');
    expect(doc).toMatch(/addEventListener\("load"/);
  });

  it("does not stack a second note when the same player fails twice", () => {
    const dom = open(
      '<video controls poster="images/poster.jpg"><source src="a.mp4" type="video/mp4"><source src="b.mp4" type="video/mp4"></video>'
    );
    const { document, Event } = dom.window;
    for (const source of document.querySelectorAll("source")) {
      source.dispatchEvent(new Event("error", { bubbles: false }));
    }
    document.querySelector("video")!.dispatchEvent(new Event("error"));

    // Three failures, one player, one thing to say.
    expect(document.querySelectorAll(".preview-missing").length).toBe(1);
    dom.window.close();
  });
});
