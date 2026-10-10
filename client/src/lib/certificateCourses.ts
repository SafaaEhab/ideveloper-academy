import { allPythonLessons } from "@/data/pythonCurriculum";
import { allScratchLessons } from "@/data/scratchCurriculum";
import { allWebLessons } from "@/data/webCurriculum";
import type { CertificateCourse } from "@/lib/certificate";

type MonthBearing = { month: number };

const build = (
  courseName: string,
  courseTitle: string,
  courseSubtitle: string,
  lessons: MonthBearing[]
): CertificateCourse => ({
  courseName,
  courseTitle,
  courseSubtitle,
  sessionCount: lessons.length,
  monthCount: new Set(lessons.map(lesson => lesson.month)).size,
});

/** Certificate copy per course. Session/month counts are derived from the
 *  curriculum data so they can never drift out of sync. */
export const CERTIFICATE_COURSES: Record<string, CertificateCourse> = {
  Python: build(
    "Python",
    "Python Programming & Problem Solving",
    "From the first print() to applied algorithmic challenges",
    allPythonLessons
  ),
  Scratch: build(
    "Scratch",
    "Scratch Visual Programming & Game Design",
    "From the first block to a complete playable game",
    allScratchLessons
  ),
  Web: build(
    "Web",
    "Web Development with HTML, CSS & JavaScript",
    "From the first tag to interactive web experiences",
    allWebLessons
  ),
};

export const getCertificateCourse = (courseName: string | null | undefined) =>
  courseName ? CERTIFICATE_COURSES[courseName] ?? null : null;
