import { allPythonLessons } from "../client/src/data/pythonCurriculum";
import { allScratchLessons } from "../client/src/data/scratchCurriculum";
import { allWebLessons } from "../client/src/data/webCurriculum";

/**
 * Server-side view of the curriculum.
 *
 * The quiz answer key lives in the same static files the client renders, but the
 * score is always recalculated here. A browser can choose answers; it cannot
 * choose its score.
 */

export type ServerCourse = "Scratch" | "Robotics" | "Web" | "Python";

type LessonLike = {
  id: string;
  number: number;
  month: number;
  phase: number;
  kind: string;
  title: string;
  subtitle?: string;
  quiz: { question: string; options: string[]; answer: number }[];
};

const LESSONS: Record<Exclude<ServerCourse, "Robotics">, LessonLike[]> = {
  Python: allPythonLessons as LessonLike[],
  Scratch: allScratchLessons as LessonLike[],
  Web: allWebLessons as LessonLike[],
};

export function lessonsForCourse(course: ServerCourse): LessonLike[] {
  if (course === "Robotics") return [];
  return LESSONS[course] ?? [];
}

export function findCourseLesson(
  course: ServerCourse,
  lessonId: string,
): LessonLike | null {
  return lessonsForCourse(course).find(lesson => lesson.id === lessonId) ?? null;
}

export function gradeQuiz(
  course: ServerCourse,
  lessonId: string,
  answers: number[],
): { score: number; total: number; lesson: LessonLike } | null {
  const lesson = findCourseLesson(course, lessonId);
  if (!lesson) return null;
  const total = lesson.quiz.length;
  const score = lesson.quiz.reduce(
    (sum, question, index) =>
      sum + (answers[index] === question.answer ? 1 : 0),
    0,
  );
  return { score, total, lesson };
}

/** The curriculum description used when the DB row has to be created lazily. */
export function displayNameForCourse(course: ServerCourse): string {
  switch (course) {
    case "Python":
      return "Python Programming";
    case "Scratch":
      return "Scratch Blocks";
    case "Web":
      return "Web Development";
    default:
      return course;
  }
}
