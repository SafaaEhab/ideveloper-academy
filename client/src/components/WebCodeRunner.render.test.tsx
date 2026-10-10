// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebCodeRunner, { runsByItself } from "@/components/WebCodeRunner";
import HomeworkBoard from "@/components/HomeworkBoard";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The HTML track opens every editor already running, so the page a section is
 * about is on screen before the student touches anything. These checks are the
 * contract for that: a preview with no Run press behind it, and an empty editor
 * that is genuinely empty.
 */
describe("WebCodeRunner", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const render = (props: Parameters<typeof WebCodeRunner>[0]) => {
    act(() => {
      root.render(<WebCodeRunner {...props} />);
    });
  };

  const labels = { exampleLabel: "x", runLabel: "Run", copyLabel: "Copied" };

  it("shows the preview without the student pressing Run", () => {
    render({ ...labels, code: "<h1>Hello</h1>", autoRun: true });
    // The whole point: the editor and the preview are both already there.
    expect(
      host.querySelector("textarea[aria-label='Editable code']")
    ).not.toBeNull();
    const frame = host.querySelector<HTMLIFrameElement>(
      "iframe[title='Live code preview']"
    );
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute("srcdoc")).toContain("<h1>Hello</h1>");
  });

  it("keeps waiting for Run when the snippet has not asked to auto-run", () => {
    render({ ...labels, code: "<h1>Hello</h1>" });
    // `autoRun` is a plain boolean the course sets per snippet, so a snippet
    // that takes over the browser is shown exactly as a student sees it before
    // they press Run: closed.
    expect(
      host.querySelector("textarea[aria-label='Editable code']")
    ).toBeNull();
    expect(host.querySelector("iframe[title='Live code preview']")).toBeNull();
  });

  it("keeps the Run button after auto-running, for re-running an edit", () => {
    render({ ...labels, code: "<p>x</p>", autoRun: true });
    const run = Array.from(host.querySelectorAll("button")).find(b =>
      b.textContent?.includes("Run")
    );
    expect(run).toBeDefined();
  });

  it("gives the editor and the preview the same height, and scrolls each one", () => {
    // The two panes sit side by side, so they have to be the same size: one at
    // 240px and the other growing to fit the page left a short page with one
    // pane hanging and a long one with the other squashed. Both are now fixed,
    // and the editor no longer offers a drag handle that would break the match.
    render({ ...labels, code: "<p>x</p>", autoRun: true });

    const editor = host.querySelector("textarea");
    const frame = host.querySelector("iframe");
    expect(editor?.style.height).toBe("240px");
    expect(frame?.style.height).toBe("240px");

    expect(editor?.className).toContain("overflow-y-auto");
    expect(editor?.className).toContain("resize-none");
    expect(editor?.className).not.toContain("resize-y");
  });
});

/**
 * Which snippets run themselves is a teaching decision, not a detail, so it is
 * pinned here rather than left to whoever edits the page next.
 */
describe("which sessions run themselves", () => {
  it("runs a script on open, and holds back the ones that take over the browser", () => {
    // Every session in the course runs its own examples — the JavaScript track
    // included — because the page a section is about should be on screen before
    // the student touches anything.
    expect(runsByItself("for (var i = 0; i < 10; i++) { console.log(i); }")).toBe(
      true
    );
    expect(
      runsByItself('function SayHello() {\n  console.log("Hello");\n}\n\nSayHello()')
    ).toBe(true);
    expect(runsByItself('<h1 id="Demo"></h1>')).toBe(true);
    expect(runsByItself("h1 { color: red; }")).toBe(true);
    // But the sandbox allows modals and popups on purpose, so a snippet that
    // opens a box the visitor has to answer — or a tab in front of them — must
    // wait for the Run button. Pressing it is the student asking for that.
    expect(runsByItself('window.alert("Hello");')).toBe(false);
    expect(runsByItself('window.prompt("How old are you?")')).toBe(false);
    expect(runsByItself('window.open(link, "_blank");')).toBe(false);
  });

  it("runs a tab that only opens on a click, because nothing can fire it", () => {
    // The same call written on its own is a new tab the moment the page loads.
    // Written inside a listener it waits for a click inside the preview, which
    // is the whole point of the lesson — so this one runs by itself.
    expect(
      runsByItself(
        'visitButton.addEventListener("click", function () {\n  window.open(url, "_blank");\n});'
      )
    ).toBe(true);
    expect(
      runsByItself('open("https://example.com");\nconsole.log("done");')
    ).toBe(false);
  });

  it("does not mistake a comment, or a method of the same name, for a call", () => {
    // The practice starters are written as instructions, and several of them
    // name prompt() in the note. Reading that as a call would leave the editor
    // shut on the one section where there is nothing yet to run.
    expect(
      runsByItself(
        "// 1. Read two numbers with prompt()\n// 2. Compare them\n"
      )
    ).toBe(true);
    expect(runsByItself("/* try confirm() later */\nconsole.log(1);")).toBe(
      true
    );
    // A student's own method called `open` is theirs, not the browser's.
    expect(runsByItself("window.open = function () {};\nmodal.open();")).toBe(
      true
    );
    // And a brace written in a string must not be counted as a block.
    expect(runsByItself('console.log("{");\nwindow.open(link);')).toBe(false);
  });

  it("keeps the Run button on an auto-running session", () => {
    // The page has already run once, but the student still needs to run it again
    // after an edit, and on a track that never auto-runs the button is all there is.
    let host: HTMLDivElement;
    let root: Root;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root.render(
        <WebCodeRunner
          code="<p>x</p>"
          exampleLabel="x"
          runLabel="Run"
          copyLabel="Copied"
          autoRun
        />
      );
    });
    const run = Array.from(host.querySelectorAll("button")).find(b =>
      b.textContent?.includes("Run")
    );
    expect(run).toBeDefined();
    act(() => root.unmount());
    host.remove();
  });
});

describe("HomeworkBoard", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const render = (props: Parameters<typeof HomeworkBoard>[0]) => {
    act(() => {
      root.render(<HomeworkBoard {...props} />);
    });
  };

  const labels = {
    editorLabel: "Your code",
    runLabel: "Run",
    copyLabel: "Copied",
  };

  it("puts the target picture above a completely empty editor", () => {
    render({
      ...labels,
      image: "/curriculum/html/session2/Activity2.png",
      placeholder: "Build the page above.",
      autoRun: true,
    });
    const picture = host.querySelector<HTMLImageElement>("img");
    expect(picture?.getAttribute("src")).toBe(
      "/curriculum/html/session2/Activity2.png"
    );
    // Empty on purpose: not a comment, not a starter file, nothing to copy.
    const editor = host.querySelector<HTMLTextAreaElement>(
      "textarea[aria-label='Editable code']"
    );
    expect(editor).not.toBeNull();
    expect(editor!.value).toBe("");
  });

  it("shows the empty frame when the trainer has not shot the target yet", () => {
    render({
      ...labels,
      placeholder: "The picture is not here yet.",
      autoRun: true,
    });
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toContain("The picture is not here yet.");
    // The editor is still there and still empty.
    expect(
      host.querySelector<HTMLTextAreaElement>(
        "textarea[aria-label='Editable code']"
      )!.value
    ).toBe("");
  });

  it("makes the target clickable only when somewhere can open it", () => {
    const zoom = () => {};
    render({
      ...labels,
      image: "/curriculum/html/session2/Hw2.png",
      placeholder: "Build this at home.",
      onZoom: zoom,
    });
    const button = host.querySelector<HTMLButtonElement>(
      "button.cursor-zoom-in"
    );
    expect(button).not.toBeNull();
    act(() => button!.click());
    // The picture itself is never wrapped in a button without a lightbox to
    // open, so there is no dead control on the page.
    render({
      ...labels,
      image: "/curriculum/html/session2/Hw2.png",
      placeholder: "x",
    });
    expect(host.querySelector("button.cursor-zoom-in")).toBeNull();
  });
});
