import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import {
  leadActivities,
  leadDedupeLocks,
  leadStaff,
  leads,
  leadSyncJobs,
  studentCourses,
  students,
  users,
} from "../drizzle/schema";
import { leadDedupeKey } from "./leads";

// Keep the integration tests deterministic: the real registration route would
// otherwise nudge the background Sheets worker while another test file is
// exercising that worker.
vi.mock("./leadSync", async importOriginal => {
  const actual = await importOriginal<typeof import("./leadSync")>();
  return {
    ...actual,
    kickLeadSync: vi.fn(),
  };
});

const run = Boolean(process.env.DATABASE_URL);
const suite = run ? describe : describe.skip;

function contextFor(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: {
      headers: {},
      ip: "127.0.0.1",
      socket: {},
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makePhone(counter: number): string {
  const digits = String(Date.now() + counter)
    .slice(-8)
    .padStart(8, "0");
  return `010${digits}`;
}

const registrationBase = {
  age: 12,
  address: "القاهرة - مدينة نصر",
  school: "مدرسة النيل",
  parentEmail: "phase1-test@example.com",
  parentPhone: "01123456789",
  gender: "male" as const,
  siblingRegistered: false,
  siblingName: "",
  siblingPhone: "",
  notes: "سجل اختبار تلقائي - يمكن حذفه",
};

let adminContext: TrpcContext;
let instructorContext: TrpcContext;
let staffOneContext: TrpcContext;
let staffTwoContext: TrpcContext;
let adminUserId = 0;
let staffOneUserId = 0;
let staffTwoUserId = 0;
let instructorUserId = 0;
let staffOneId = 0;
let staffTwoId = 0;
let leadOneId = 0;
let leadOnePhone = "";
let leadTwoId = 0;
let leadTwoPhone = "";
let convertedStudentId = 0;
const createdLeadIds: number[] = [];
const createdStudentIds: number[] = [];
const createdUserIds: number[] = [];
const dedupeKeys: string[] = [];

suite("Phase 1 leads integration", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db)
      throw new Error("DATABASE_URL is required for leads integration tests");

    const suffix = `${Date.now()}`.slice(-7);
    const adminRows = await db.insert(users).values({
      openId: `phase1-admin-${suffix}`,
      name: "Phase 1 Test Admin",
      email: `phase1-admin-${suffix}@example.com`,
      loginMethod: "test",
      role: "admin",
    });
    adminUserId = Number(adminRows[0].insertId);
    createdUserIds.push(adminUserId);

    const instructorRows = await db.insert(users).values({
      openId: `phase1-instructor-${suffix}`,
      name: "Phase 1 Trainer",
      email: `phase1-trainer-${suffix}@example.com`,
      loginMethod: "test",
      role: "instructor",
    });
    instructorUserId = Number(instructorRows[0].insertId);
    createdUserIds.push(instructorUserId);

    const staffOneRows = await db.insert(users).values({
      openId: `phase1-staff-one-${suffix}`,
      name: "Reception One",
      email: `phase1-staff-one-${suffix}@example.com`,
      loginMethod: "test",
      role: "user",
    });
    staffOneUserId = Number(staffOneRows[0].insertId);
    createdUserIds.push(staffOneUserId);

    const staffTwoRows = await db.insert(users).values({
      openId: `phase1-staff-two-${suffix}`,
      name: "Reception Two",
      email: `phase1-staff-two-${suffix}@example.com`,
      loginMethod: "test",
      role: "user",
    });
    staffTwoUserId = Number(staffTwoRows[0].insertId);
    createdUserIds.push(staffTwoUserId);

    const one = await db.insert(leadStaff).values({
      userId: staffOneUserId,
      displayName: "Reception One",
      email: `phase1-staff-one-${suffix}@example.com`,
      active: true,
      canConvert: false,
      createdBy: adminUserId,
    });
    staffOneId = Number(one[0].insertId);
    const two = await db.insert(leadStaff).values({
      userId: staffTwoUserId,
      displayName: "Reception Two",
      email: `phase1-staff-two-${suffix}@example.com`,
      active: true,
      canConvert: true,
      createdBy: adminUserId,
    });
    staffTwoId = Number(two[0].insertId);

    adminContext = contextFor({
      id: adminUserId,
      openId: `phase1-admin-${suffix}`,
      name: "Phase 1 Test Admin",
      email: `phase1-admin-${suffix}@example.com`,
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    instructorContext = contextFor({
      id: instructorUserId,
      openId: `phase1-instructor-${suffix}`,
      name: "Phase 1 Trainer",
      email: `phase1-trainer-${suffix}@example.com`,
      loginMethod: "test",
      role: "instructor",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    staffOneContext = contextFor({
      id: staffOneUserId,
      openId: `phase1-staff-one-${suffix}`,
      name: "Reception One",
      email: `phase1-staff-one-${suffix}@example.com`,
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    staffTwoContext = contextFor({
      id: staffTwoUserId,
      openId: `phase1-staff-two-${suffix}`,
      name: "Reception Two",
      email: `phase1-staff-two-${suffix}@example.com`,
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (createdLeadIds.length > 0) {
      await db
        .delete(leadSyncJobs)
        .where(inArray(leadSyncJobs.leadId, createdLeadIds));
      await db
        .delete(leadActivities)
        .where(inArray(leadActivities.leadId, createdLeadIds));
      await db.delete(leads).where(inArray(leads.id, createdLeadIds));
    }
    if (createdStudentIds.length > 0) {
      await db
        .delete(studentCourses)
        .where(inArray(studentCourses.studentId, createdStudentIds));
      await db.delete(students).where(inArray(students.id, createdStudentIds));
    }
    if (dedupeKeys.length > 0) {
      await db
        .delete(leadDedupeLocks)
        .where(inArray(leadDedupeLocks.dedupeKey, dedupeKeys));
    }
    if (staffOneId)
      await db.delete(leadStaff).where(eq(leadStaff.id, staffOneId));
    if (staffTwoId)
      await db.delete(leadStaff).where(eq(leadStaff.id, staffTwoId));
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  it("persists a valid public registration with server-owned fields", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const phone = makePhone(1);
    leadOnePhone = phone;
    dedupeKeys.push(leadDedupeKey(`+20${phone.slice(1)}`, "Python"));
    const caller = appRouter.createCaller(contextFor(null));
    const result = await caller.site.submitRegistration({
      ...registrationBase,
      fullName: "طالب اختبار الحفظ",
      phone,
      course: "Python",
    });
    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(false);
    leadOneId = result.id;
    createdLeadIds.push(leadOneId);

    const rows = await db.select().from(leads).where(eq(leads.id, leadOneId));
    expect(rows[0]).toMatchObject({
      fullName: "طالب اختبار الحفظ",
      studentPhone: "+20" + phone.slice(1),
      course: "Python",
      status: "new",
      source: "website",
      assignedEmployeeId: null,
      whatsAppOptOut: false,
      googleSheetSyncStatus: "pending",
    });
    expect(rows[0].registrationDate).toBeInstanceOf(Date);
    expect(
      Math.abs(Date.now() - rows[0].registrationDate.getTime())
    ).toBeLessThan(60_000);
  }, 30_000);

  it("rejects alphabetic and malformed phones on the server", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    for (const phone of [
      "abcdefgh",
      "0101234567",
      "010123456789",
      "+15551234567",
    ]) {
      await expect(
        caller.site.submitRegistration({
          ...registrationBase,
          fullName: "رقم غير صالح",
          phone,
          course: "Python",
        })
      ).rejects.toBeTruthy();
    }
  }, 30_000);

  it("prevents a second lead for the same phone + course within 30 days", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const caller = appRouter.createCaller(contextFor(null));
    const phone = leadOnePhone;

    const result = await caller.site.submitRegistration({
      ...registrationBase,
      fullName: "طالب اختبار الحفظ",
      phone,
      course: "Python",
      notes: "محاولة ثانية",
    });
    expect(result.duplicate).toBe(true);
    expect(result.id).toBe(leadOneId);
    expect(result.duplicateMessage).toContain("مسجل بالفعل");

    const rows = await db
      .select()
      .from(leads)
      .where(eq(leads.studentPhone, `+20${phone.slice(1)}`));
    expect(rows).toHaveLength(1);
    expect(rows[0].duplicateAttempts).toBe(1);
    expect(rows[0].lastDuplicateAt).toBeInstanceOf(Date);
    expect(rows[0].customerNotes).toContain("محاولة تسجيل مكررة");

    const activityRows = await db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadOneId),
          eq(leadActivities.type, "duplicate_attempt")
        )
      );
    expect(activityRows).toHaveLength(1);
  }, 30_000);

  it("allows the same phone to register for a different course", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const phone = makePhone(2);
    leadTwoPhone = phone;
    dedupeKeys.push(leadDedupeKey(`+20${phone.slice(1)}`, "Web"));
    const caller = appRouter.createCaller(contextFor(null));
    const result = await caller.site.submitRegistration({
      ...registrationBase,
      fullName: "طالب كورس مختلف",
      phone,
      course: "Web",
    });
    expect(result.duplicate).toBe(false);
    leadTwoId = result.id;
    createdLeadIds.push(leadTwoId);

    const rows = await db.select().from(leads).where(eq(leads.id, leadTwoId));
    expect(rows).toHaveLength(1);
    expect(rows[0].course).toBe("Web");
  }, 30_000);

  it("changes status inline and records the previous/new status and employee", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const caller = appRouter.createCaller(adminContext);
    const followUp = new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    const detail = await caller.leads.updateStatus({
      id: leadOneId,
      status: "needs_follow_up",
      nextFollowUpDate: followUp,
      note: "اتصال أول",
    });
    expect(detail.status).toBe("needs_follow_up");
    expect(detail.nextFollowUpDate).toBeInstanceOf(Date);

    const activityRows = await db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadOneId),
          eq(leadActivities.type, "status_changed")
        )
      );
    const latest = activityRows.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
    expect(latest).toMatchObject({
      previousStatus: "new",
      newStatus: "needs_follow_up",
      employeeId: adminUserId,
    });
    expect(latest.createdAt).toBeInstanceOf(Date);
  }, 30_000);

  it("records the not-interested reason", async () => {
    const caller = appRouter.createCaller(adminContext);
    const detail = await caller.leads.updateStatus({
      id: leadOneId,
      status: "not_interested",
      notInterestedReason: "price",
      notInterestedNote: "السعر أعلى من الميزانية",
    });
    expect(detail.status).toBe("not_interested");
    expect(detail.notInterestedReason).toBe("price");
    expect(detail.nextFollowUpDate).toBeNull();
  }, 30_000);

  it("assigns an employee and updates last contact", async () => {
    const caller = appRouter.createCaller(adminContext);
    const updated = await caller.leads.update({
      id: leadOneId,
      assignedEmployeeId: staffTwoUserId,
      internalNotes: "ملاحظة داخلية للاختبار",
    });
    expect(updated.assignedEmployeeId).toBe(staffTwoUserId);
    expect(updated.internalNotes).toContain("ملاحظة داخلية");

    const contacted = await caller.leads.logContact({
      id: leadOneId,
      note: "تم الرد على المكالمة",
      nextFollowUpDate: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(contacted.lastContactDate).toBeInstanceOf(Date);
  }, 30_000);

  it("calculates the 24-hour overdue warning on the server", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    await db
      .update(leads)
      .set({
        registrationDate: new Date(Date.now() - 25 * 60 * 60 * 1000),
        status: "new",
        nextFollowUpDate: null,
      })
      .where(eq(leads.id, leadTwoId));

    const caller = appRouter.createCaller(adminContext);
    const result = await caller.leads.list({
      overdueOnly: true,
      page: 1,
      pageSize: 100,
    });
    const row = result.items.find(item => item.id === leadTwoId);
    expect(row?.isOverdue).toBe(true);
    expect(result.thresholdHours).toBe(24);
    expect(result.counters.overdue).toBeGreaterThan(0);
  }, 30_000);

  it("converts a lead to one student, sets subscribed, and prevents duplicate conversion", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const caller = appRouter.createCaller(adminContext);
    const conversion = await caller.leads.convert({ id: leadTwoId });
    expect(conversion.alreadyConverted).toBe(false);
    expect(conversion.accessCode).toMatch(/^IDA-/);
    convertedStudentId = conversion.studentId;
    createdStudentIds.push(convertedStudentId);

    const leadRows = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadTwoId));
    expect(leadRows[0].status).toBe("subscribed");
    expect(leadRows[0].convertedStudentId).toBe(convertedStudentId);
    expect(leadRows[0].convertedAt).toBeInstanceOf(Date);

    const studentRows = await db
      .select()
      .from(students)
      .where(eq(students.id, convertedStudentId));
    expect(studentRows[0].name).toBe("طالب كورس مختلف");
    const courseRows = await db
      .select()
      .from(studentCourses)
      .where(eq(studentCourses.studentId, convertedStudentId));
    expect(courseRows.map(row => row.course)).toEqual(["Web"]);

    const second = await caller.leads.convert({ id: leadTwoId });
    expect(second.alreadyConverted).toBe(true);
    expect(second.studentId).toBe(convertedStudentId);

    const allStudents = await db
      .select()
      .from(students)
      .where(eq(students.phone, "+20" + leadRows[0].studentPhone.slice(3)));
    expect(allStudents).toHaveLength(1);

    const conversionActivity = await db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadTwoId),
          eq(leadActivities.type, "converted")
        )
      );
    expect(conversionActivity).toHaveLength(1);
  }, 30_000);

  it("denies trainers the leads workspace", async () => {
    const caller = appRouter.createCaller(instructorContext);
    await expect(
      caller.leads.list({ page: 1, pageSize: 20 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  }, 30_000);

  it("allows reception to view/update unassigned leads but not another employee's lead", async () => {
    const staffCaller = appRouter.createCaller(staffOneContext);
    const list = await staffCaller.leads.list({ page: 1, pageSize: 20 });
    expect(list.items.length).toBeGreaterThan(0);

    // leadOne is assigned to staffTwo, so staffOne must be refused.
    await expect(
      staffCaller.leads.updateStatus({
        id: leadOneId,
        status: "needs_follow_up",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // The staff member can convert only when the admin granted that power.
    await expect(
      staffCaller.leads.convert({ id: leadTwoId })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  }, 30_000);

  it("shows the migration tables and required lead columns", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const tables = await db.execute(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'academy_lead%'"
    );
    const names = (tables[0] as unknown as { name: string }[]).map(
      row => row.name
    );
    for (const table of [
      "academy_leads",
      "academy_lead_activities",
      "academy_lead_sync_jobs",
      "academy_lead_dedupe_locks",
      "academy_lead_staff",
    ]) {
      expect(names).toContain(table);
    }

    const columns = await db.execute(
      "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academy_leads'"
    );
    const columnNames = (columns[0] as unknown as { name: string }[]).map(
      row => row.name
    );
    for (const column of [
      "fullName",
      "studentPhone",
      "status",
      "assignedEmployeeId",
      "registrationDate",
      "nextFollowUpDate",
      "googleSheetSyncStatus",
      "googleSheetRowNumber",
      "convertedStudentId",
    ]) {
      expect(columnNames).toContain(column);
    }
  }, 30_000);
});
