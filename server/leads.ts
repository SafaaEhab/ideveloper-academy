import { createHash } from "node:crypto";
import { and, asc, desc, eq, gte, like, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  leadActivities,
  leadDedupeLocks,
  leadStaff,
  leads,
  leadSyncJobs,
  students,
  studentCourses,
  users,
  type Lead,
  type LeadActivity,
  type LeadStatusValue,
} from "../drizzle/schema";
import {
  createAccessCode,
  getDb,
  insertStudentWithCourses,
  type DbTransaction,
} from "./db";

// ── Shared types ─────────────────────────────────────────────────────────────

export type LeadActor = {
  userId: number;
  isAdmin: boolean;
  leadAccess: boolean;
  canConvert: boolean;
  displayName?: string | null;
};

export type LeadListFilters = {
  search?: string;
  phone?: string;
  status?: LeadStatusValue;
  course?: "Scratch" | "Robotics" | "Web" | "Python";
  from?: string;
  to?: string;
  assignedEmployeeId?: number;
  mineUserId?: number;
  overdueOnly?: boolean;
  page: number;
  pageSize: number;
};

export type LeadCounters = {
  new: number;
  needs_follow_up: number;
  subscribed: number;
  not_interested: number;
  total: number;
  overdue: number;
  mine: number;
  syncFailed: number;
};

export type LeadListItem = Lead & {
  isOverdue: boolean;
  assignedEmployeeName: string | null;
};

export type LeadDetail = LeadListItem & {
  activities: (LeadActivity & { employeeName: string | null })[];
  convertedStudent: {
    id: number;
    name: string;
    accessCode: string;
  } | null;
};

export type LeadRegistrationInput = {
  fullName: string;
  phone: string;
  age: number;
  address: string;
  school: string;
  parentEmail: string;
  parentPhone: string;
  course: "Scratch" | "Robotics" | "Web" | "Python";
  gender: "male" | "female";
  siblingRegistered: boolean;
  siblingName?: string | null;
  siblingPhone?: string | null;
  notes?: string | null;
};

const assignedEmployee = alias(users, "assigned_employee");
const assignedStaff = alias(leadStaff, "assigned_staff");
const activityEmployee = alias(users, "activity_employee");

const DAY_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_DAYS = 30;

export function leadOverdueHours(): number {
  const configured = Number(process.env.LEAD_OVERDUE_HOURS ?? "24");
  return Number.isFinite(configured) && configured > 0 ? configured : 24;
}

/**
 * The warning rule is intentionally computed on the server and from the stored
 * timestamps only. The browser's clock and timezone can never turn an overdue
 * lead into a tidy one.
 */
export function isLeadOverdue(
  lead: Pick<Lead, "status" | "registrationDate" | "nextFollowUpDate">,
  now: Date = new Date(),
  thresholdHours: number = leadOverdueHours()
): boolean {
  if (lead.status === "subscribed" || lead.status === "not_interested") {
    return false;
  }
  if (
    lead.nextFollowUpDate &&
    new Date(lead.nextFollowUpDate).getTime() < now.getTime()
  ) {
    return true;
  }
  if (lead.status !== "new") return false;
  const age = now.getTime() - new Date(lead.registrationDate).getTime();
  return age > thresholdHours * 60 * 60 * 1000;
}

function overdueCondition(now: Date, thresholdHours: number) {
  const cutoff = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000);
  return or(
    and(eq(leads.status, "new"), lt(leads.registrationDate, cutoff)),
    and(
      or(eq(leads.status, "new"), eq(leads.status, "needs_follow_up")),
      lt(leads.nextFollowUpDate, now)
    )
  );
}

export function formatCairoDateTime(
  value: Date | string | null | undefined
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "short",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(date);
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, character => `\\${character}`)}%`;
}

function cairoOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const zone =
    parts.find(part => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = zone.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * The dashboard's date filter is a Cairo wall-clock day, not a UTC day. A
 * registration at 01:00 in Cairo still belongs to that Cairo date even though
 * it is the previous day in UTC.
 */
function dateKeyToUtcStart(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const offset = cairoOffsetMinutes(noon);
  return new Date(Date.UTC(year, month - 1, day, 0) - offset * 60_000);
}

function dateKeyToUtcEnd(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextStart = dateKeyToUtcStart(
    new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  );
  return new Date(nextStart.getTime() - 1);
}

/** Hash of the exact pair used by the 30-day duplicate rule. */
export function leadDedupeKey(phone: string, course: string): string {
  return createHash("sha256").update(`${phone.trim()}|${course}`).digest("hex");
}

function duplicateCutoff(now: Date): Date {
  return new Date(now.getTime() - DUPLICATE_WINDOW_DAYS * DAY_MS);
}

function enqueueSyncJob(executor: DbTransaction, leadId: number, now: Date) {
  // MySQL can round a timestamp with sub-second precision when storing it, so
  // using exactly `now` can leave the row a fraction of a second in the future
  // and make the immediate claim miss it. The badge then stays "pending" until
  // the next scheduler tick even though the worker already ran.
  const dueAt = new Date(now.getTime() - 1_000);
  return executor
    .insert(leadSyncJobs)
    .values({
      leadId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: dueAt,
      lockedAt: null,
      lastError: null,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: dueAt,
        lockedAt: null,
        lastError: null,
        updatedAt: now,
      },
    });
}

// ── Access control ───────────────────────────────────────────────────────────

export async function resolveLeadActor(user: {
  id: number;
  role: string;
  name?: string | null;
  email?: string | null;
}): Promise<LeadActor> {
  if (user.role === "admin") {
    return {
      userId: user.id,
      isAdmin: true,
      leadAccess: true,
      canConvert: true,
      displayName: user.name ?? user.email ?? null,
    };
  }
  const db = await getDb();
  if (!db) {
    return {
      userId: user.id,
      isAdmin: false,
      leadAccess: false,
      canConvert: false,
      displayName: user.name ?? user.email ?? null,
    };
  }
  const rows = await db
    .select()
    .from(leadStaff)
    .where(and(eq(leadStaff.userId, user.id), eq(leadStaff.active, true)))
    .limit(1);
  const staff = rows[0];
  return {
    userId: user.id,
    isAdmin: false,
    leadAccess: Boolean(staff),
    canConvert: Boolean(staff?.canConvert),
    displayName: staff?.displayName ?? user.name ?? user.email ?? null,
  };
}

export async function getLeadStaffAccess(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadStaff)
    .where(and(eq(leadStaff.userId, userId), eq(leadStaff.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

export function canManageLead(
  actor: LeadActor,
  lead: Pick<Lead, "assignedEmployeeId">
): boolean {
  if (actor.isAdmin) return true;
  if (!actor.leadAccess) return false;
  return (
    lead.assignedEmployeeId === null || lead.assignedEmployeeId === actor.userId
  );
}

export function canViewLeads(actor: LeadActor): boolean {
  return actor.isAdmin || actor.leadAccess;
}

// ── Registration / duplicate handling ───────────────────────────────────────

export type LeadRegistrationResult = {
  lead: Lead;
  duplicate: boolean;
  duplicateMessage: string | null;
};

/**
 * Saves one public registration. The entire decision (duplicate check, insert,
 * activity, outbox row) happens in one database transaction, and the per-pair
 * lock row serializes concurrent submissions of the same phone + course.
 */
export async function createLeadRegistration(
  input: LeadRegistrationInput,
  now: Date = new Date()
): Promise<LeadRegistrationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const phone = input.phone;
  const dedupeKey = leadDedupeKey(phone, input.course);
  let result: LeadRegistrationResult | null = null;

  await db.transaction(async tx => {
    // Insert-or-touch the lock row first. This takes an exclusive lock on the
    // unique key, so a second request for the same phone + course waits here
    // until the first transaction has committed.
    await tx
      .insert(leadDedupeLocks)
      .values({ dedupeKey, updatedAt: now })
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });

    const cutoff = duplicateCutoff(now);
    const existingRows = await tx
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.studentPhone, phone),
          eq(leads.course, input.course),
          gte(leads.registrationDate, cutoff)
        )
      )
      .orderBy(desc(leads.registrationDate))
      .limit(1);
    const existing = existingRows[0];

    if (existing) {
      const stamp = formatCairoDateTime(now);
      const note = [
        `[${stamp}] محاولة تسجيل مكررة لنفس الكورس (${input.course}).`,
        `الاسم في المحاولة: ${input.fullName}.`,
        "لم يتم إنشاء سجل جديد؛ تم الاحتفاظ بالعميل الأصلي.",
      ].join(" ");
      await tx
        .update(leads)
        .set({
          customerNotes: existing.customerNotes
            ? `${existing.customerNotes}\n${note}`
            : note,
          duplicateAttempts: sql`${leads.duplicateAttempts} + 1`,
          lastDuplicateAt: now,
          syncRevision: sql`${leads.syncRevision} + 1`,
          googleSheetSyncStatus: "pending",
          updatedAt: now,
        })
        .where(eq(leads.id, existing.id));

      await tx.insert(leadActivities).values({
        leadId: existing.id,
        type: "duplicate_attempt",
        note,
        metadata: JSON.stringify({
          attemptedAt: now.toISOString(),
          fullName: input.fullName,
          phone,
          course: input.course,
        }),
        createdAt: now,
      });

      await enqueueSyncJob(tx, existing.id, now);

      const refreshed = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, existing.id))
        .limit(1);
      result = {
        lead: refreshed[0]!,
        duplicate: true,
        duplicateMessage:
          "هذا الرقم مسجل بالفعل لنفس الكورس خلال آخر 30 يومًا، ولم يتم إنشاء تسجيل جديد. تم تسجيل محاولة التسجيل في سجل العميل.",
      };
      return;
    }

    const insertResult = await tx.insert(leads).values({
      fullName: input.fullName,
      studentPhone: phone,
      age: input.age,
      school: input.school,
      address: input.address,
      parentEmail: input.parentEmail,
      parentPhone: input.parentPhone,
      course: input.course,
      gender: input.gender,
      hasRegisteredSibling: input.siblingRegistered,
      siblingName: input.siblingName?.trim() || null,
      siblingPhone: input.siblingPhone?.trim() || null,
      customerNotes: input.notes?.trim() || null,
      // These are server decisions, never client input.
      status: "new",
      assignedEmployeeId: null,
      registrationDate: now,
      source: "website",
      whatsAppOptOut: false,
      googleSheetSyncStatus: "pending",
      syncRevision: 1,
      createdAt: now,
      updatedAt: now,
    });
    const leadId = Number(insertResult[0].insertId);

    await tx.insert(leadActivities).values({
      leadId,
      type: "created",
      newStatus: "new",
      note: "تم تسجيل العميل من الموقع الإلكتروني.",
      metadata: JSON.stringify({ source: "website" }),
      createdAt: now,
    });
    await enqueueSyncJob(tx, leadId, now);

    const inserted = await tx
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);
    result = {
      lead: inserted[0]!,
      duplicate: false,
      duplicateMessage: null,
    };
  });

  if (!result) throw new Error("The registration could not be saved");
  return result;
}

// ── Dashboard reads ──────────────────────────────────────────────────────────

async function getCounters(
  now: Date,
  thresholdHours: number,
  mineUserId?: number
): Promise<LeadCounters> {
  const db = await getDb();
  if (!db) {
    return {
      new: 0,
      needs_follow_up: 0,
      subscribed: 0,
      not_interested: 0,
      total: 0,
      overdue: 0,
      mine: 0,
      syncFailed: 0,
    };
  }
  const [statusRows, overdueRows, mineRows, syncFailedRows] = await Promise.all(
    [
      db
        .select({ status: leads.status, count: sql<number>`count(*)` })
        .from(leads)
        .groupBy(leads.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(overdueCondition(now, thresholdHours)),
      mineUserId
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(eq(leads.assignedEmployeeId, mineUserId))
        : Promise.resolve([{ count: 0 }]),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.googleSheetSyncStatus, "failed")),
    ]
  );

  const counters: LeadCounters = {
    new: 0,
    needs_follow_up: 0,
    subscribed: 0,
    not_interested: 0,
    total: 0,
    overdue: Number(overdueRows[0]?.count ?? 0),
    mine: Number(mineRows[0]?.count ?? 0),
    syncFailed: Number(syncFailedRows[0]?.count ?? 0),
  };
  for (const row of statusRows) {
    const count = Number(row.count);
    counters[row.status] = count;
    counters.total += count;
  }
  return counters;
}

export async function listLeads(filters: LeadListFilters) {
  const db = await getDb();
  if (!db) {
    return {
      items: [] as LeadListItem[],
      total: 0,
      page: filters.page,
      pageSize: filters.pageSize,
      counters: await getCounters(
        new Date(),
        leadOverdueHours(),
        filters.mineUserId
      ),
      thresholdHours: leadOverdueHours(),
    };
  }

  const now = new Date();
  const thresholdHours = leadOverdueHours();
  const conditions = [];

  if (filters.search?.trim()) {
    conditions.push(like(leads.fullName, likePattern(filters.search.trim())));
  }
  if (filters.phone?.trim()) {
    conditions.push(
      like(leads.studentPhone, likePattern(filters.phone.trim()))
    );
  }
  if (filters.status) conditions.push(eq(leads.status, filters.status));
  if (filters.course) conditions.push(eq(leads.course, filters.course));
  if (filters.from) {
    conditions.push(
      gte(leads.registrationDate, dateKeyToUtcStart(filters.from))
    );
  }
  if (filters.to) {
    conditions.push(lte(leads.registrationDate, dateKeyToUtcEnd(filters.to)));
  }
  if (filters.assignedEmployeeId != null) {
    conditions.push(eq(leads.assignedEmployeeId, filters.assignedEmployeeId));
  }
  if (filters.mineUserId != null) {
    conditions.push(eq(leads.assignedEmployeeId, filters.mineUserId));
  }
  if (filters.overdueOnly) {
    conditions.push(overdueCondition(now, thresholdHours));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, totalRows, counters] = await Promise.all([
    db
      .select({
        lead: leads,
        assignedEmployeeName: sql<
          string | null
        >`coalesce(${assignedStaff.displayName}, ${assignedEmployee.name}, ${assignedEmployee.email})`,
      })
      .from(leads)
      .leftJoin(
        assignedEmployee,
        eq(assignedEmployee.id, leads.assignedEmployeeId)
      )
      .leftJoin(
        assignedStaff,
        eq(assignedStaff.userId, leads.assignedEmployeeId)
      )
      .where(where)
      .orderBy(desc(leads.registrationDate), desc(leads.id))
      .limit(filters.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(where),
    getCounters(now, thresholdHours, filters.mineUserId),
  ]);

  const items = rows.map(row => ({
    ...row.lead,
    assignedEmployeeName: row.assignedEmployeeName ?? null,
    isOverdue: isLeadOverdue(row.lead, now, thresholdHours),
  }));

  return {
    items,
    total: Number(totalRows[0]?.count ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
    counters,
    thresholdHours,
  };
}

export async function getLeadDetail(id: number): Promise<LeadDetail | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      lead: leads,
      assignedEmployeeName: sql<
        string | null
      >`coalesce(${assignedStaff.displayName}, ${assignedEmployee.name}, ${assignedEmployee.email})`,
    })
    .from(leads)
    .leftJoin(
      assignedEmployee,
      eq(assignedEmployee.id, leads.assignedEmployeeId)
    )
    .leftJoin(assignedStaff, eq(assignedStaff.userId, leads.assignedEmployeeId))
    .where(eq(leads.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const activityRows = await db
    .select({
      activity: leadActivities,
      employeeName: activityEmployee.name,
    })
    .from(leadActivities)
    .leftJoin(
      activityEmployee,
      eq(activityEmployee.id, leadActivities.employeeId)
    )
    .where(eq(leadActivities.leadId, id))
    .orderBy(desc(leadActivities.createdAt), desc(leadActivities.id))
    .limit(200);

  let convertedStudent: LeadDetail["convertedStudent"] = null;
  if (row.lead.convertedStudentId) {
    const studentRows = await db
      .select({
        id: students.id,
        name: students.name,
        accessCode: students.accessCode,
      })
      .from(students)
      .where(eq(students.id, row.lead.convertedStudentId))
      .limit(1);
    convertedStudent = studentRows[0] ?? null;
  }

  return {
    ...row.lead,
    assignedEmployeeName: row.assignedEmployeeName ?? null,
    isOverdue: isLeadOverdue(row.lead),
    activities: activityRows.map(activityRow => ({
      ...activityRow.activity,
      employeeName: activityRow.employeeName ?? null,
    })),
    convertedStudent,
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────

async function loadLeadForUpdate(
  executor: DbTransaction,
  id: number
): Promise<Lead> {
  const rows = await executor
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1)
    .for("update");
  if (!rows[0]) throw new Error("هذا العميل غير موجود");
  return rows[0];
}

function assertCanManage(actor: LeadActor, lead: Lead) {
  if (!canManageLead(actor, lead)) {
    throw new Error("ليس لديك صلاحية لتعديل هذا العميل");
  }
}

function assertCanConvert(actor: LeadActor, lead: Lead) {
  if (!canManageLead(actor, lead) || !actor.canConvert) {
    throw new Error("ليس لديك صلاحية تحويل هذا العميل إلى طالب");
  }
}

export async function updateLeadStatus(
  actor: LeadActor,
  input: {
    id: number;
    status: LeadStatusValue;
    nextFollowUpDate?: Date | null;
    notInterestedReason?: string | null;
    notInterestedNote?: string | null;
    note?: string | null;
  }
): Promise<LeadDetail> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();

  await db.transaction(async tx => {
    const current = await loadLeadForUpdate(tx, input.id);
    assertCanManage(actor, current);

    const nextFollowUp =
      input.nextFollowUpDate !== undefined
        ? input.nextFollowUpDate
        : current.nextFollowUpDate;
    const reason =
      input.status === "not_interested"
        ? input.notInterestedReason?.trim() || null
        : null;
    const reasonNote =
      input.status === "not_interested"
        ? input.notInterestedNote?.trim() || null
        : null;

    const shouldMarkContact =
      input.status === "subscribed" || input.status === "not_interested";

    await tx
      .update(leads)
      .set({
        status: input.status,
        nextFollowUpDate:
          input.status === "subscribed" || input.status === "not_interested"
            ? null
            : nextFollowUp,
        notInterestedReason: reason,
        notInterestedNote: reasonNote,
        lastContactDate: shouldMarkContact ? now : current.lastContactDate,
        assignedEmployeeId:
          !actor.isAdmin && current.assignedEmployeeId === null
            ? actor.userId
            : current.assignedEmployeeId,
        syncRevision: sql`${leads.syncRevision} + 1`,
        googleSheetSyncStatus: "pending",
        googleSheetSyncError: null,
        updatedAt: now,
      })
      .where(eq(leads.id, input.id));

    await tx.insert(leadActivities).values({
      leadId: input.id,
      type: "status_changed",
      previousStatus: current.status,
      newStatus: input.status,
      employeeId: actor.userId,
      note:
        input.note?.trim() ||
        (input.status === "not_interested" && reason
          ? `سبب عدم الإكمال: ${reason}${reasonNote ? ` — ${reasonNote}` : ""}`
          : null),
      metadata: JSON.stringify({
        nextFollowUpDate: nextFollowUp?.toISOString() ?? null,
        reason,
        reasonNote,
      }),
      createdAt: now,
    });

    if (
      input.nextFollowUpDate !== undefined &&
      input.nextFollowUpDate !== null &&
      input.status === "needs_follow_up"
    ) {
      await tx.insert(leadActivities).values({
        leadId: input.id,
        type: "follow_up_set",
        employeeId: actor.userId,
        note: `موعد المتابعة القادم: ${formatCairoDateTime(input.nextFollowUpDate)}`,
        createdAt: now,
      });
    }

    await enqueueSyncJob(tx, input.id, now);
  });

  const detail = await getLeadDetail(input.id);
  if (!detail) throw new Error("هذا العميل غير موجود");
  return detail;
}

export async function updateLead(
  actor: LeadActor,
  input: {
    id: number;
    internalNotes?: string | null;
    nextFollowUpDate?: Date | null;
    assignedEmployeeId?: number | null;
    whatsAppOptOut?: boolean;
    customerNotes?: string | null;
  }
): Promise<LeadDetail> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();

  await db.transaction(async tx => {
    const current = await loadLeadForUpdate(tx, input.id);
    assertCanManage(actor, current);

    if (
      !actor.isAdmin &&
      input.assignedEmployeeId !== undefined &&
      input.assignedEmployeeId !== null &&
      input.assignedEmployeeId !== actor.userId
    ) {
      throw new Error("يمكنك تعيين العميل لنفسك فقط");
    }

    const activities: {
      type: "note_added" | "follow_up_set" | "employee_assigned" | "updated";
      note: string;
    }[] = [];

    if (
      input.internalNotes !== undefined &&
      (input.internalNotes ?? "") !== (current.internalNotes ?? "")
    ) {
      activities.push({
        type: "note_added",
        note: "تم تحديث الملاحظات الداخلية.",
      });
    }
    if (
      input.nextFollowUpDate !== undefined &&
      (input.nextFollowUpDate?.getTime() ?? null) !==
        (current.nextFollowUpDate?.getTime() ?? null)
    ) {
      activities.push({
        type: "follow_up_set",
        note: input.nextFollowUpDate
          ? `موعد المتابعة القادم: ${formatCairoDateTime(input.nextFollowUpDate)}`
          : "تم إلغاء موعد المتابعة.",
      });
    }
    if (
      input.assignedEmployeeId !== undefined &&
      input.assignedEmployeeId !== current.assignedEmployeeId
    ) {
      activities.push({
        type: "employee_assigned",
        note: input.assignedEmployeeId
          ? "تم تعيين موظف مسؤول عن المتابعة."
          : "تم إلغاء تعيين الموظف المسؤول.",
      });
    }
    if (
      input.whatsAppOptOut !== undefined &&
      input.whatsAppOptOut !== current.whatsAppOptOut
    ) {
      activities.push({
        type: "updated",
        note: input.whatsAppOptOut
          ? "تم تسجيل عدم الرغبة في رسائل واتساب."
          : "تم السماح برسائل واتساب.",
      });
    }

    await tx
      .update(leads)
      .set({
        ...(input.internalNotes !== undefined
          ? { internalNotes: input.internalNotes?.trim() || null }
          : {}),
        ...(input.nextFollowUpDate !== undefined
          ? { nextFollowUpDate: input.nextFollowUpDate }
          : {}),
        ...(input.assignedEmployeeId !== undefined
          ? { assignedEmployeeId: input.assignedEmployeeId }
          : {}),
        ...(input.whatsAppOptOut !== undefined
          ? { whatsAppOptOut: input.whatsAppOptOut }
          : {}),
        ...(input.customerNotes !== undefined
          ? { customerNotes: input.customerNotes?.trim() || null }
          : {}),
        syncRevision: sql`${leads.syncRevision} + 1`,
        googleSheetSyncStatus: "pending",
        googleSheetSyncError: null,
        updatedAt: now,
      })
      .where(eq(leads.id, input.id));

    for (const activity of activities) {
      await tx.insert(leadActivities).values({
        leadId: input.id,
        type: activity.type,
        employeeId: actor.userId,
        note: activity.note,
        createdAt: now,
      });
    }

    await enqueueSyncJob(tx, input.id, now);
  });

  const detail = await getLeadDetail(input.id);
  if (!detail) throw new Error("هذا العميل غير موجود");
  return detail;
}

export async function logLeadContact(
  actor: LeadActor,
  input: {
    id: number;
    note?: string | null;
    nextFollowUpDate?: Date | null;
  }
): Promise<LeadDetail> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();

  await db.transaction(async tx => {
    const current = await loadLeadForUpdate(tx, input.id);
    assertCanManage(actor, current);

    await tx
      .update(leads)
      .set({
        lastContactDate: now,
        ...(input.nextFollowUpDate !== undefined
          ? { nextFollowUpDate: input.nextFollowUpDate }
          : {}),
        assignedEmployeeId:
          !actor.isAdmin && current.assignedEmployeeId === null
            ? actor.userId
            : current.assignedEmployeeId,
        syncRevision: sql`${leads.syncRevision} + 1`,
        googleSheetSyncStatus: "pending",
        googleSheetSyncError: null,
        updatedAt: now,
      })
      .where(eq(leads.id, input.id));

    await tx.insert(leadActivities).values({
      leadId: input.id,
      type: "contact_logged",
      employeeId: actor.userId,
      note: input.note?.trim() || "تم تسجيل تواصل مع العميل.",
      metadata: JSON.stringify({
        nextFollowUpDate: input.nextFollowUpDate?.toISOString() ?? null,
      }),
      createdAt: now,
    });
    if (input.nextFollowUpDate !== undefined) {
      await tx.insert(leadActivities).values({
        leadId: input.id,
        type: "follow_up_set",
        employeeId: actor.userId,
        note: input.nextFollowUpDate
          ? `موعد المتابعة القادم: ${formatCairoDateTime(input.nextFollowUpDate)}`
          : "تم إلغاء موعد المتابعة.",
        createdAt: now,
      });
    }

    await enqueueSyncJob(tx, input.id, now);
  });

  const detail = await getLeadDetail(input.id);
  if (!detail) throw new Error("هذا العميل غير موجود");
  return detail;
}

// ── Conversion ───────────────────────────────────────────────────────────────

export type LeadConversionResult = {
  studentId: number;
  accessCode: string;
  alreadyConverted: boolean;
  leadStatus: LeadStatusValue;
};

export async function convertLeadToStudent(
  actor: LeadActor,
  leadId: number
): Promise<LeadConversionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const accessCode = await createAccessCode();
  let result: LeadConversionResult | null = null;

  await db.transaction(async tx => {
    const lead = await loadLeadForUpdate(tx, leadId);
    assertCanConvert(actor, lead);

    if (lead.convertedStudentId) {
      const existing = await tx
        .select({
          id: students.id,
          accessCode: students.accessCode,
        })
        .from(students)
        .where(eq(students.id, lead.convertedStudentId))
        .limit(1);
      if (existing[0]) {
        result = {
          studentId: existing[0].id,
          accessCode: existing[0].accessCode,
          alreadyConverted: true,
          leadStatus: lead.status,
        };
        return;
      }
    }

    // Serialize conversions of the same child. Two different leads for the
    // same name + phone + course cannot both slip between the duplicate check
    // and the insert.
    await tx
      .insert(leadDedupeLocks)
      .values({
        dedupeKey: leadDedupeKey(
          `convert:${lead.studentPhone}:${lead.course}:${lead.fullName.toLowerCase()}`,
          "conversion"
        ),
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });

    // If this exact person + phone + course already exists (for example an
    // admin created the student from another screen), link to that row instead
    // of creating a second account.
    const duplicateStudent = await tx
      .select({ id: students.id, accessCode: students.accessCode })
      .from(students)
      .innerJoin(studentCourses, eq(studentCourses.studentId, students.id))
      .where(
        and(
          eq(students.phone, lead.studentPhone),
          eq(studentCourses.course, lead.course),
          sql`lower(${students.name}) = lower(${lead.fullName})`
        )
      )
      .limit(1);

    let studentId: number;
    let finalAccessCode: string;
    if (duplicateStudent[0]) {
      studentId = duplicateStudent[0].id;
      finalAccessCode = duplicateStudent[0].accessCode;
    } else {
      // Same helper the admin's "Add student" screen uses, inside this lead
      // transaction so a partial conversion can never survive.
      studentId = await insertStudentWithCourses(
        tx,
        {
          name: lead.fullName,
          email: lead.parentEmail,
          phone: lead.studentPhone,
          groupId: null,
          courses: [lead.course],
          status: "active",
        },
        accessCode
      );
      finalAccessCode = accessCode;
    }

    await tx
      .update(leads)
      .set({
        status: "subscribed",
        convertedStudentId: studentId,
        convertedAt: now,
        lastContactDate: lead.lastContactDate ?? now,
        nextFollowUpDate: null,
        notInterestedReason: null,
        notInterestedNote: null,
        syncRevision: sql`${leads.syncRevision} + 1`,
        googleSheetSyncStatus: "pending",
        googleSheetSyncError: null,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    await tx.insert(leadActivities).values({
      leadId,
      type: "converted",
      previousStatus: lead.status,
      newStatus: "subscribed",
      employeeId: actor.userId,
      note: duplicateStudent[0]
        ? `تم ربط العميل بالطالب الموجود رقم ${studentId} بدل إنشاء حساب مكرر.`
        : `تم تحويل العميل إلى طالب جديد رقم ${studentId}.`,
      metadata: JSON.stringify({ studentId, accessCode: finalAccessCode }),
      createdAt: now,
    });

    await enqueueSyncJob(tx, leadId, now);

    result = {
      studentId,
      accessCode: finalAccessCode,
      alreadyConverted: false,
      leadStatus: "subscribed",
    };
  });

  if (!result) throw new Error("تعذر تحويل العميل إلى طالب");
  return result;
}

// ── Employee roster ──────────────────────────────────────────────────────────

export type LeadEmployee = {
  userId: number;
  name: string;
  email: string;
  isAdmin: boolean;
  canConvert: boolean;
  staffId: number | null;
};

export async function listLeadEmployees(): Promise<LeadEmployee[]> {
  const db = await getDb();
  if (!db) return [];
  const [adminRows, staffRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(asc(users.name)),
    db
      .select()
      .from(leadStaff)
      .where(eq(leadStaff.active, true))
      .orderBy(asc(leadStaff.displayName)),
  ]);

  const byUserId = new Map<number, LeadEmployee>();
  for (const admin of adminRows) {
    byUserId.set(admin.id, {
      userId: admin.id,
      name: admin.name || admin.email || `#${admin.id}`,
      email: admin.email || "",
      isAdmin: true,
      canConvert: true,
      staffId: null,
    });
  }
  for (const staff of staffRows) {
    const existing = byUserId.get(staff.userId);
    if (existing) {
      existing.staffId = staff.id;
      existing.canConvert = existing.canConvert || staff.canConvert;
      continue;
    }
    byUserId.set(staff.userId, {
      userId: staff.userId,
      name: staff.displayName,
      email: staff.email,
      isAdmin: false,
      canConvert: staff.canConvert,
      staffId: staff.id,
    });
  }
  return Array.from(byUserId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ar")
  );
}

export async function addLeadEmployee(input: {
  email: string;
  canConvert: boolean;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    throw new Error(
      "لا يوجد حساب بهذا البريد. اطلب من الموظف إنشاء حساب أولاً من صفحة الدخول."
    );
  }
  await db
    .insert(leadStaff)
    .values({
      userId: user.id,
      displayName: user.name || email,
      email,
      active: true,
      canConvert: input.canConvert,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        displayName: user.name || email,
        active: true,
        canConvert: input.canConvert,
        updatedAt: new Date(),
      },
    });
  return { success: true as const };
}

export async function updateLeadEmployee(
  staffId: number,
  input: { active?: boolean; canConvert?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(leadStaff)
    .set({
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.canConvert !== undefined
        ? { canConvert: input.canConvert }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(leadStaff.id, staffId));
  return { success: true as const };
}

export async function removeLeadEmployee(staffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(leadStaff).where(eq(leadStaff.id, staffId));
  return { success: true as const };
}

// ── Dashboard counters for the overview ─────────────────────────────────────

export async function getLeadCountersForOverview() {
  const now = new Date();
  return getCounters(now, leadOverdueHours());
}
