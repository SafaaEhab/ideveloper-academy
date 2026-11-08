import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fakeDb,
  insertAchievement,
  createAccessCode,
  insertStudentWithCourses,
  createLeadRegistration,
  upsertWaitingListRequest,
  listCourseOfferings,
  updateCourseOffering,
} = vi.hoisted(() => {
  const db = {
    insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 42 }]) })),
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
  };
  return {
    fakeDb: db,
    insertAchievement: vi.fn(async () => 9),
    createAccessCode: vi.fn(async () => "IDA-TEST123"),
    insertStudentWithCourses: vi.fn(async () => 42),
    createLeadRegistration: vi.fn(async (input: {
      fullName: string;
      phone: string;
      course: string;
      siblingRegistered: boolean;
    }) => ({
      lead: {
        id: 1,
        fullName: input.fullName,
        studentPhone: input.phone,
        course: input.course,
        status: "new",
        googleSheetSyncStatus: "pending",
        parentEmail: "parent@example.com",
      },
      duplicate: false,
      duplicateMessage: null,
    })),
    upsertWaitingListRequest: vi.fn(async () => ({ id: 3, duplicate: false })),
    listCourseOfferings: vi.fn(async () => [
      { id: 1, course: "Python", status: "live", updatedAt: new Date() },
    ]),
    updateCourseOffering: vi.fn(async () => undefined),
  };
});

vi.mock("./db", () => ({
  getDb: vi.fn(async () => fakeDb),
  createAccessCode,
  insertStudentWithCourses,
  insertAchievement,
  upsertWaitingListRequest,
  listCourseOfferings,
  updateCourseOffering,
}));

vi.mock("./leads", () => ({
  createLeadRegistration,
  resolveLeadActor: vi.fn(async () => ({
    userId: 1,
    isAdmin: true,
    leadAccess: true,
    canConvert: true,
    displayName: "Admin",
  })),
  canManageLead: vi.fn(() => true),
  addLeadEmployee: vi.fn(async () => ({ success: true })),
  convertLeadToStudent: vi.fn(),
  getLeadCountersForOverview: vi.fn(async () => ({
    new: 0,
    needs_follow_up: 0,
    subscribed: 0,
    not_interested: 0,
    total: 0,
    overdue: 0,
    mine: 0,
    syncFailed: 0,
  })),
  getLeadDetail: vi.fn(async () => null),
  listLeadEmployees: vi.fn(async () => []),
  listLeads: vi.fn(async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    counters: {
      new: 0,
      needs_follow_up: 0,
      subscribed: 0,
      not_interested: 0,
      total: 0,
      overdue: 0,
      mine: 0,
      syncFailed: 0,
    },
    thresholdHours: 24,
  })),
  logLeadContact: vi.fn(),
  removeLeadEmployee: vi.fn(),
  updateLead: vi.fn(),
  updateLeadEmployee: vi.fn(),
  updateLeadStatus: vi.fn(),
}));

vi.mock("./leadSync", () => ({
  kickLeadSync: vi.fn(),
  reconcileLeadSync: vi.fn(async () => ({ queued: 0, configured: false })),
  retryLeadSync: vi.fn(),
}));

vi.mock("./googleSheets", () => ({
  googleSheetsStatus: vi.fn(() => ({
    configured: false,
    enabled: true,
    missing: [],
    spreadsheetId: null,
    sheetName: "Leads",
    serviceAccountEmail: null,
  })),
}));

vi.mock("./_core/mailer", () => ({
  notifyAdminRegistrationRequest: vi.fn(async () => [true]),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { PHONE_VALIDATION_MESSAGE } from "@shared/validation";

const adminContext = {
  user: {
    id: 1,
    openId: "admin",
    name: "Admin",
    email: "admin@example.com",
    loginMethod: "test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

const publicContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("API-level validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a malformed achievement image before persistence", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createAchievement({ description: "A win", imageUrl: "not-a-url" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insertAchievement).not.toHaveBeenCalled();
  });

  it("rejects javascript: in the achievement image", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createAchievement({ description: "A win", imageUrl: "javascript:alert(1)" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insertAchievement).not.toHaveBeenCalled();
  });

  it("rejects an external HTTP achievement image", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createAchievement({ description: "A win", imageUrl: "http://example.com/a.png" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses achievement uploads from unauthenticated callers", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(
      caller.admin.uploadAchievementImage({ dataUrl: "data:image/png;base64,AAAA" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts a valid HTTPS and a /images/ achievement image", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createAchievement({
        description: "A win",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/a.png",
      }),
    ).resolves.toMatchObject({ success: true });
    await expect(
      caller.admin.createAchievement({
        description: "Another win",
        imageUrl: "/images/achievements/young-creator-2024.jpg",
      }),
    ).resolves.toMatchObject({ success: true });
  });

  it("accepts a photo uploaded by the local fallback", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createAchievement({
        description: "Local upload",
        imageUrl: "/api/uploads/achievements/achievement-abc123def456.png",
      }),
    ).resolves.toMatchObject({ success: true });
  });

  it("rejects a student phone made of letters with the exact message", async () => {
    const caller = appRouter.createCaller(adminContext);
    let message = "";
    try {
      await caller.admin.createStudent({
        name: "Lina",
        email: "",
        phone: "abcdefgh",
        groupId: null,
        courses: ["Python"],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain(PHONE_VALIDATION_MESSAGE);
    expect(createAccessCode).not.toHaveBeenCalled();
  });

  it("accepts the documented valid student phone formats", async () => {
    const caller = appRouter.createCaller(adminContext);
    for (const phone of ["01012345678", "+201012345678"]) {
      await expect(
        caller.admin.createStudent({
          name: "Lina",
          email: "",
          phone,
          groupId: null,
          courses: ["Python"],
        }),
      ).resolves.toMatchObject({ success: true });
    }
  });

  it("rejects an invalid instructor phone on the admin API", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.createInstructor({
        name: "Ms Salma",
        email: "salma@example.com",
        password: "long-enough-password",
        phone: "abcdefgh",
        title: "Python",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an invalid registration phone at the public API boundary", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(
      caller.site.submitRegistration({
        fullName: "Lina Ahmed",
        phone: "abcdefgh",
        age: 10,
        address: "Banha",
        school: "Nile School",
        parentEmail: "parent@example.com",
        parentPhone: "01012345678",
        course: "Python",
        gender: "female",
        siblingRegistered: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createLeadRegistration).not.toHaveBeenCalled();
  });

  it("persists a valid registration before reporting success", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(
      caller.site.submitRegistration({
        fullName: "Lina Ahmed",
        phone: "+201012345678",
        age: 10,
        address: "Banha",
        school: "Nile School",
        parentEmail: "parent@example.com",
        parentPhone: "01012345678",
        course: "Python",
        gender: "female",
        siblingRegistered: false,
        notes: "  prefers Saturday  ",
      }),
    ).resolves.toMatchObject({ success: true, status: "new" });
    expect(createLeadRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Lina Ahmed",
        phone: "+201012345678",
        course: "Python",
        siblingRegistered: false,
      }),
    );
  });

  it("persists a waiting-list request with the correct course and a valid phone", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(
      caller.site.joinWaitingList({
        course: "Scratch",
        name: "Mona",
        phone: "01012345678",
        email: "",
        note: "",
      }),
    ).resolves.toMatchObject({ success: true, id: 3 });
    expect(upsertWaitingListRequest).toHaveBeenCalledWith(
      expect.objectContaining({ course: "Scratch", phone: "+201012345678" }),
    );
  });

  it("rejects an invalid waiting-list phone", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(
      caller.site.joinWaitingList({
        course: "Scratch",
        name: "Mona",
        phone: "abcdefgh",
        email: "",
        note: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(upsertWaitingListRequest).not.toHaveBeenCalled();
  });

  it("lets an admin change the same status the public site reads", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.admin.updateCourseStatus({ course: "Robotics", status: "waiting_list" }),
    ).resolves.toEqual({ success: true });
    expect(updateCourseOffering).toHaveBeenCalledWith("Robotics", "waiting_list");
    await expect(caller.site.courses()).resolves.toEqual([
      expect.objectContaining({ course: "Python", status: "live" }),
    ]);
  });
});
