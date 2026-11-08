import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimit } from "./_core/password";
import { signStudentSession } from "./_core/studentSession";
import type { TrpcContext } from "./_core/context";
import { allPythonLessons } from "../client/src/data/pythonCurriculum";

const mocks = vi.hoisted(() => ({
  getAdminAnalytics: vi.fn(),
  getInstructorAnalytics: vi.fn(),
  getStudentPerformance: vi.fn(),
  resolveAnalyticsRange: vi.fn(
    (from?: string | null, to?: string | null) => ({
      from: from ?? "2026-01-01",
      to: to ?? "2026-12-31",
    }),
  ),
  getInstructorByUserId: vi.fn(),
  getStudentById: vi.fn(),
  getGroupDetailForInstructor: vi.fn(),
  getStudentByCode: vi.fn(),
  isOwnerEmail: vi.fn(() => false),
  getStudentLearningRecord: vi.fn(async () => ({ progress: [], quizzes: [] })),
  setStudentLessonCompletion: vi.fn(async () => undefined),
  recordQuizAttempt: vi.fn(async () => undefined),
  listAssignmentsForStudent: vi.fn(async () => []),
  upsertAssignmentSubmission: vi.fn(async () => 70),
}));

vi.mock("./analytics", () => ({
  getAdminAnalytics: mocks.getAdminAnalytics,
  getInstructorAnalytics: mocks.getInstructorAnalytics,
  getStudentPerformance: mocks.getStudentPerformance,
  resolveAnalyticsRange: mocks.resolveAnalyticsRange,
}));

vi.mock("./db", () => ({
  getInstructorByUserId: mocks.getInstructorByUserId,
  getStudentById: mocks.getStudentById,
  getGroupDetailForInstructor: mocks.getGroupDetailForInstructor,
  getStudentByCode: mocks.getStudentByCode,
  isOwnerEmail: mocks.isOwnerEmail,
  getStudentLearningRecord: mocks.getStudentLearningRecord,
  setStudentLessonCompletion: mocks.setStudentLessonCompletion,
  recordQuizAttempt: mocks.recordQuizAttempt,
  listAssignmentsForStudent: mocks.listAssignmentsForStudent,
  upsertAssignmentSubmission: mocks.upsertAssignmentSubmission,
}));

import { appRouter } from "./routers";

const adminFixture = {
  marker: "admin",
  overview: { studentCount: 0 },
  students: [],
};
const instructorFixture = { marker: "instructor", students: [] };
const studentFixture = { marker: "student", history: [] };

const instructorRecord = {
  id: 9,
  userId: 5,
  name: "مدرّب",
  email: "coach@example.test",
  phone: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeStudent = {
  id: 7,
  name: "لينا",
  accessCode: "IDA-TEST123",
  status: "active",
  groupId: 3,
  group: { id: 3, name: "Python A" },
  courses: ["Python"],
};

const pausedStudent = {
  ...activeStudent,
  id: 8,
  status: "paused",
};

function context(
  user: { id: number; openId: string; email: string; role: string } | null,
  reqOverrides: Record<string, unknown> = {},
  res: Record<string, unknown> = {},
): TrpcContext {
  return {
    user: user
      ? ({
          ...user,
          name: user.email,
          loginMethod: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as TrpcContext["user"])
      : null,
    req: {
      headers: {},
      protocol: "https",
      ...reqOverrides,
    } as TrpcContext["req"],
    res: res as TrpcContext["res"],
  };
}

const adminUser = {
  id: 1,
  openId: "admin",
  email: "admin@example.test",
  role: "admin",
};
const instructorUser = {
  id: 5,
  openId: "coach",
  email: "coach@example.test",
  role: "instructor",
};
const plainUser = {
  id: 2,
  openId: "user",
  email: "user@example.test",
  role: "user",
};

async function cookieHeaders(studentId: number) {
  const token = await signStudentSession(studentId);
  return {
    headers: { cookie: `student_session_id=${token}` },
    protocol: "https",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimit("unknown:portal");
  clearRateLimit("unknown:login");
  mocks.getInstructorByUserId.mockImplementation(async (userId: number) =>
    userId === 5 ? instructorRecord : null,
  );
  mocks.getStudentById.mockImplementation(
    async (id: number, options: { activeOnly?: boolean } = {}) => {
      if (id === 7) return activeStudent;
      if (id === 8) return options.activeOnly ? null : pausedStudent;
      return null;
    },
  );
  mocks.getGroupDetailForInstructor.mockImplementation(
    async (instructorId: number, groupId: number) =>
      instructorId === 9 && groupId === 3
        ? { group: { id: 3 }, students: [{ id: 7 }] }
        : null,
  );
  mocks.getStudentByCode.mockImplementation(async (code: string) =>
    code === "IDA-TEST123" ? activeStudent : null,
  );
  mocks.getAdminAnalytics.mockResolvedValue(adminFixture);
  mocks.getInstructorAnalytics.mockResolvedValue(instructorFixture);
  mocks.getStudentPerformance.mockImplementation(
    async (options: { studentId: number }) =>
      options.studentId === 7 ? studentFixture : null,
  );
});

describe("admin analytics authorization", () => {
  it("refuses anonymous, plain users and instructors", async () => {
    for (const user of [null, plainUser, instructorUser]) {
      const caller = appRouter.createCaller(context(user as never));
      await expect(caller.admin.analytics({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    expect(mocks.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it("passes validated filters and pagination to the server loader", async () => {
    const caller = appRouter.createCaller(context(adminUser as never));
    await expect(
      caller.admin.analytics({
        from: "2026-01-01",
        to: "2026-01-31",
        course: "Python",
        groupId: 3,
        instructorId: 9,
        studentId: 7,
        page: 2,
        pageSize: 10,
      }),
    ).resolves.toBe(adminFixture);

    expect(mocks.getAdminAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2026-01-01",
        to: "2026-01-31",
        course: "Python",
        groupId: 3,
        instructorId: 9,
        studentId: 7,
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it("rejects impossible dates, reversed ranges and invalid pagination", async () => {
    const caller = appRouter.createCaller(context(adminUser as never));

    await expect(
      caller.admin.analytics({ from: "2026-02-30" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.analytics({ from: "2026-05-01", to: "2026-04-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.analytics({ page: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.analytics({ pageSize: 101 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.admin.analytics({ groupId: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when an admin drills into a missing student", async () => {
    const caller = appRouter.createCaller(context(adminUser as never));
    await expect(
      caller.admin.studentPerformance({ studentId: 404 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns a scoped report for an existing student", async () => {
    const caller = appRouter.createCaller(context(adminUser as never));
    await expect(
      caller.admin.studentPerformance({
        studentId: 7,
        groupId: 3,
        instructorId: 9,
        from: "2026-01-01",
        to: "2026-03-01",
        limit: 20,
        offset: 5,
      }),
    ).resolves.toBe(studentFixture);

    expect(mocks.getStudentPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 7,
        from: "2026-01-01",
        to: "2026-03-01",
        groupId: 3,
        instructorId: 9,
        historyLimit: 20,
        historyOffset: 5,
      }),
    );
  });
});

describe("instructor analytics ownership", () => {
  it("refuses a group the instructor does not teach", async () => {
    const caller = appRouter.createCaller(context(instructorUser as never));

    await expect(
      caller.instructor.analytics({ groupId: 99 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getGroupDetailForInstructor).toHaveBeenCalledWith(9, 99);
    expect(mocks.getInstructorAnalytics).not.toHaveBeenCalled();
  });

  it("scopes an authorized group request to the caller's instructor profile", async () => {
    const caller = appRouter.createCaller(context(instructorUser as never));
    await expect(
      caller.instructor.analytics({
        groupId: 3,
        from: "2026-02-01",
        to: "2026-02-28",
      }),
    ).resolves.toBe(instructorFixture);

    expect(mocks.getGroupDetailForInstructor).toHaveBeenCalledWith(9, 3);
    expect(mocks.getInstructorAnalytics).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        groupId: 3,
        from: "2026-02-01",
        to: "2026-02-28",
      }),
    );
  });

  it("derives the whole workspace from the caller when no group is given", async () => {
    const caller = appRouter.createCaller(context(instructorUser as never));
    await caller.instructor.analytics({});
    expect(mocks.getGroupDetailForInstructor).not.toHaveBeenCalled();
    expect(mocks.getInstructorAnalytics).toHaveBeenCalledWith(
      9,
      expect.anything(),
    );
  });

  it("refuses a deactivated instructor and a non-instructor account", async () => {
    mocks.getInstructorByUserId.mockResolvedValueOnce(null);
    await expect(
      appRouter
        .createCaller(context(instructorUser as never))
        .instructor.analytics({}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      appRouter
        .createCaller(context(plainUser as never))
        .instructor.analytics({}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses another group's student and returns an owned one", async () => {
    const caller = appRouter.createCaller(context(instructorUser as never));

    await expect(
      caller.instructor.studentPerformance({ groupId: 3, studentId: 8 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      caller.instructor.studentPerformance({
        groupId: 3,
        studentId: 7,
        limit: 10,
        offset: 0,
      }),
    ).resolves.toBe(studentFixture);

    expect(mocks.getStudentPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 7, groupId: 3 }),
    );
  });

  it("validates analytics filters", async () => {
    const caller = appRouter.createCaller(context(instructorUser as never));
    await expect(
      caller.instructor.analytics({ from: "2026-13-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.instructor.analytics({ course: "Java" as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.instructor.studentPerformance({ groupId: 3 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("student session and personal analytics", () => {
  it("refuses reports without a signed cookie", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.portal.performance({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.getStudentPerformance).not.toHaveBeenCalled();
  });

  it("refuses a forged cookie", async () => {
    const caller = appRouter.createCaller(
      context(null, {
        headers: { cookie: "student_session_id=not-a-real-token" },
      }),
    );
    await expect(caller.portal.performance({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("refuses a valid cookie once the student is paused", async () => {
    const caller = appRouter.createCaller(
      context(null, await cookieHeaders(8)),
    );
    await expect(caller.portal.performance({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("derives the student from the cookie and ignores a supplied id", async () => {
    const caller = appRouter.createCaller(
      context(null, await cookieHeaders(7)),
    );

    await expect(
      caller.portal.performance({ limit: 10, offset: 0 } as never),
    ).resolves.toBe(studentFixture);

    expect(mocks.getStudentPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 7, historyLimit: 10 }),
    );
    expect(mocks.getStudentPerformance).not.toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 8 }),
    );
  });

  it("validates student report dates and pagination", async () => {
    const caller = appRouter.createCaller(
      context(null, await cookieHeaders(7)),
    );
    await expect(
      caller.portal.performance({ from: "2026-04-31" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.portal.performance({ limit: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.portal.performance({ offset: -1 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("restores and clears the session through the cookie", async () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const anonymous = appRouter.createCaller(context(null));
    await expect(anonymous.portal.session()).resolves.toBeNull();

    const signedIn = appRouter.createCaller(
      context(null, await cookieHeaders(7), res),
    );
    await expect(signedIn.portal.session()).resolves.toMatchObject({
      id: 7,
      name: "لينا",
    });

    await expect(signedIn.portal.logout()).resolves.toEqual({ success: true });
    expect(res.clearCookie).toHaveBeenCalledWith(
      "student_session_id",
      expect.objectContaining({ maxAge: -1 }),
    );
  });

  it("exchanges a valid access code for an HttpOnly student cookie", async () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const caller = appRouter.createCaller(
      context(null, { headers: {}, protocol: "https", ip: "10.0.0.7" }, res),
    );

    await expect(
      caller.portal.byCode({ accessCode: "IDA-TEST123" }),
    ).resolves.toMatchObject({ id: 7 });

    expect(res.cookie).toHaveBeenCalledWith(
      "student_session_id",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("does not set a cookie for an invalid access code", async () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const caller = appRouter.createCaller(
      context(null, { headers: {}, protocol: "https", ip: "10.0.0.8" }, res),
    );

    await expect(
      caller.portal.byCode({ accessCode: "IDA-NOBODY" }),
    ).resolves.toBeNull();
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

describe("student learning persistence", () => {
  it("refuses anonymous completion and quiz writes", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(
      caller.portal.setLessonComplete({ course: "Python", lessonId: "s1", completed: true }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.portal.submitQuiz({ course: "Python", lessonId: "s1", answers: [] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.setStudentLessonCompletion).not.toHaveBeenCalled();
    expect(mocks.recordQuizAttempt).not.toHaveBeenCalled();
  });

  it("writes completion for the cookie's student, never a supplied id", async () => {
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(
      caller.portal.setLessonComplete({ course: "Python", lessonId: "s1", completed: true }),
    ).resolves.toMatchObject({ success: true, completed: true });
    expect(mocks.setStudentLessonCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: activeStudent.id, course: "Python", lessonId: "s1" }),
    );
  });

  it("rejects lessons from a course the student is not enrolled in", async () => {
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(
      caller.portal.setLessonComplete({ course: "Web", lessonId: "html-1", completed: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.setStudentLessonCompletion).not.toHaveBeenCalled();
  });

  it("calculates the quiz score on the server and stores the attempt", async () => {
    const lesson = allPythonLessons.find(item => item.quiz.length > 0)!;
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    const answers = lesson.quiz.map(item => item.answer);
    await expect(
      caller.portal.submitQuiz({ course: "Python", lessonId: lesson.id, answers }),
    ).resolves.toMatchObject({ success: true, score: lesson.quiz.length, total: lesson.quiz.length });
    expect(mocks.recordQuizAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: activeStudent.id,
        score: lesson.quiz.length,
        total: lesson.quiz.length,
      }),
    );
  });

  it("returns the persisted learning record for the signed-in student", async () => {
    mocks.getStudentLearningRecord.mockResolvedValue({
      progress: [],
      quizzes: [{ id: 1, course: "Python", lessonId: "s1", score: 3, total: 5, submittedAt: new Date() }],
    });
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(caller.portal.learning()).resolves.toMatchObject({
      quizzes: [expect.objectContaining({ score: 3, total: 5 })],
    });
    expect(mocks.getStudentLearningRecord).toHaveBeenCalledWith(activeStudent.id);
  });

  it("refuses a paused student's cookie instead of serving someone else's record", async () => {
    const headers = await cookieHeaders(pausedStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(caller.portal.learning()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getStudentLearningRecord).not.toHaveBeenCalled();
  });
});

describe("student assignment submission", () => {
  const assignment = {
    id: 55,
    groupId: 3,
    course: "Python",
    sessionId: null,
    title: "Loops",
    instructions: "Write three loops",
    dueAt: new Date(Date.now() + 86_400_000),
    maxGrade: 100,
    active: true,
    createdBy: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("rejects anonymous submissions", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(
      caller.portal.submitAssignment({ assignmentId: 55, textResponse: "answer" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.upsertAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("refuses an assignment outside the student's group/courses", async () => {
    mocks.listAssignmentsForStudent.mockResolvedValue([]);
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(
      caller.portal.submitAssignment({ assignmentId: 55, textResponse: "answer" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.upsertAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("stores a text submission against the cookie's student", async () => {
    mocks.listAssignmentsForStudent.mockResolvedValue([{ assignment, submission: null, fileId: null, fileName: null }]);
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(
      caller.portal.submitAssignment({ assignmentId: 55, textResponse: "my answer" }),
    ).resolves.toMatchObject({ success: true, submissionId: 70, late: false });
    expect(mocks.upsertAssignmentSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 55, studentId: activeStudent.id, textResponse: "my answer" }),
    );
  });

  it("rejects an empty submission", async () => {
    mocks.listAssignmentsForStudent.mockResolvedValue([{ assignment, submission: null, fileId: null, fileName: null }]);
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    await expect(
      caller.portal.submitAssignment({ assignmentId: 55 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.upsertAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("rejects a mismatched or oversized upload before persistence", async () => {
    mocks.listAssignmentsForStudent.mockResolvedValue([{ assignment, submission: null, fileId: null, fileName: null }]);
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    const pdfAsPng = Buffer.from("%PDF-1.7 test").toString("base64");
    await expect(
      caller.portal.submitAssignment({
        assignmentId: 55,
        file: { name: "homework.png", mimeType: "image/png", dataBase64: pdfAsPng },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.upsertAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("accepts a valid file and marks a past deadline as late", async () => {
    mocks.listAssignmentsForStudent.mockResolvedValue([
      { assignment: { ...assignment, dueAt: new Date(Date.now() - 86_400_000) }, submission: null, fileId: null, fileName: null },
    ]);
    const headers = await cookieHeaders(activeStudent.id);
    const caller = appRouter.createCaller(context(null, headers));
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("payload"),
    ]).toString("base64");
    await expect(
      caller.portal.submitAssignment({
        assignmentId: 55,
        file: { name: "work.png", mimeType: "image/png", dataBase64: png },
      }),
    ).resolves.toMatchObject({ success: true, late: true });
    expect(mocks.upsertAssignmentSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: activeStudent.id,
        late: true,
        file: expect.objectContaining({ originalName: "work.png", mimeType: "image/png" }),
      }),
    );
  });
});
