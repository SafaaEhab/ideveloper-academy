/**
 * One curriculum shape, shared by every course in the academy.
 *
 * Python, Scratch and Web all describe a session the same way: a header
 * (month, phase, kind), an ordered list of sections, one homework block, and a
 * list of quiz questions. Keeping the types in a single place is what guarantees
 * the three courses stay identical in shape — add a field here and every course
 * picks it up at once.
 */

export type CurriculumSection = {
  title: string;
  /** Optional: a picture-led section can carry no prose at all. */
  body?: string;
  code?: string;
  images?: string[];
  videos?: string[];
  starterCode?: string;
  solutionCode?: string;
  /**
   * An activity the trainer has not written yet: no words, no picture, no
   * answer — just the empty frame the picture goes in and an editor that opens
   * blank. The student is meant to build it, not copy it.
   */
  blank?: boolean;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  /**
   * The title of the section in this same lesson that answers the question.
   *
   * The quiz sits at the bottom of a long page, so a student who cannot place
   * the answer has nowhere to go and no way to recover. Naming the source turns
   * every question into a door back to the paragraph that explains it — and
   * because a test checks the name resolves, a renamed section fails loudly
   * instead of quietly leaving a dead link.
   */
  section?: string;
  questionImages?: string[];
  /** `optionImages[i]` holds the pictures for option `i`, if that option has any. */
  optionImages?: (string[] | undefined)[];
};

/**
 * `Kind` is the course-specific label shown on the session badge:
 * `"core" | "problem"` for Python and Scratch, `"HTML" | "CSS" | "JavaScript"`
 * for Web. It defaults to the Python pair so existing lessons need no annotation.
 */
export type CurriculumLesson<Kind extends string = "core" | "problem"> = {
  id: string;
  number: number;
  month: number;
  phase: number;
  kind: Kind;
  title: string;
  subtitle: string;
  intro: string;
  sections: CurriculumSection[];
  /**
   * The task the student takes away, printed on the homework card.
   *
   * Optional because a session may end on the practice it was built in: the
   * JavaScript track sends nobody home with a sheet of paper, so none of its
   * sessions set this. Python and Scratch still set it, and the courses that
   * render it check for it first.
   */
  challenge?: string;
  quiz: QuizQuestion[];
  accent: string;
  learningGoal?: string;
  successCriteria?: string[];
  commonMistake?: string;
  heroImage?: string;
  /**
   * A homework that is written, not built. The student does it away from the
   * site — in their own editor, in the browser, on paper — and the page shows the
   * task alone. No editor opens for it, because an empty box in front of a
   * research task only tells the student they are doing it the wrong way. The
   * first HTML session is the one that works this way: install the editor,
   * search the web, fill in a notebook.
   */
  homeworkOffsite?: boolean;
  /**
   * The homework editor opens on this file instead of an empty comment, and the
   * answer is shown beside it. A course that builds one project across its
   * sessions needs the homework to continue the file the activity left behind —
   * without these, every night a student would be asked to start from nothing.
   */
  homeworkStarterCode?: string;
  homeworkSolutionCode?: string;
  /**
   * The finished page, as a document, for a homework block that shows the
   * result instead of the answer. A student who can read the code writes no
   * code at all, so a project track ships the target and keeps the CSS out of
   * sight — see `cssAnswerKey.ts` for the answer the trainer keeps.
   */
  homeworkPreviewCode?: string;
  /** The file, or files, the target page is built from — shown on its frame. */
  homeworkTargetFile?: string;
  /**
   * The page the homework is measured against, shown on the frame above the
   * empty editor. The student builds to it at home and the answer is never
   * shipped beside it, so a picture is the only thing the night gives away.
   */
  homeworkImage?: string;
  /**
   * Print the target picture on its own, with no brief above it.
   *
   * Some homework is only a picture to copy, and a paragraph of instructions
   * beside it argues with the picture rather than helping: the student either
   * follows the words and builds the wrong page, or reads both and cannot tell
   * which one is the task. The brief stays on the lesson either way — this only
   * decides whether it is printed.
   */
  homeworkNoBrief?: boolean;
};

export type CurriculumPhase = {
  id: number;
  month: number;
  en: string;
  meta: string;
  color: string;
};

/**
 * Section factory. `body`, `code`, `images`, `starterCode`, `solutionCode`,
 * `videos` and `blank` are all optional — a picture-led section carries no prose,
 * and an unwritten activity carries nothing but a frame and a blank editor.
 */
export const s = (
  title: string,
  body?: string,
  code?: string,
  images?: string[],
  starterCode?: string,
  solutionCode?: string,
  videos?: string[],
  blank?: boolean
): CurriculumSection => ({
  title,
  body,
  code,
  images,
  starterCode,
  solutionCode,
  videos,
  blank,
});

/** Quiz-question factory. Pass `extra` to attach the source section or images. */
export const q = (
  question: string,
  options: string[],
  answer: number,
  explanation: string,
  extra?: Pick<QuizQuestion, "section" | "questionImages" | "optionImages">
): QuizQuestion => ({ question, options, answer, explanation, ...extra });
