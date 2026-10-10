import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = {
  insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 42 }]) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
};

vi.mock("./db", () => ({
  getStudentByCode: vi.fn(async (code: string) => code === "IDA-TEST123" ? ({ id: 7, name: "Lina", accessCode: code, status: "active", group: null, courses: ["Python"] }) : null),
  getDb: vi.fn(async () => fakeDb),
  listStudents: vi.fn(async () => []),
  listGroups: vi.fn(async () => []),
  createAccessCode: vi.fn(async () => "IDA-TEST123"),
  // Removing a group has to take its calendar rows and their exceptions with it.
  deleteSessionsForGroup: vi.fn(async () => undefined),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminContext = { user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
const publicContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("academy management procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns enrolled courses for a valid student access code", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.portal.byCode({ accessCode: "IDA-TEST123" })).resolves.toMatchObject({ name: "Lina", courses: ["Python"] });
  });

  it("returns null for unknown or inactive access codes", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.portal.byCode({ accessCode: "IDA-UNKNOWN" })).resolves.toBeNull();
    await expect(caller.portal.byCode({ accessCode: "IDA-INACTIVE" })).resolves.toBeNull();
  });

  it("rejects student creation without a phone number", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.createStudent({ name: "Lina", email: "", phone: "", groupId: null, courses: ["Python"] })).rejects.toBeTruthy();
  });

  it("executes successful student and group create/update/delete flows", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.createStudent({ name: "Lina", email: "", phone: "01012345678", groupId: 9, courses: ["Python"] })).resolves.toMatchObject({ success: true, accessCode: "IDA-TEST123" });
    await expect(caller.admin.updateStudent({ id: 42, name: "Lina Updated", email: "", phone: "01012345678", groupId: null, status: "active", courses: ["Python", "Web"] })).resolves.toEqual({ success: true });
    await expect(caller.admin.deleteStudent({ id: 42 })).resolves.toEqual({ success: true });
    await expect(caller.admin.createGroup({ name: "Python Explorers", level: "Beginner", scheduleDays: "Saturday", scheduleTime: "5 PM" })).resolves.toEqual({ success: true });
    await expect(caller.admin.updateGroup({ id: 1, name: "Python Explorers", level: "Intermediate", scheduleDays: "Tuesday", scheduleTime: "6 PM" })).resolves.toEqual({ success: true });
    await expect(caller.admin.deleteGroup({ id: 1 })).resolves.toEqual({ success: true });
    expect(fakeDb.insert).toHaveBeenCalled();
    expect(fakeDb.update).toHaveBeenCalled();
    expect(fakeDb.delete).toHaveBeenCalled();
  });
});
