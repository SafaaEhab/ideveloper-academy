import { describe, expect, it } from "vitest";
import { allWebLessons } from "./webCurriculum";

/**
 * The CSS track styles one real page - Sweet Bakery - across eight sessions,
 * and it carries its CSS inside the page rather than in a separate stylesheet,
 * because the live preview can only run what is in the document it is given.
 * So it has contracts the single-exercise tracks do not need: the project is
 * named in every session, every sample is a whole document whose CSS lives in
 * a `<style>` tag, every selector points at something the sample actually has,
 * and no session hands over an answer to copy.
 *
 * The HTML track is held to its own rules by `webCurriculum.test.ts`.
 */
const cssLessons = allWebLessons.filter(lesson => lesson.kind === "CSS");

/** The one file the whole course is built in. */
const PROJECT_FILE = "index.html";

/** The shop the track styles, and the tag its CSS lives inside. */
const PROJECT_NAME = "Sweet Bakery";
const STYLE_TAG = "<style>";

const proseOf = (lesson: (typeof cssLessons)[number]) =>
  [
    lesson.intro,
    lesson.challenge,
    ...lesson.sections.map(section => `${section.title} ${section.body ?? ""}`),
  ].join(" ");

describe("css curriculum", () => {
  it("runs eight sessions, four a month across months three and four", () => {
    expect(cssLessons).toHaveLength(8);
    cssLessons.forEach((lesson, index) => {
      expect(lesson.id).toBe(`css-${index + 1}`);
      // Month 3 is the language itself, month 4 is using it on the page.
      expect(lesson.month).toBe(index < 4 ? 3 : 4);
    });
  });

  it("shows the two months as two roadmap boxes, not one eight-session block", () => {
    // A student has to be able to see where they are. Eight sessions in one box
    // reads as a single lump, and the two halves are genuinely different months
    // of the calendar.
    const first = allWebLessons.filter(lesson => lesson.month === 3);
    const second = allWebLessons.filter(lesson => lesson.month === 4);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    // One box a month: every lesson in a month shares it.
    expect(new Set(first.map(lesson => lesson.phase)).size).toBe(1);
    expect(new Set(second.map(lesson => lesson.phase)).size).toBe(1);
    // And the two months are not the same box.
    expect(first[0].phase).not.toBe(second[0].phase);
  });

  it("gives every session the same shape as an HTML one", () => {
    // The CSS track is taught the same way the HTML track is: explain, hand the
    // student a target picture and an empty editor, then put the answer in a
    // section of its own. A session that ends on a starter with its own solution
    // underneath teaches nothing on the second run — the answer is one scroll
    // away the whole time.
    const wrong: string[] = [];
    for (const lesson of cssLessons) {
      const blanks = lesson.sections.filter(section => section.blank);
      if (blanks.length > 1) wrong.push(`${lesson.id}: more than one activity`);
      if (blanks.length === 1 && blanks[0].images?.length) {
        // The activity's picture belongs on the board, not the lesson gallery,
        // so the frame the student builds against is the first thing they see.
        const gallery = lesson.sections.filter(
          section =>
            !section.blank && section.images?.includes(blanks[0].images![0])
        );
        if (gallery.length > 0) {
          wrong.push(
            `${lesson.id}: the activity picture is also in the gallery`
          );
        }
      }
      // Every session that ships a starter must also have shipped its answer
      // somewhere the student has to choose to open.
      const solved = lesson.sections.filter(section => section.solutionCode);
      const answered = lesson.sections.some(section =>
        /the answer/i.test(section.title)
      );
      if (solved.length > 0 && blanks.length > 0 && !answered) {
        wrong.push(`${lesson.id}: has an activity but no answer section`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("prints a homework target on its own, never with a brief over it", () => {
    // A brief above the picture argues with the picture: the student either
    // follows the words and builds the wrong page, or reads both and cannot tell
    // which is the task. So a CSS homework is the frame and nothing else.
    const withBrief: string[] = [];
    for (const lesson of cssLessons) {
      if (lesson.homeworkImage && !lesson.homeworkNoBrief) {
        withBrief.push(
          `${lesson.id}: a target picture with a brief printed over it`
        );
      }
    }
    expect(withBrief).toEqual([]);
  });

  it("hands every interpreter a page for its CSS to live on", () => {
    // This is the contract that makes the interpreters work. Session one is
    // where the three ways of attaching CSS are introduced, so it is exempt:
    // the point of those snippets is the `<link>` and the comments around them.
    //
    // After that, every snippet a student can run must be a whole document with
    // its rules inside a <style> tag. A bare rule set looks fine in the editor
    // and renders against "Heading sample" with nothing to attach to, so the
    // student watches a page they cannot see a change on. Rules printed into
    // the head with no <style> around them are worse: the browser throws them
    // away and the preview silently comes back unstyled.
    const broken: string[] = [];
    for (const lesson of cssLessons) {
      if (lesson.id === "css-1") continue;
      const snippets: [string, string][] = [];
      for (const section of lesson.sections) {
        if (section.code) snippets.push([section.title, section.code]);
        if (section.starterCode)
          snippets.push([section.title, section.starterCode]);
        if (section.solutionCode)
          snippets.push([section.title, section.solutionCode]);
      }
      for (const [title, code] of snippets) {
        const src = code.trim();
        if (!src) continue;
        const where = `${lesson.id} / "${title}"`;
        if (!/<html[\s>]/i.test(src)) {
          broken.push(`${where}: not a whole document`);
          continue;
        }
        if (!/<body[\s>]/i.test(src)) {
          broken.push(`${where}: no <body> for the CSS to style`);
          continue;
        }
        const outside = src.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
        // A rule with no tag around it: text in the head or the body.
        if (/(^|>)\s*[.#]?[-\w]+(\s*,\s*[.#]?[-\w]+)*\s*\{[^}]*\}/.test(outside)) {
          broken.push(`${where}: CSS printed outside a <style> tag`);
          continue;
        }
        if (/<link[^>]+stylesheet/i.test(src)) {
          broken.push(
            `${where}: a <link> to style.css — nothing can load it in the preview`
          );
          continue;
        }
        if (!/<style[^>]*>/i.test(src)) {
          broken.push(`${where}: no <style> tag at all`);
          continue;
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("aims every selector at something the page actually has", () => {
    // A rule that matches nothing is a rule the student cannot check. The
    // browser says nothing at all, so a selector aimed at a class the markup
    // never used looks exactly like a rule they got wrong.
    const dead: string[] = [];
    for (const lesson of cssLessons) {
      for (const section of lesson.sections) {
        const src = (section.solutionCode ?? section.starterCode ?? "").trim();
        if (!src || !/<html[\s>]/i.test(src)) continue;
        const styleBlocks = [
          ...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
        ].map(match => match[1]);
        const markup = src.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
        const classes = new Set<string>();
        const ids = new Set<string>();
        const tags = new Set<string>();
        for (const match of markup.matchAll(/class\s*=\s*["']([^"']*)["']/gi)) {
          match[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
        }
        for (const match of markup.matchAll(/id\s*=\s*["']([^"']*)["']/gi)) {
          ids.add(match[1]);
        }
        for (const match of markup.matchAll(/<\/?([a-z][a-z0-9]*)/gi)) {
          tags.add(match[1].toLowerCase());
        }
        for (const block of styleBlocks) {
          const clean = block.replace(/\/\*[\s\S]*?\*\//g, "");
          for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            if (rule[1].includes("@") || rule[1].includes("{")) continue;
            for (const one of rule[1].split(",")) {
              const selector = one.trim();
              if (!selector || !/^[.#]?[-\w]+$/.test(selector)) continue;
              const cls = selector.match(/^\.([-\w]+)$/);
              const id = selector.match(/^#([-\w]+)$/);
              const tag = selector.match(/^([a-z][-\w]*)$/i);
              if (cls && !classes.has(cls[1])) {
                dead.push(`${lesson.id} / "${section.title}": .${cls[1]}`);
              } else if (id && !ids.has(id[1])) {
                dead.push(`${lesson.id} / "${section.title}": #${id[1]}`);
              } else if (tag && !tags.has(tag[1].toLowerCase())) {
                dead.push(
                  `${lesson.id} / "${section.title}": <${tag[1].toLowerCase()}>`
                );
              }
            }
          }
        }
      }
    }
    expect(dead).toEqual([]);
  });

  it("makes every interpreter apply the properties its own section teaches", () => {
    // A rule the student cannot see applied is a rule they will not remember. A
    // section that names a property and then shows a stub — or a bare rule that
    // the preview renders against "Heading sample", where nothing in the snippet
    // exists — teaches the name and not the thing. So: every property a section
    // names in its title has to appear in the code that section runs, and a
    // snippet that stands alone has to be a whole page.
    const stubs: string[] = [];
    for (const lesson of cssLessons) {
      for (const section of lesson.sections) {
        const runs = section.code ?? section.solutionCode ?? "";
        if (!runs) continue;
        const taught =
          section.title
            .toLowerCase()
            .match(/\b[a-z][a-z-]{3,}\b/g)
            ?.filter(word => word.includes("-") || word.length > 6) ?? [];
        for (const word of taught) {
          // Skip the English, keep anything that reads like a property name.
          if (
            !/^(width|height|padding|margin|border|background|colour|color|font|text|box|line|opacity|display|position|flex|grid|align|justify|content|weight|family|size|radius|style|width|transform|transition|overflow|z-index|float|clear|list|outline|cursor|filter|object|aspect|gap|order|flex|grid|grid|inline|block|none|inherit|initial|unset|auto|hidden|visible|solid|dashed|dotted|double|center|left|right|top|bottom|cover|contain|wrap|nowrap|column|row|reverse|stretch|bold|normal|italic|underline|overline|line-through|serif|sans-serif|monospace|pointer|default|border-box|content-box|relative|absolute|fixed|sticky|static|block|inline|inline-block|table|flex|grid|none|start|end|space|space-between|space-around|space-evenly|first|last|even|odd|only|read|write|all|both|horizontal|vertical|clip|ellipsis|pre|pre-wrap|pre-line|break-word|break-all|keep-all|uppercase|lowercase|capitalize|thin|medium|extralight|black|gray|grey|white|red|green|blue|yellow|orange|purple|pink|brown|gold|silver|transparent|currentcolor|repeat|no-repeat|repeat-x|repeat-y|cover|contain|fixed|scroll|local|baseline|middle|sub|super|top|text-top|bottom|text-bottom|inherit|initial|unset|revert|important|not|only|and|or|where|is|has|root|nth|first-child|last-child|first-of-type|last-of-type|only-child|empty|checked|disabled|enabled|required|optional|read-only|target|visited|active|hover|focus|before|after|placeholder|selection|first-letter|first-line|marker|backdrop)$/i.test(
              word
            )
          )
            continue;
          if (!runs.toLowerCase().includes(word)) {
            stubs.push(`${lesson.id} / "${section.title}" never uses ${word}`);
          }
        }
      }
    }
    expect(stubs).toEqual([]);
  });

  it("styles the one page the course builds, every session", () => {
    for (const lesson of cssLessons) {
      const prose = proseOf(lesson);
      expect(prose, `${lesson.id} never names the project`).toContain(
        PROJECT_NAME
      );
      expect(
        prose.includes(PROJECT_FILE),
        `${lesson.id} never says which file to edit`
      ).toBe(true);
      // The track teaches one way of attaching CSS, so every session has to say
      // out loud which one it is: a <style> tag in the head of index.html.
      expect(
        prose.includes(STYLE_TAG) || prose.toLowerCase().includes("style tag"),
        `${lesson.id} never says where the CSS goes`
      ).toBe(true);
    }
  });

  it("hands the student no answer to copy", () => {
    // A student who can read the answer writes no CSS at all, so no CSS
    // session fills the homework board in. The worked example inside a section
    // is teaching, and stays.
    for (const lesson of cssLessons) {
      expect(
        lesson.homeworkStarterCode,
        `${lesson.id} pre-fills the homework editor`
      ).toBeUndefined();
      expect(
        lesson.homeworkSolutionCode,
        `${lesson.id} ships a homework answer`
      ).toBeUndefined();
      expect(
        lesson.homeworkPreviewCode,
        `${lesson.id} ships a homework target`
      ).toBeUndefined();
    }
  });

  it("ships a runnable example or a picture for every section", () => {
    // The one exception is the closing checklist, which is a list the student
    // runs on the page and reads better as text.
    const checklist = "The closing checks";
    for (const lesson of cssLessons) {
      for (const section of lesson.sections) {
        if (section.title === checklist) continue;
        const showsSomething =
          section.code || section.starterCode || section.images?.length;
        expect(
          showsSomething,
          `${lesson.id} / ${section.title} shows nothing`
        ).toBeTruthy();
      }
    }
  });

  it("teaches by running the page, and points at nothing it no longer builds", () => {
    // The CSS track has no photographs of a finished site to show, because the
    // page it styles is the one the student builds in the editor in front of
    // them. So every teaching claim is made by running it: a rule the student
    // cannot see applied is a rule they will not remember.
    //
    // What it must not do is decay into a wall of prose, and it must not carry
    // a picture of a different shop. Both are the same failure: the lesson
    // points at something other than the page being built.
    const stale = cssLessons
      .flatMap(lesson =>
        lesson.sections.flatMap(section => section.images ?? [])
      )
      .filter(src => src.startsWith("/curriculum/bakery/"));
    expect(
      stale,
      "the track styles Sweet Bakery and has no photographs of another site"
    ).toEqual([]);
    for (const lesson of cssLessons) {
      const runnable = lesson.sections.filter(
        section => section.blank || section.code || section.starterCode
      ).length;
      expect(
        runnable,
        `${lesson.id} is mostly prose and nothing the student can run`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the talking short", () => {
    // A session is a workshop, not a chapter. The one long section is the
    // closing checklist, which is a list the student runs on the page.
    const talk = cssLessons.flatMap(lesson =>
      lesson.sections.filter(
        section => (section.body ?? "").trim().split(/\s+/).length > 110
      )
    );
    expect(talk.map(section => section.title)).toEqual([]);
  });

  it("keeps the session folder in the picture path and the session id in step", () => {
    // `/curriculum/css/session4/...` must belong to `css-4`. A mismatch means
    // the screenshot was filed under the wrong session.
    for (const lesson of cssLessons) {
      const folder = `/session${lesson.id.split("-")[1]}/`;
      for (const section of lesson.sections) {
        for (const src of section.images ?? []) {
          if (src.startsWith("/curriculum/css/")) {
            expect(src, `${lesson.id} points at ${src}`).toContain(folder);
          }
        }
      }
    }
  });

  it("never uses the same picture twice in the track", () => {
    // One screenshot showing two different things teaches the wrong thing.
    const seen = new Set<string>();
    const reused: string[] = [];
    for (const lesson of cssLessons) {
      for (const section of lesson.sections) {
        for (const src of section.images ?? []) {
          if (seen.has(src)) reused.push(`${src} in ${lesson.id}`);
          seen.add(src);
        }
      }
    }
    expect(reused).toEqual([]);
  });

  it("never leaves a correct answer in the same position twice in a session", () => {
    for (const lesson of cssLessons) {
      expect(lesson.quiz).toHaveLength(4);
      const seen = new Set<number>();
      for (const question of lesson.quiz) {
        expect(question.options).toHaveLength(4);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
        expect(
          seen.has(question.answer),
          `${lesson.id} repeats a position`
        ).toBe(false);
        seen.add(question.answer);
      }
    }
  });

  it("spreads the correct answer evenly across the whole track", () => {
    const tally = [0, 0, 0, 0];
    for (const lesson of cssLessons) {
      for (const question of lesson.quiz) tally[question.answer]++;
    }
    const total = tally.reduce((a, b) => a + b, 0);
    expect(total).toBe(cssLessons.length * 4);
    for (const count of tally) {
      // No position may carry more than a third of the answers.
      expect(count / total).toBeLessThanOrEqual(0.34);
    }
  });
});
