import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The instructor feature lives or dies on its authorization, so these tests
 * name each rule and turn the module that could break it into a mock:
 *  - only role "instructor" with an active profile reaches instructor.* routes;
 *  - instructors see and evaluate only what the timetable gives them;
 *  - evaluations degrade gracefully (unauthorized, wrong student, bad rating);
 *  - the admin roster for instructors is admin-only and validates server-side.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(async () => null),
  getInstructorByUserId: vi.fn(async () => undefined),
  getInstructor: vi.fn(async () => undefined),
  listInstructors: vi.fn(async () => []),
  createInstructorAccount: vi.fn(async () => 42),
  updateInstructorById: vi.fn(async () => undefined),
  deleteInstructorById: vi.fn(async () => ({ success: true })),
  listInstructorGroups: vi.fn(async () => []),
  getGroupDetailForInstructor: vi.fn(async () => null),
  isStudentInGroup: vi.fn(async () => false),
  isSessionAuthorizedForInstructor: vi.fn(async () => false),
  listGroupSessions: vi.fn(async () => []),
  insertGroupSession: vi.fn(async () => 1),
  updateGroupSession: vi.fn(async () => undefined),
  upsertEvaluation: vi.fn(async () => ({ id: 1 })),
  listEvaluations: vi.fn(async () => []),
  listAssignmentsForGroup: vi.fn(async () => []),
  listGroupSubmissions: vi.fn(async () => []),
  createAssignment: vi.fn(async () => 55),
  getAssignment: vi.fn(async () => undefined),
  updateAssignment: vi.fn(async () => undefined),
  getSubmissionWithAssignment: vi.fn(async () => undefined),
  gradeAssignmentSubmission: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(user: {
  id: number;
  openId: string;
  email: string;
  role: "user" | "admin" | "instructor";
} | null): TrpcContext {
  return {
    user: user
      ? {
          name: user.email,
          loginMethod: "email",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          ...user,
        }
      : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const anonymous = null;
const adminUser = { id: 1, openId: "admin", email: "admin@academy.test", role: "admin" as const };
const plainUser = { id: 2, openId: "student", email: "student@academy.test", role: "user" as const };
const instructorUser = { id: 3, openId: "email:teacher@academy.test", email: "teacher@academy.test", role: "instructor" as const };

const activeProfile = { id: 9, userId: 3, name: "Ms Salma", email: "teacher@academy.test", phone: null, title: "Python", active: true, createdAt: new Date(), updatedAt: new Date() };
const inactiveProfile = { ...activeProfile, active: false };

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getInstructorByUserId.mockResolvedValue(undefined);
});

describe("instructor authorization", () => {
  it("refuses anonymous visitors", async () => {
    const caller = appRouter.createCaller(contextFor(anonymous));
    await expect(caller.instructor.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.instructor.groups()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.instructor.groupDetail({ groupId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses admins and plain users even though they are signed in", async () => {
    const asAdmin = appRouter.createCaller(contextFor({ ...adminUser, role: "admin" }));
    const asUser = appRouter.createCaller(contextFor(plainUser));
    await expect(asAdmin.instructor.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(asUser.instructor.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getInstructorByUserId).not.toHaveBeenCalled();
  });

  it("lets an active instructor through", async () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(caller.instructor.me()).resolves.toMatchObject({ id: 9, email: "teacher@academy.test" });
  });

  it("locks out a deactivated instructor exactly like a missing one", async () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(inactiveProfile);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(caller.instructor.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMocks.getInstructorByUserId.mockResolvedValue(undefined);
    await expect(caller.instructor.groups()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("instructor group access", () => {
  it("shows only the groups the timetable assigns", async () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
    dbMocks.listInstructorGroups.mockResolvedValue([
      { id: 5, name: "Python A", level: null, studentCount: 8, courses: ["Python"], sessions: [] },
    ]);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(caller.instructor.groups()).resolves.toHaveLength(1);
    expect(dbMocks.listInstructorGroups).toHaveBeenCalledWith(activeProfile.id);
  });

  it("refuses a group the instructor has no slot in", async () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    // getGroupDetailForInstructor answers null for both "no such group" and
    // "not theirs", which the router turns into one FORBIDDEN.
    await expect(caller.instructor.groupDetail({ groupId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.instructor.evaluations({ groupId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("serves the detail and history for an assigned group", async () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
    dbMocks.getGroupDetailForInstructor.mockResolvedValue({
      group: { id: 5, name: "Python A", level: null },
      sessions: [{ id: 11, mine: true }],
      students: [{ id: 20, name: "Lina" }],
    });
    dbMocks.listEvaluations.mockResolvedValue([]);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(caller.instructor.groupDetail({ groupId: 5 })).resolves.toMatchObject({ students: [{ id: 20 }] });
    await expect(caller.instructor.evaluations({ groupId: 5 })).resolves.toEqual([]);
    expect(dbMocks.listEvaluations).toHaveBeenCalledWith({ groupId: 5, studentId: null });
  });
});

describe("saving evaluations", () => {
  const caller = () => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
    return appRouter.createCaller(contextFor(instructorUser));
  };

  it("guards the database against unauthorized writers", async () => {
    dbMocks.isSessionAuthorizedForInstructor.mockResolvedValue(false);
    await expect(
      caller().instructor.saveEvaluation({ sessionId: 77, studentId: 20, dateKey: "2026-10-10" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.upsertEvaluation).not.toHaveBeenCalled();
    // The session lookup comes after the permit: no database touch at all.
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects a student that does not belong to the session's group", async () => {
    dbMocks.isSessionAuthorizedForInstructor.mockResolvedValue(true);
    dbMocks.isStudentInGroup.mockResolvedValue(false);
    // Same lookup stub as the happy path: the session must exist for the
    // group-membership rule to be the thing that rejects it.
    dbMocks.getDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 11, groupId: 5, instructorId: 9 }] }),
        }),
      }),
    });
    await expect(
      caller().instructor.saveEvaluation({ sessionId: 11, studentId: 99, dateKey: "2026-10-10" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.upsertEvaluation).not.toHaveBeenCalled();
  });

  it("rejects ratings outside the 1–5 scale before touching the database", async () => {
    for (const field of ["focus", "participation"] as const) {
      await expect(
        caller().instructor.saveEvaluation({ sessionId: 11, studentId: 20, dateKey: "2026-10-10", [field]: 0 }),
      ).rejects.toBeTruthy();
      await expect(
        caller().instructor.saveEvaluation({ sessionId: 11, studentId: 20, dateKey: "2026-10-10", [field]: 6 }),
      ).rejects.toBeTruthy();
      // A fractional rating is not a rubric; the server rounds nobody.
      await expect(
        caller().instructor.saveEvaluation({ sessionId: 11, studentId: 20, dateKey: "2026-10-10", [field]: 4.5 }),
      ).rejects.toBeTruthy();
    }
    expect(dbMocks.upsertEvaluation).not.toHaveBeenCalled();
  });

  it("rejects a malformed date and an unknown attendance word", async () => {
    await expect(
      caller().instructor.saveEvaluation({ sessionId: 11, studentId: 20, dateKey: "10/10/2026" }),
    ).rejects.toBeTruthy();
    await expect(
      caller().instructor.saveEvaluation({ sessionId: 11, studentId: 20, dateKey: "2026-13-40" }),
    ).rejects.toBeTruthy();
    await expect(
      caller().instructor.saveEvaluation({
        sessionId: 11,
        studentId: 20,
        dateKey: "2026-10-10",
        attendance: "late" as never,
      }),
    ).rejects.toBeTruthy();
    expect(dbMocks.upsertEvaluation).not.toHaveBeenCalled();
  });

  it("persists a complete evaluation for an authorized session and its student", async () => {
    dbMocks.isSessionAuthorizedForInstructor.mockResolvedValue(true);
    dbMocks.isStudentInGroup.mockResolvedValue(true);
    // The router re-reads the session to learn its group; a single-session
    // chainable stub is all that lookup needs.
    const sessionRow = { id: 11, groupId: 5, instructorId: 9 };
    dbMocks.getDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [sessionRow] }),
        }),
      }),
    });
    dbMocks.upsertEvaluation.mockResolvedValue({
      id: 1,
      studentId: 20,
      sessionId: 11,
      dateKey: "2026-10-10",
      attendance: "present",
      homework: "completed",
      focus: 4,
      participation: 5,
      notes: "Great participation",
      recordedBy: 3,
    });
    await expect(
      caller().instructor.saveEvaluation({
        sessionId: 11,
        studentId: 20,
        dateKey: "2026-10-10",
        attendance: "present",
        homework: "completed",
        focus: 4,
        participation: 5,
        notes: "Great participation",
      }),
    ).resolves.toMatchObject({ success: true, evaluation: { focus: 4 } });
    expect(dbMocks.upsertEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 20, sessionId: 11, dateKey: "2026-10-10", recordedBy: 3 }),
    );
  });
});

describe("admin instructor management", () => {
  it("keeps the roster admin-only", async () => {
    const asUser = appRouter.createCaller(contextFor(plainUser));
    const asInstructor = () => {
      dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
      return appRouter.createCaller(contextFor(instructorUser));
    };
    await expect(asUser.admin.instructors()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(asInstructor().admin.instructors()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a weak password or a bad email on the server, before any account exists", async () => {
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    await expect(
      asAdmin.admin.createInstructor({ name: "Ms Salma", email: "salma@academy.test", password: "123" }),
    ).rejects.toBeTruthy();
    await expect(
      asAdmin.admin.createInstructor({ name: "Ms Salma", email: "not-an-email", password: "longenough8" }),
    ).rejects.toBeTruthy();
    expect(dbMocks.createInstructorAccount).not.toHaveBeenCalled();
  });

  it("creates the account through the data layer once the input is clean", async () => {
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    await expect(
      asAdmin.admin.createInstructor({ name: " Ms Salma ", email: "Salma@Academy.Test", password: "longenough8" }),
    ).resolves.toMatchObject({ success: true, id: 42 });
    expect(dbMocks.createInstructorAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ms Salma", email: "salma@academy.test" }),
    );
  });

  it("deactivating or deleting only needs their id", async () => {
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    await expect(asAdmin.admin.updateInstructor({ id: 9, name: "Ms Salma", email: "salma@academy.test", password: "brand-new-8", active: false })).resolves.toEqual({ success: true });
    expect(dbMocks.updateInstructorById).toHaveBeenCalledWith(9, expect.objectContaining({ active: false, password: "brand-new-8" }));
    await expect(asAdmin.admin.deleteInstructor({ id: 9 })).resolves.toEqual({ success: true });
    expect(dbMocks.deleteInstructorById).toHaveBeenCalledWith(9);
  });
});

describe("timetable instructor assignment", () => {
  it("stores the instructor chosen for a session as part of the slot", async () => {
    dbMocks.getInstructor.mockResolvedValue(activeProfile);
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    const payload = {
      groupId: 5,
      instructorId: 9,
      dayOfWeek: 6,
      startTime: "17:00",
      endTime: "18:30",
      location: "",
      notes: "",
    };
    await expect(asAdmin.admin.createGroupSession(payload)).resolves.toMatchObject({ success: true, id: 1 });
    expect(dbMocks.insertGroupSession).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 5, instructorId: 9, dayOfWeek: 6 }),
    );
    await expect(asAdmin.admin.updateGroupSession({ ...payload, id: 3 })).resolves.toEqual({ success: true });
    expect(dbMocks.updateGroupSession).toHaveBeenCalledWith(3, expect.objectContaining({ instructorId: 9 }));
  });

  it("carries the assignment through the shared values builder", async () => {
    // The move-a-session flow reuses the same values builder, so leaving the
    // instructor out there would silently clear the assignment.
    dbMocks.insertGroupSession.mockClear();
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    await expect(
      asAdmin.admin.createGroupSession({
        groupId: 5,
        instructorId: null,
        dayOfWeek: 2,
        startTime: "17:00",
        endTime: "18:30",
      }),
    ).resolves.toMatchObject({ success: true });
    expect(dbMocks.insertGroupSession).toHaveBeenCalledWith(
      expect.objectContaining({ instructorId: null, location: null, notes: null }),
    );
  });

  it("still refuses strangers trying to write timetable slots", async () => {
    const asUser = appRouter.createCaller(contextFor(plainUser));
    await expect(
      asUser.admin.updateGroupSession({ id: 1, groupId: 5, instructorId: 9, dayOfWeek: 6, startTime: "17:00", endTime: "18:30" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a crafted instructor id that does not exist or is deactivated", async () => {
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    const payload = {
      groupId: 5,
      instructorId: 404,
      dayOfWeek: 6,
      startTime: "17:00",
      endTime: "18:30",
    };
    dbMocks.getInstructor.mockResolvedValue(undefined);
    await expect(asAdmin.admin.createGroupSession(payload)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      asAdmin.admin.updateGroupSession({ ...payload, id: 3 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.insertGroupSession).not.toHaveBeenCalled();
    expect(dbMocks.updateGroupSession).not.toHaveBeenCalled();

    dbMocks.getInstructor.mockResolvedValue(inactiveProfile);
    await expect(asAdmin.admin.createGroupSession(payload)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMocks.insertGroupSession).not.toHaveBeenCalled();
  });

  it("still allows an unassigned slot", async () => {
    const asAdmin = appRouter.createCaller(contextFor(adminUser));
    await expect(
      asAdmin.admin.createGroupSession({
        groupId: 5,
        instructorId: null,
        dayOfWeek: 6,
        startTime: "17:00",
        endTime: "18:30",
      }),
    ).resolves.toMatchObject({ success: true });
    expect(dbMocks.getInstructor).not.toHaveBeenCalled();
  });
});

describe("assignments and grading authorization", () => {
  const detail = {
    group: { id: 5, name: "Python A", level: null },
    sessions: [{ id: 11, mine: true, dayOfWeek: 1, startTime: "17:00", endTime: "18:00", location: null, notes: null, instructorId: 9, instructorName: "Ms Salma" }],
    students: [{ id: 20, name: "Lina", phone: null, email: null, status: "active", courses: ["Python"] }],
  };

  beforeEach(() => {
    dbMocks.getInstructorByUserId.mockResolvedValue(activeProfile);
  });

  it("refuses to create an assignment for a group the instructor does not teach", async () => {
    dbMocks.getGroupDetailForInstructor.mockResolvedValue(null);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(
      caller.instructor.createAssignment({
        groupId: 99,
        course: "Python",
        title: "Loops homework",
        instructions: "Write three loops and explain each one.",
        maxGrade: 100,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createAssignment).not.toHaveBeenCalled();
  });

  it("creates an assignment only inside an authorized group and session", async () => {
    dbMocks.getGroupDetailForInstructor.mockResolvedValue(detail);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(
      caller.instructor.createAssignment({
        groupId: 5,
        course: "Python",
        sessionId: 11,
        title: "Loops homework",
        instructions: "Write three loops and explain each one.",
        maxGrade: 50,
      }),
    ).resolves.toEqual({ success: true, id: 55 });
    expect(dbMocks.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 5, course: "Python", sessionId: 11, maxGrade: 50 }),
    );
  });

  it("refuses to grade a submission from another instructor's group", async () => {
    dbMocks.getSubmissionWithAssignment.mockResolvedValue({
      submission: { id: 70, studentId: 20 },
      assignment: { id: 55, groupId: 99, maxGrade: 100 },
    });
    dbMocks.getGroupDetailForInstructor.mockResolvedValue(null);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(
      caller.instructor.gradeSubmission({ submissionId: 70, grade: 90 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.gradeAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("rejects a grade above the assignment maximum", async () => {
    dbMocks.getSubmissionWithAssignment.mockResolvedValue({
      submission: { id: 70, studentId: 20 },
      assignment: { id: 55, groupId: 5, maxGrade: 50 },
    });
    dbMocks.getGroupDetailForInstructor.mockResolvedValue(detail);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(
      caller.instructor.gradeSubmission({ submissionId: 70, grade: 51 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.gradeAssignmentSubmission).not.toHaveBeenCalled();
  });

  it("grades an authorized submission and records feedback", async () => {
    dbMocks.getSubmissionWithAssignment.mockResolvedValue({
      submission: { id: 70, studentId: 20 },
      assignment: { id: 55, groupId: 5, maxGrade: 50 },
    });
    dbMocks.getGroupDetailForInstructor.mockResolvedValue(detail);
    const caller = appRouter.createCaller(contextFor(instructorUser));
    await expect(
      caller.instructor.gradeSubmission({ submissionId: 70, grade: 45, feedback: "Good work" }),
    ).resolves.toEqual({ success: true });
    expect(dbMocks.gradeAssignmentSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: 70, grade: 45, feedback: "Good work" }),
    );
  });
});
