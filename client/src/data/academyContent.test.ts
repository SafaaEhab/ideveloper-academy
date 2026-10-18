import { describe, expect, it } from "vitest";
import { COURSES } from "./academyContent";
import { allPythonLessons, curriculumPhases as pythonPhases } from "./pythonCurriculum";
import { allScratchLessons, curriculumPhases as scratchPhases } from "./scratchCurriculum";
import { allWebLessons, curriculumPhases as webPhases } from "./webCurriculum";

/**
 * The landing page writes the session and month counts out by hand so that the
 * public page never has to import the large curriculum modules. These checks are
 * what stop that copy from quietly going stale — they read the same modules and
 * fail the moment a session is added or a phase renamed.
 */

type Curriculum = {
  lessons: { month: number }[];
  phases: { month: number; en: string }[];
};

const CURRICULA: Record<string, Curriculum> = {
  Scratch: { lessons: allScratchLessons, phases: scratchPhases },
  Python: { lessons: allPythonLessons, phases: pythonPhases },
  Web: { lessons: allWebLessons, phases: webPhases },
};

/** Robotics has no curriculum module — it is run as three live tracks. */
const ROBOTICS = { sessions: null, months: 5, tracks: 3 };

describe("landing page course catalogue", () => {
  it("lists exactly the four courses the academy runs", () => {
    expect(COURSES.map(course => course.title)).toEqual(["Scratch", "Robotics", "Web", "Python"]);
  });

  it("gives every course a description, an icon and two factual badges", () => {
    for (const course of COURSES) {
      expect(course.description.length, `${course.title} description`).toBeGreaterThan(40);
      expect(course.icon, `${course.title} icon`).toBeTruthy();
      expect(course.facts, `${course.title} facts`).toHaveLength(2);
      expect(course.accent, `${course.title} accent`).toBeTruthy();
    }
  });

  it("keeps course titles unique", () => {
    const titles = COURSES.map(course => course.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  describe.each(["Scratch", "Python", "Web"])("%s", title => {
    const course = COURSES.find(item => item.title === title)!;
    const curriculum = CURRICULA[title];
    const months = new Set(curriculum.lessons.map(lesson => lesson.month)).size;

    it("shows the real session count", () => {
      expect(course.facts).toContain(`${curriculum.lessons.length} جلسة`);
    });

    it("shows the real month count", () => {
      expect(course.facts).toContain(`${months} شهور`);
    });

    it("has one curriculum phase per month, so the badges agree with the phases", () => {
      expect(curriculum.phases).toHaveLength(months);
    });
  });

  describe("Robotics", () => {
    const course = COURSES.find(item => item.title === "Robotics")!;

    it("advertises the three live tracks over five months", () => {
      expect(course.facts).toEqual([`${ROBOTICS.tracks} تراك`, `${ROBOTICS.months} شهور`]);
    });
  });
});