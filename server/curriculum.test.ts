import { describe, expect, it } from "vitest";
import { allPythonLessons } from "../client/src/data/pythonCurriculum";
import { allWebLessons } from "../client/src/data/webCurriculum";
import { gradeQuiz, findCourseLesson } from "./curriculum";

describe("server-side quiz scoring", () => {
  it("calculates the score from the server answer key", () => {
    const lesson = allPythonLessons.find(item => item.quiz.length > 0);
    expect(lesson).toBeTruthy();
    const answers = lesson!.quiz.map(item => item.answer);
    expect(gradeQuiz("Python", lesson!.id, answers)).toMatchObject({
      score: lesson!.quiz.length,
      total: lesson!.quiz.length,
    });
  });

  it("counts unanswered and wrong options as incorrect", () => {
    const lesson = allPythonLessons.find(item => item.quiz.length > 1);
    expect(lesson).toBeTruthy();
    const answers = lesson!.quiz.map(() => 50);
    expect(gradeQuiz("Python", lesson!.id, answers)).toMatchObject({
      score: 0,
      total: lesson!.quiz.length,
    });
  });

  it("scores Web quizzes too", () => {
    const lesson = allWebLessons.find(item => item.quiz.length > 0);
    expect(lesson).toBeTruthy();
    const answers = lesson!.quiz.map(item => item.answer);
    expect(gradeQuiz("Web", lesson!.id, answers)?.score).toBe(lesson!.quiz.length);
  });

  it("does not invent a quiz for an unknown lesson", () => {
    expect(gradeQuiz("Python", "not-a-lesson", [])).toBeNull();
    expect(findCourseLesson("Python", "not-a-lesson")).toBeNull();
  });
});
