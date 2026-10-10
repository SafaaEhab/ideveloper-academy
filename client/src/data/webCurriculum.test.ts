import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  allWebLessons,
  coreLessons,
  curriculumPhases,
  LESSON_ACCENTS,
  TRACK_LABEL,
  WEB_MONTHS,
  WEB_TRACKS,
} from "./webCurriculum";
import {
  allHtmlLessons,
  HTML_LESSON_IDS,
  HTML_SESSION_COUNT,
} from "./htmlCurriculum";
import { PENDING_SHOT_PATHS } from "./htmlImageManifest";
import {
  allPythonLessons,
  curriculumPhases as pythonPhases,
} from "./pythonCurriculum";

const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));

/**
 * A picture that has been shot lives on the academy's own Cloudinary account,
 * with a real file extension and nothing after it.
 *
 * Checking the shape matters because the disk check below cannot see a remote
 * path at all: without it, a typo in the host or a missing extension would sail
 * through and land in front of a student as a broken image.
 *
 * The version segment Cloudinary puts in a URL — `upload/v1790752359/name.png` —
 * is optional here and gone from the newer links. A version pins one exact
 * revision, which is a trap: replace a picture on the account and every URL
 * carrying the old version keeps serving the old one, silently. Without it the
 * name always resolves to whatever is current, which is what a course wants.
 * Older links keep their version and still pass; both forms are one name deep.
 */
const CLOUDINARY =
  /^https:\/\/res\.cloudinary\.com\/alhiemg0\/image\/upload\/(?:[^/]+\/)?[^/]+\.(png|jpe?g|webp|gif|svg)$/;

/** True when the picture is shot, already on disk, or a screenshot still to be taken. */
const isShipped = (src: string) => {
  if (src.startsWith("http")) return CLOUDINARY.test(src);
  if (!src.startsWith("/")) return false;
  return (
    existsSync(publicDir + src.slice(1)) || PENDING_SHOT_PATHS.includes(src)
  );
};

const htmlLessons = allWebLessons.filter(lesson => lesson.kind === "HTML");

/**
 * The one section of a session where the student writes anything.
 *
 * The HTML track has no homework, so this is the whole of its in-class work:
 * the title starts with "Activity:", it carries no prose of its own, and it is
 * always the last section of the session.
 */
const activityOf = (lesson: (typeof htmlLessons)[number]) =>
  lesson.sections.find(section => section.title.toLowerCase().startsWith("activity"));

/** The eight activity files, in session order, as the track builds them. */
const activityFiles = htmlLessons.flatMap(lesson => {
  const activity = activityOf(lesson);
  return activity
    ? [
        {
          id: lesson.id,
          title: activity.title,
          starter: activity.starterCode ?? "",
          solution: activity.solutionCode ?? "",
        },
      ]
    : [];
});

/**
 * The file the student has in front of them at the end of the track: the last
 * session's activity solution. Everything the project is checked for is checked
 * against this, because this is the page they actually finish with.
 */
const finishedProject = activityFiles.at(-1)?.solution ?? "";


/**
 * Two sessions are allowed to measure themselves against the same picture, and
 * they are the only two. Sessions 4 and 5 build one page and the second one only
 * changes the links inside it, so the target page is deliberately the same: a
 * student comparing the two sessions should see that the work they did in one is
 * still standing in the next.
 *
 * A picture reused anywhere else is still a mistake, so the rule below holds for
 * every other session in the track.
 */
const SHARED_TARGETS = new Set(["Activity4.png"]);

/** Every code sample the track ships. */
const shippedSamples = htmlLessons.flatMap(lesson =>
  lesson.sections
    .flatMap(section => [
      { where: `${lesson.id}/${section.title}`, code: section.code },
      { where: `${lesson.id}/${section.title}`, code: section.starterCode },
      { where: `${lesson.id}/${section.title}`, code: section.solutionCode },
    ])
    .filter(sample => Boolean(sample.code))
);

/** All the prose and code of the track as one searchable blob. */
const trackText = htmlLessons
  .flatMap(lesson => [
    lesson.title,
    lesson.intro,
    lesson.learningGoal ?? "",
    lesson.commonMistake ?? "",
    ...(lesson.successCriteria ?? []),
    ...lesson.sections.flatMap(section => [
      section.title,
      section.body,
      section.code ?? "",
      section.starterCode ?? "",
      section.solutionCode ?? "",
    ]),
  ])
  .join("\n");

/** How many tags of each name are still open in a snippet. Empty = balanced. */
function countTags(code: string): Record<string, number> {
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const counts: Record<string, number> = {};
  for (const match of code.matchAll(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g
  )) {
    const [, closing, name, rest] = match;
    const tag = name.toLowerCase();
    if (voidTags.has(tag)) continue;
    if (closing) counts[tag] = (counts[tag] ?? 0) - 1;
    else if (!/\/\s*$/.test(rest)) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

/**
 * The web course is the same machine as the Python course, so it gets the same
 * checks. These assertions are the contract a new session has to satisfy.
 */
describe("web curriculum", () => {
  it("gives every month its own box on the roadmap", () => {
    // Months 3 and 4 are two halves of one subject, and a student still has to
    // be able to see where they are. So: one box a month, ids in order, and no
    // two months sharing a box.
    const byMonth = new Map<number, Set<number>>();
    for (const lesson of allWebLessons) {
      const boxes = byMonth.get(lesson.month) ?? new Set<number>();
      boxes.add(lesson.phase);
      byMonth.set(lesson.month, boxes);
    }
    for (const [month, boxes] of byMonth) {
      expect([...boxes], `month ${month} spans more than one box`).toHaveLength(
        1
      );
    }
    const monthOfBox = new Map<number, number>();
    for (const phase of curriculumPhases) {
      const seen = monthOfBox.get(phase.id);
      expect(seen, `box ${phase.id} is claimed by two months`).toBeUndefined();
      monthOfBox.set(phase.id, phase.month);
    }
    // Every box on the roadmap holds something, and its month matches the box.
    for (const phase of curriculumPhases) {
      const held = allWebLessons.filter(lesson => lesson.phase === phase.id);
      expect(
        held.length,
        `box ${phase.id} (${phase.en}) is empty`
      ).toBeGreaterThan(0);
      for (const lesson of held) {
        expect(lesson.month, `${lesson.id} sits in the wrong month's box`).toBe(
          phase.month
        );
      }
    }
  });

  it("describes the roadmap phases in order, one for every track and more", () => {
    // Three tracks, plus the project block the roadmap puts at the end.
    expect(curriculumPhases.length).toBeGreaterThanOrEqual(WEB_TRACKS.length);
    curriculumPhases.forEach((phase, index) => {
      expect(phase.id).toBe(index + 1);
      expect(phase.month).toBeGreaterThanOrEqual(1);
      expect(phase.month).toBeLessThanOrEqual(WEB_MONTHS);
      expect(phase.en.length).toBeGreaterThan(0);
      expect(phase.meta.length).toBeGreaterThan(0);
      expect(phase.color).toMatch(/^from-/);
    });
  });

  it("labels and colours every track it declares", () => {
    for (const track of WEB_TRACKS) {
      expect(TRACK_LABEL[track]).toBe(track);
      expect(LESSON_ACCENTS[track]).toMatch(/^from-/);
    }
  });

  it("keeps the published sessions consistent with the Python course rules", () => {
    for (const lesson of allWebLessons) {
      expect(WEB_TRACKS).toContain(lesson.kind);
      expect(curriculumPhases.map(phase => phase.id)).toContain(lesson.phase);
      expect(lesson.number).toBeGreaterThan(0);
      expect(lesson.month).toBeGreaterThanOrEqual(1);
      expect(lesson.month).toBeLessThanOrEqual(WEB_MONTHS);
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(3);
      // Two sections are allowed to carry no prose on purpose, and both say so
      // in their title: a blank board is an empty picture slot, and an activity
      // is a page the student fills in rather than a paragraph they read. Every
      // other section has to say something.
      expect(
        lesson.sections.every(
          section =>
            section.blank ||
            section.title.toLowerCase().startsWith("activity") ||
            (section.body ?? "").length > 0
        )
      ).toBe(true);
      // The take-home brief is optional on the shared lesson type, and the
      // JavaScript track deliberately ships none — it ends on its in-class
      // practice instead. The tracks that do send work home are held to it
      // below, so an empty brief there would still fail.
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const question of lesson.quiz) {
        expect(question.options).toHaveLength(4);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
        expect(question.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it("numbers sessions consecutively and gives every session a unique id", () => {
    const ids = allWebLessons.map(lesson => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    allWebLessons
      .slice()
      .sort((a, b) => a.number - b.number)
      .forEach((lesson, index) => {
        expect(lesson.number).toBe(index + 1);
      });
  });

  it("exposes exactly the sessions it publishes", () => {
    expect(allWebLessons).toEqual(coreLessons);
  });

  it("ships every local lesson image inside client/public", () => {
    const missing = allWebLessons.flatMap(lesson =>
      lesson.sections.flatMap(section =>
        (section.images ?? [])
          .filter(src => src.startsWith("/") && !isShipped(src))
          .map(src => `${lesson.id}: ${src}`)
      )
    );
    // Grouped by track, because a migration in one track should not hide a
    // genuine typo in another.
    const byTrack = new Map<string, number>();
    for (const entry of missing) {
      const track = allWebLessons.find(lesson =>
        entry.startsWith(`${lesson.id}:`)
      )?.kind;
      byTrack.set(track ?? "?", (byTrack.get(track ?? "?") ?? 0) + 1);
    }
    expect(
      Object.fromEntries(byTrack),
      `${missing.length} image(s) referenced but not on disk â€” sample: ${missing
        .slice(0, 3)
        .join(", ")}`
    ).toEqual({});
  });

  it("describes phases with the same fields the Python roadmap uses", () => {
    const fields = (phase: object) => Object.keys(phase).sort();
    expect(fields(curriculumPhases[0])).toEqual(fields(pythonPhases[0]));
  });

  it("publishes the JavaScript sessions of the track", () => {
    // A session is only added to `coreLessons` once its content is ready, so a
    // track that is still being written shows its empty phase rather than a
    // half-finished page.
    const jsSessions = allWebLessons.filter(
      lesson => lesson.kind === "JavaScript"
    );
    expect(jsSessions.length).toBeGreaterThan(0);
    jsSessions.forEach(lesson => {
      expect(lesson.sections.length).toBeGreaterThanOrEqual(3);
      expect(lesson.quiz.length).toBeGreaterThan(0);
    });
    expect(allPythonLessons.length).toBeGreaterThan(0);
  });

  /**
   * The JavaScript track sends nobody home with a sheet of paper. Every session
   * ends on the practice built in the room, which is why the track carries no
   * take-home brief and no worksheet page — and this is the check that stops
   * one of either being added back by accident.
   */
  it("gives the JavaScript track no homework at all", () => {
    const jsSessions = allWebLessons.filter(
      lesson => lesson.kind === "JavaScript"
    );
    expect(jsSessions.length).toBeGreaterThan(0);

    const handedHome: string[] = [];
    for (const lesson of jsSessions) {
      if ((lesson.challenge ?? "").trim().length > 0) {
        handedHome.push(`${lesson.id}: a take-home brief`);
      }
      for (const key of [
        "homeworkOffsite",
        "homeworkStarterCode",
        "homeworkSolutionCode",
        "homeworkPreviewCode",
        "homeworkTargetFile",
        "homeworkImage",
        "homeworkNoBrief",
      ] as const) {
        if (lesson[key]) handedHome.push(`${lesson.id}: ${key}`);
      }
      for (const section of lesson.sections) {
        if (/home ?work/i.test(`${section.title} ${section.body ?? ""}`)) {
          handedHome.push(`${lesson.id}: "${section.title}"`);
        }
        for (const src of section.images ?? []) {
          if (/homework/i.test(src)) handedHome.push(`${lesson.id}: ${src}`);
        }
        if ((section.starterCode ?? "").length === 0 && section.solutionCode) {
          // A solution with nothing to start from is not a practice, it is a
          // page of answers — never how this track teaches.
          handedHome.push(`${lesson.id}: "${section.title}" has no starter`);
        }
      }
    }
    expect(handedHome).toEqual([]);
  });

  /**
   * Loops and functions were one session until they were too much for one, and
   * splitting them is exactly when a question gets left behind in the wrong
   * half — the quiz looks the same either way, and a student cannot tell.
   */
  it("keeps each half of the split asking only about its own subject", () => {
    const loops = allWebLessons.find(lesson => lesson.id === "js-3")!;
    const functions = allWebLessons.find(lesson => lesson.id === "js-3b")!;

    // The loops half cannot talk about functions, and the functions half can
    // only mention a loop to say one goes inside.
    const inLoops = [
      /function/i,
      /parameter/i,
      /\bcall(?:ing|ed)?\b/i,
      /\breturn\b/i,
    ];
    const stray: string[] = [];
    for (const pattern of inLoops) {
      for (const question of loops.quiz) {
        if (pattern.test(question.question))
          stray.push(`js-3 asks: ${question.question}`);
      }
    }
    expect(stray).toEqual([]);

    // And neither half may claim the whole session: the quiz has to cover the
    // loop or the function, not the pair.
    const loopsSubject = /loop|for \(|while|counter|index/i;
    const functionsSubject = /function|parameter|call/i;
    expect(
      loops.quiz.filter(question => loopsSubject.test(question.question))
        .length
    ).toBeGreaterThanOrEqual(3);
    expect(
      functions.quiz.filter(question => functionsSubject.test(question.question))
        .length
    ).toBeGreaterThanOrEqual(3);
  });

  it("publishes the split loops and functions sessions as 19 and 20", () => {
    // The split was made because two tools in two hours was too much, so the two
    // halves have to stay two sessions and keep their order.
    const numbers = allWebLessons
      .filter(lesson => lesson.id === "js-3" || lesson.id === "js-3b")
      .map(lesson => lesson.number);
    expect(numbers).toEqual([19, 20]);
    expect(allWebLessons.find(lesson => lesson.id === "js-3")!.title).toMatch(
      /loop/i
    );
    expect(allWebLessons.find(lesson => lesson.id === "js-3b")!.title).toMatch(
      /function/i
    );
  });

  it("gives every session a cover image that ships with it", () => {
    for (const lesson of allWebLessons) {
      expect(lesson.heroImage).toBeTruthy();
      // A cover may sit on disk or on the cloud, and the track is moving to the
      // cloud one picture at a time — so this asks the same question the rest of
      // the file asks, rather than assuming a folder is still there.
      expect(isShipped(lesson.heroImage!), `${lesson.id} cover`).toBe(true);
    }
  });
});

/**
 * The HTML track gets its own block of checks because it is the entry point of
 * the course and the one students meet first. These are the rules that keep it
 * teachable rather than merely present.
 */
describe("html curriculum", () => {
  it("runs the eight two-hour sessions across the first two months", () => {
    // A session is two hours in the room. The track is eight of them: four in
    // month one, four in month two. If the track grows, this is the test that
    // says stop and re-plan.
    expect(HTML_SESSION_COUNT).toBe(8);
    expect(allHtmlLessons.length).toBe(8);
    expect(HTML_LESSON_IDS).toEqual([
      "html-1",
      "html-2",
      "html-3",
      "html-4",
      "html-5",
      "html-6",
      "html-7",
      "html-8",
    ]);
    expect(allHtmlLessons.map(lesson => lesson.month)).toEqual([
      1, 1, 1, 1, 2, 2, 2, 2,
    ]);
    // The track is published first, and holds the lowest numbers.
    expect(allHtmlLessons[0].number).toBe(1);
    expect(allHtmlLessons.at(-1)!.number).toBe(HTML_SESSION_COUNT);
  });

  it("sits in the HTML phase of the roadmap", () => {
    const htmlPhase = curriculumPhases.find(phase => phase.id === 1);
    expect(htmlPhase).toBeDefined();
    for (const lesson of allHtmlLessons) {
      expect(lesson.phase).toBe(1);
      expect(lesson.kind).toBe("HTML");
      expect(TRACK_LABEL[lesson.kind]).toBe("HTML");
    }
  });

  it("gives every session a full header", () => {
    for (const lesson of allHtmlLessons) {
      expect(lesson.learningGoal, lesson.id).toBeTruthy();
      expect(lesson.successCriteria?.length, lesson.id).toBeGreaterThanOrEqual(
        3
      );
      expect(lesson.commonMistake, lesson.id).toBeTruthy();
      expect(lesson.intro.length, lesson.id).toBeGreaterThan(40);
      expect(lesson.subtitle.length, lesson.id).toBeGreaterThan(0);
      // The track sends no work home, so there is no brief to print on a card.
      expect(lesson.challenge, lesson.id).toBeFalsy();
    }
  });

  /**
   * The activity is the session. It has to be there, it has to be last, and it
   * has to be a page to work on rather than a paragraph to read — otherwise a
   * session ends on an explanation and the student walks out with nothing.
   */
  it("ends every session on exactly one activity the student builds", () => {
    for (const lesson of allHtmlLessons) {
      const activities = lesson.sections.filter(section =>
        section.title.toLowerCase().startsWith("activity")
      );
      expect(activities.length, `${lesson.id} activities`).toBe(1);
      expect(
        lesson.sections[lesson.sections.length - 1].title,
        `${lesson.id} does not end on its activity`
      ).toBe(activities[0].title);

      const activity = activities[0];
      // No prose: the activity is a target, and a brief above it turns the
      // editor into a transcription instead of a build.
      expect(activity.body, `${lesson.id} activity still has words`).toBe("");
      expect(
        activity.starterCode,
        `${lesson.id} activity does not open on a file`
      ).toBeTruthy();
      expect(
        activity.solutionCode,
        `${lesson.id} activity ships no answer`
      ).toBeTruthy();
    }
  });

  it("ties every quiz question back to the section that answers it", () => {
    // The quiz sits at the bottom of a long page. A student who cannot place
    // the answer has nowhere to go, so every question names the section it came
    // from â€” and the name has to resolve, or renaming a section would quietly
    // leave a dead link in front of a class.
    const orphans: string[] = [];
    for (const lesson of htmlLessons) {
      const titles = new Set(lesson.sections.map(section => section.title));
      for (const [index, question] of lesson.quiz.entries()) {
        if (!question.section) {
          orphans.push(`${lesson.id} Q${index + 1} names no section`);
          continue;
        }
        if (!titles.has(question.section)) {
          orphans.push(
            `${lesson.id} Q${index + 1} -> "${question.section}" (no such section)`
          );
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it("keeps a session's questions on that session's own subject", () => {
    // Splitting one session in two is exactly when a question gets left behind
    // in the wrong half, and a student cannot tell — the quiz looks the same
    // either way. These two were one session, so neither may ask about the tags
    // the other one teaches.
    const TABLES = [
      "table",
      "tr",
      "th",
      "td",
      "caption",
      "thead",
      "tbody",
      "colspan",
      "rowspan",
    ];
    const FORMS = [
      "form",
      "label",
      "input",
      "select",
      "textarea",
      "fieldset",
      "legend",
      "button",
      "radio",
      "checkbox",
    ];
    const halves = [
      { id: "html-7", mine: TABLES, theirs: FORMS },
      { id: "html-8", mine: FORMS, theirs: TABLES },
    ];
    const stray: string[] = [];
    for (const half of halves) {
      const lesson = htmlLessons.find(item => item.id === half.id)!;
      for (const tag of half.theirs) {
        const pattern = new RegExp(`<${tag}[\\s>]|\\b${tag}\\b`, "i");
        for (const question of lesson.quiz.filter(q =>
          pattern.test(q.question)
        )) {
          stray.push(`${half.id} asks about <${tag}>: ${question.question}`);
        }
      }
    }
    expect(stray).toEqual([]);
  });

  it("never leaves a correct answer in the same position twice in a session", () => {
    // Four questions, four options, and the correct answer must land in a
    // different position each time. Otherwise a student who always ticks the
    // same box scores full marks, and the quiz measures nothing.
    for (const lesson of allHtmlLessons) {
      expect(lesson.quiz, lesson.id).toHaveLength(4);
      const positions = lesson.quiz.map(question => question.answer);
      expect(
        [...positions].sort(),
        `${lesson.id} answer positions ${positions.join(",")}`
      ).toEqual([0, 1, 2, 3]);
    }
  });

  it("spreads the correct answer evenly across the whole track", () => {
    const tally = [0, 0, 0, 0];
    for (const lesson of htmlLessons) {
      for (const question of lesson.quiz) tally[question.answer]++;
    }
    const total = tally.reduce((a, b) => a + b, 0);
    expect(total).toBe(htmlLessons.length * 4);
    for (const count of tally) {
      // No position may carry more than a third of the answers.
      expect(count / total).toBeLessThanOrEqual(0.34);
    }
  });

  it("never uses the same picture twice in the track", () => {
    // One screenshot showing two different things teaches the wrong thing, and
    // the activity output of session 2 must not also be the output of session 6.
    // The two sessions that share a target on purpose are listed above.
    const seen = new Map<string, string>();
    const reused: string[] = [];
    for (const lesson of htmlLessons) {
      for (const section of lesson.sections) {
        for (const src of section.images ?? []) {
          const file = src.split("/").pop() ?? src;
          if (SHARED_TARGETS.has(file)) continue;
          const where = `${lesson.id}/${section.title}`;
          if (seen.has(src))
            reused.push(`${src} in ${seen.get(src)} and ${where}`);
          seen.set(src, where);
        }
      }
    }
    expect(reused).toEqual([]);
  });

  it("references only images that exist or are on the shot list", () => {
    // A picture is valid if the file is already shot and served from the cloud
    // or on disk, or declared in the photo manifest. Anything else is a typo,
    // and a typo is a broken image in front of a student.
    const broken = htmlLessons.flatMap(lesson =>
      lesson.sections
        .flatMap(section =>
          (section.images ?? [])
            .filter(src => !isShipped(src))
            .map(src => `${lesson.id}: ${src}`)
        )
    );
    expect(broken).toEqual([]);
  });

  it("keeps the photo manifest honest", () => {
    // The manifest is a shot list, so every entry on it has to be a shot some
    // session is actually waiting for. An entry nothing references is a picture
    // nobody asked for, and it is how a shot list quietly stops meaning anything.
    const referenced = new Set(
      htmlLessons.flatMap(lesson =>
        lesson.sections.flatMap(section => section.images ?? [])
      )
    );
    const orphans = PENDING_SHOT_PATHS.filter(src => !referenced.has(src));
    expect(
      orphans,
      "listed in the shot list but referenced by no section"
    ).toEqual([]);
    expect(new Set(PENDING_SHOT_PATHS).size).toBe(PENDING_SHOT_PATHS.length);
  });

  it("keeps the session folder in the picture path and the session id in step", () => {
    // `/curriculum/html/session6/...` must belong to `html-6`. A mismatch means
    // the screenshot was filed under the wrong session.
    for (const lesson of allHtmlLessons) {
      const folder = `/session${lesson.number}/`;
      const pictures = lesson.sections.flatMap(section => section.images ?? []);
      for (const src of pictures) {
        if (src.startsWith("/curriculum/html/")) {
          expect(src, `${lesson.id} points at ${src}`).toContain(folder);
        }
      }
    }
  });

  it("keeps the first four sessions in month one and the rest in month two", () => {
    const first = allHtmlLessons.filter(lesson => lesson.month === 1);
    const second = allHtmlLessons.filter(lesson => lesson.month === 2);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    // Month one is the entry point, so it must open with the very first page.
    expect(first[0].id).toBe("html-1");
  });

  it("covers the whole HTML syllabus the sessions promise", () => {
    // The topics the track claims to teach. Each one was either missing from the
    // track once, or is load-bearing for a later session.
    const syllabus: Record<string, RegExp> = {
      containers: /<div[\s>]/,
      inline: /<span[\s>]/,
      charset: /<meta charset=/,
      viewport: /name="viewport"/,
      pageDescription: /name="description"/,
      language: /lang="/,
      header: /<header[\s>]/,
      nav: /<nav[\s>]/,
      main: /<main[\s>]/,
      footer: /<footer[\s>]/,
      section: /<section[\s>]/,
      article: /<article[\s>]/,
      aside: /<aside[\s>]/,
      figure: /<figure[\s>]/,
      figcaption: /<figcaption[\s>]/,
      listItems: /<li[\s>]/,
      orderedList: /<ol[\s>]/,
      unorderedList: /<ul[\s>]/,
      emailLink: /mailto:/,
      phoneLink: /tel:/,
      safeTarget: /rel="noopener"/,
      ampEntity: /&amp;/,
      lessThanEntity: /&lt;/,
      nonBreakingSpace: /&nbsp;/,
      copyrightEntity: /&copy;/,
      audio: /<audio[\s>]/,
      video: /<video[\s>]/,
      source: /<source[\s>]/,
      embed: /<iframe[\s>]/,
      table: /<table[\s>]/,
      tableHead: /<th[\s>]/,
      tableBody: /<tbody[\s>]/,
      caption: /<caption[\s>]/,
      spanColumns: /colspan=/,
      spanRows: /rowspan=/,
      form: /<form[\s>]/,
      label: /<label[\s>]/,
      select: /<select[\s>]/,
      textarea: /<textarea[\s>]/,
      fieldset: /<fieldset[\s>]/,
      legend: /<legend[\s>]/,
      required: /required/,
      action: /action=/,
      // The validator and the accessibility pass belonged to the eighth session,
      // which is no longer part of the track.
      accessibility: /screen reader/i,
    };
    const missing = Object.entries(syllabus)
      .filter(([, pattern]) => !pattern.test(trackText))
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });

  it("never teaches a mistake in a code sample", () => {
    // The examples students copy are the examples they learn from. A label with
    // no `for`, or an unquoted href, is worse than no example at all. The two
    // deliberately broken samples are excluded above, because those exist to
    // be found and fixed.
    const offenders: string[] = [];
    for (const { where, code } of shippedSamples) {
      // A label with no `for` is the mistake session 7 names in its own header.
      if (/<label>\s*(First|Last|Your|Username|Email|Name)/i.test(code!)) {
        offenders.push(`${where}: label with no for`);
      }
      // Relative hrefs always carry their quotes.
      const unquoted = code!.match(/href=[^"'\s>][^\s>]*/g) ?? [];
      for (const match of unquoted) offenders.push(`${where}: ${match}`);
      // A radio needs its own id, or only the first one is reachable by label.
      for (const radio of code!.match(/<input[^>]*type="radio"[^>]*>/g) ?? []) {
        if (!/\sid="/.test(radio)) offenders.push(`${where}: radio without id`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("balances every tag in every code sample it ships", () => {
    for (const { where, code } of shippedSamples) {
      const counts = countTags(code!);
      expect(
        Object.entries(counts)
          .filter(([, count]) => count !== 0)
          .map(([tag, count]) => `${tag}${count > 0 ? "+" : ""}${count}`),
        where
      ).toEqual([]);
    }
  });

  it("ends a session on its build, not on an explanation", () => {
    // The last section is the activity, and the activity is a file to work on.
    // If that ever changes, a two-hour session ends with reading and the student
    // leaves with nothing of their own — so it is pinned from both sides.
    for (const lesson of allHtmlLessons) {
      const last = lesson.sections[lesson.sections.length - 1];
      expect(last.title.toLowerCase(), `${lesson.id} last section`).toContain(
        "activity"
      );
      expect(
        last.starterCode,
        `${lesson.id} does not end on an editor`
      ).toBeTruthy();
      // And the teaching comes first: a session cannot open on the activity and
      // explain it afterwards.
      expect(
        lesson.sections.filter(section =>
          section.title.toLowerCase().startsWith("activity")
        ).length,
        `${lesson.id} activity count`
      ).toBe(1);
    }
  });

  /**
   * The chain: every session's activity opens on precisely the file the session
   * before finished, and adds something to it.
   *
   * This is the single invariant that makes the HTML track one build rather than
   * eight exercises, and it is the strictest thing in the file. Break it — by
   * editing one solution and forgetting the next starter — and the student
   * silently loses whatever sat between the two, with nothing on screen to say so.
   */
  it("carries the file forward: each session opens on the one before", () => {
    expect(activityFiles).toHaveLength(allHtmlLessons.length);
    for (let i = 1; i < activityFiles.length; i++) {
      const previous = activityFiles[i - 1];
      const current = activityFiles[i];
      expect(
        current.starter,
        `${current.id} does not open on ${previous.id}'s work`
      ).toBe(previous.solution);
      // A solution identical to its starter teaches nothing, and one shorter
      // than what it started from is a regression dressed up as an answer.
      expect(
        current.solution.trim(),
        `${current.id} solution adds nothing`
      ).not.toBe(current.starter.trim());
      expect(
        current.solution.length,
        `${current.id} solution is shorter than its start`
      ).toBeGreaterThan(current.starter.length);
    }
    // The first session has nothing to carry, so it opens on a real page
    // skeleton rather than on nothing at all.
    expect(
      activityFiles[0].starter,
      "html-1 opens on an empty editor"
    ).toContain("<!DOCTYPE html>");
  });

  it("builds one page the whole way through, not eight exercises", () => {
    // The bakery is the spine of the track. Every session must be working on
    // it — otherwise the course quietly turns back into a pile of exercises.
    for (const lesson of allHtmlLessons) {
      const prose = [
        lesson.title,
        lesson.intro,
        ...lesson.sections.map(s => `${s.title} ${s.body ?? ""}`),
      ].join(" ");
      expect(prose, `${lesson.id} never names the project`).toContain(
        "Sweet Bakery"
      );
    }
    // And the title of the page the student saves says so too, so the file on
    // their own disk is identifiable months later.
    expect(finishedProject, "the finished page has no title").toMatch(
      /<title>[^<]*Sweet Bakery[^<]*<\/title>/
    );
  });

  it("builds one file, not four", () => {
    // The track grew out of a plan for a four-page site. It is one page: the
    // chain above proves a single file is carried forward, so a link to a second
    // file inside the page the student builds would send them somewhere the
    // course never creates.
    //
    // This reads the activity files, not the prose. A session may name about.html
    // while teaching what an href looks like — that is an example, and an
    // example is the one thing here that is allowed to mention a file that does
    // not exist yet.
    const others = ["about.html", "products.html", "order.html"];
    for (const file of activityFiles) {
      for (const other of others) {
        expect(
          `${file.starter}\n${file.solution}`,
          `${file.id} links to ${other}, which the track never builds`
        ).not.toContain(other);
      }
    }
  });


  it("balances the tags in every file the project ships", () => {
    // The build code is what a student copies most literally, so it is held to
    // the same standard as the examples. Only the last solution is checked: the
    // chain guarantees every earlier one is a prefix of it, so a tag opened in
    // session 3 and closed in session 6 is checked exactly where it is closed.
    const counts = countTags(finishedProject);
    expect(
      Object.entries(counts)
        .filter(([, count]) => count !== 0)
        .map(([tag, count]) => `${tag}${count > 0 ? "+" : ""}${count}`)
    ).toEqual([]);
  });

  it("never teaches a mistake in the project files", () => {
    // A build file is the most-copied text in the course. An unquoted href or a
    // label with no `for` in here is a mistake installed into every future page.
    const offenders: string[] = [];
    for (const file of activityFiles) {
      for (const code of [file.starter, file.solution]) {
        if (/href=[^"'\s>]/.test(code)) offenders.push(`${file.id}: unquoted href`);
        if (/<label>\s*(Your|Email|Phone|Name)/i.test(code)) {
          offenders.push(`${file.id}: label with no for`);
        }
        for (const radio of code.match(/<input[^>]*type="radio"[^>]*>/g) ?? []) {
          if (!/\sid="/.test(radio)) offenders.push(`${file.id}: radio without id`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never asks for a tag an earlier session has not taught yet", () => {
    // The sessions run in order, so a later one may only use tags that already
    // appeared. A <figure> in session 3 would be a step backwards.
    const LATER = new Set([
      "figure",
      "figcaption",
      "video",
      "audio",
      "iframe",
      "table",
      "form",
      "select",
      "textarea",
      "fieldset",
      "legend",
      "source",
      "caption",
      "thead",
      "tbody",
      "th",
      "tr",
      "td",
      "label",
      "button",
    ]);
    const introducedAt: Record<string, number> = {
      figure: 4,
      video: 6,
      audio: 6,
      iframe: 6,
      table: 7,
      // Forms were split out of the tables session into a session of their own.
      form: 8,
    };
    for (const lesson of htmlLessons) {
      const code = lesson.sections
        .flatMap(s => [s.code, s.starterCode, s.solutionCode])
        .filter(Boolean)
        .join("\n");
      for (const match of code.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)[\s>]/g)) {
        const name = match[1].toLowerCase();
        if (!LATER.has(name) || !introducedAt[name]) continue;
        expect(
          lesson.number >= introducedAt[name],
          `${lesson.id} uses <${name}>, which is not taught until session ${introducedAt[name]}`
        ).toBe(true);
      }
    }
  });

  it("uses every tag the syllabus promises somewhere in the page it builds", () => {
    // The finished page is the proof the course covered its syllabus. Anything
    // the sessions claim to teach should end up in the file the student walks
    // out with.
    //
    // Twelve tags are taught in the guide but the Sweet Bakery page does not use
    // them yet — the layout is built with divs, and the price list and the order
    // form are a plain table and a plain form. That is a real gap in the project,
    // written down here rather than left for the next reader to rediscover: put
    // the tag into the page and drop it from this list, and the test says so.
    const NOT_YET_IN_THE_PAGE = new Set([
      // Taught in session 4 beside the images, never applied to the page.
      "figure",
      "figcaption",
      // The semantic layout set, taught but the page is still div soup.
      "header",
      "nav",
      "main",
      "aside",
      "article",
      "footer",
      // Taught in session 8 for grouping radio buttons; the order form has one
      // button per field and nothing to group.
      "fieldset",
      "legend",
      // The price list table has headings but no caption, and the guide never
      // reaches for a <span> on a page made of whole blocks.
      "caption",
      "span",
    ]);
    for (const tag of [
      "video",
      "audio",
      "iframe",
      "table",
      "thead",
      "tbody",
      "form",
      "label",
      "select",
      "textarea",
    ]) {
      expect(finishedProject, `<${tag}> never appears in the page`).toMatch(
        new RegExp(`<${tag}[\\s>]`, "i")
      );
    }
    // And the allowance itself is not allowed to rot: nothing on the list may
    // quietly turn up in the page, because a tag the page already uses cannot go
    // on being described as missing.
    const staleAllowance = [...NOT_YET_IN_THE_PAGE].filter(tag =>
      new RegExp(`<${tag}[\\s>]`, "i").test(finishedProject)
    );
    expect(
      staleAllowance,
      "now in the page — take them off the list"
    ).toEqual([]);
  });
});
