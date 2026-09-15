import { describe, expect, it } from "vitest";
import { webLessons, webTracks } from "./webCurriculum";

describe("web curriculum", () => {
  it("contains the complete HTML, CSS, and JavaScript tracks", () => {
    expect(webTracks.map(track => track.id)).toEqual(["HTML", "CSS", "JavaScript"]);
    expect(webLessons).toHaveLength(18);
    expect(new Set(webLessons.map(lesson => lesson.track))).toEqual(new Set(["HTML", "CSS", "JavaScript"]));
  });

  it("gives every lesson complete teaching content and an interactive quiz", () => {
    for (const lesson of webLessons) {
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(3);
      expect(lesson.sections.every(section => section.body.length > 0)).toBe(true);
      expect(lesson.challenge.length).toBeGreaterThan(0);
      expect(lesson.quiz.options).toHaveLength(4);
      expect(lesson.quiz.answer).toBeGreaterThanOrEqual(0);
      expect(lesson.quiz.answer).toBeLessThan(4);
    }
  });
});
