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
  body: string;
  code?: string;
  images?: string[];
  videos?: string[];
  starterCode?: string;
  solutionCode?: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
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
  challenge: string;
  quiz: QuizQuestion[];
  accent: string;
  learningGoal?: string;
  successCriteria?: string[];
  commonMistake?: string;
  heroImage?: string;
};

export type CurriculumPhase = {
  id: number;
  month: number;
  en: string;
  meta: string;
  color: string;
};

/** Section factory. `images`, `starterCode`, `solutionCode` and `videos` are optional. */
export const s = (
  title: string,
  body: string,
  code?: string,
  images?: string[],
  starterCode?: string,
  solutionCode?: string,
  videos?: string[]
): CurriculumSection => ({
  title,
  body,
  code,
  images,
  starterCode,
  solutionCode,
  videos,
});

/** Quiz-question factory. Pass `extra` to attach question or option images. */
export const q = (
  question: string,
  options: string[],
  answer: number,
  explanation: string,
  extra?: Pick<QuizQuestion, "questionImages" | "optionImages">
): QuizQuestion => ({ question, options, answer, explanation, ...extra });
