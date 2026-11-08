import { and, asc, desc, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomUUID } from "node:crypto";
import { InsertUser, users, groups, groupSessions, sessionExceptions, students, studentCourses, achievements, announcements, userCredentials, adminInvites, accessRequests, instructors, studentEvaluations, CourseName, type AttendanceState, type HomeworkState, type Instructor, curriculumCurricula, curriculumLessons, studentProgress, type CurriculumCurriculum, type CurriculumLesson, type StudentProgress, courseOfferings, courseWaitingList, registrationRequests, quizAttempts, assignments, assignmentSubmissions, assignmentFiles, type CourseOffering, type CourseOfferingStatus, type RegistrationRequest, type RegistrationStatus, type Assignment, type AssignmentSubmission } from "../drizzle/schema";
export type { AttendanceState, HomeworkState, Instructor, CurriculumCurriculum, CurriculumLesson, StudentProgress, CourseOffering, CourseOfferingStatus, RegistrationRequest, RegistrationStatus, Assignment, AssignmentSubmission } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { readAnnouncement, type ParsedAnnouncement } from "./announcement";
import { hashPassword } from "./_core/password";
import { customAlphabet } from "nanoid";
import { COURSE_NAMES, DEFAULT_COURSE_STATUS } from "../shared/courseAvailability";

let _db: ReturnType<typeof drizzle> | null = null;
const createCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

/**
 * The executor a Drizzle transaction callback receives. Lead conversion uses it
 * so the student row, enrolment, lead update and activity entry commit together.
 */
export type DbTransaction = Parameters<
  Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]
>[0];

/**
 * The one place that knows how to create a student and enrol them. Both the
 * admin's "Add student" screen and lead conversion use it, so access codes and
 * course rows can never drift between the two paths.
 */
export async function insertStudentWithCourses(
  tx: DbTransaction,
  values: {
    name: string;
    email?: string | null;
    phone?: string | null;
    groupId?: number | null;
    courses: CourseName[];
    status?: "active" | "paused";
  },
  accessCode: string,
): Promise<number> {
  const result = await tx.insert(students).values({
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    groupId: values.groupId ?? null,
    accessCode,
    status: values.status ?? "active",
  });
  const studentId = Number(result[0].insertId);
  if (values.courses.length > 0) {
    await tx
      .insert(studentCourses)
      .values(values.courses.map(course => ({ studentId, course })));
  }
  return studentId;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ENV.adminEmails.includes(email.trim().toLowerCase());
}

/**
 * The one account that owns the panel: whoever set OWNER_EMAIL (falling back to
 * the address in ADMIN_EMAILS when that variable is left empty). Everyone else
 * with the admin role is an invited teammate, so this is what separates the two.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const owner = ENV.ownerEmail?.trim().toLowerCase();
  return owner ? normalized === owner : ENV.adminEmails.includes(normalized);
}

// ── قائمة المسموح لهم بالدخول على لوحة الأدمن ────────────────────────────────

/**
 * Whether this email may open the admin workspace.
 *
 * Two sources, either one is enough: `ADMIN_EMAILS` from the environment (the
 * owner's own address, which no invite can revoke so the panel cannot be locked
 * shut) and the invite table the panel writes to (everyone else).
 */
export async function isAllowedAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (ENV.adminEmails.includes(normalized)) return true;

  const db = await getDb();
  if (!db) return false;
  const found = await db
    .select({ id: adminInvites.id })
    .from(adminInvites)
    .where(eq(adminInvites.email, normalized))
    .limit(1);
  return found.length > 0;
}

export async function listAdminInvites() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(adminInvites).orderBy(asc(adminInvites.createdAt));
  return rows.map(row => ({
    id: row.id,
    email: row.email,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt,
    // Flagged so the panel can mark which entries the environment pins.
    locked: ENV.adminEmails.includes(row.email),
  }));
}

export async function addAdminInvite(email: string, invitedBy: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = email.trim().toLowerCase();
  if (ENV.adminEmails.includes(normalized)) {
    throw new Error("This email already has permanent access");
  }
  await db
    .insert(adminInvites)
    .values({ email: normalized, invitedBy: invitedBy?.trim() || null })
    .onDuplicateKeyUpdate({ set: { invitedBy: invitedBy?.trim() || null } });

  // The invite only grants access, so an account that already signed up with this
  // address is promoted right away instead of waiting for the next login.
  const openId = openIdForEmail(normalized);
  const existing = await getUserByOpenId(openId);
  if (existing && existing.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.openId, openId));
  }
  return { success: true };
}

export async function removeAdminInvite(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = email.trim().toLowerCase();
  if (ENV.adminEmails.includes(normalized)) {
    throw new Error("This email is set in ADMIN_EMAILS and cannot be removed here");
  }
  await db.delete(adminInvites).where(eq(adminInvites.email, normalized));
  // Drop the role on the existing account too, otherwise the invite would still
  // be in force through the session created while it was allowed. Matching on the
  // email alone is enough — writing "user" over a row that is already "user" is a
  // no-op, and drizzle's `ne()` on this enum column matches nothing anyway.
  await db.update(users).set({ role: "user" }).where(eq(users.email, normalized));
  return { success: true };
}

// ── المدربون ─────────────────────────────────────────────────────────────────

/** Admin list: every instructor, with the groups their timetable slots imply. */
export async function listInstructors() {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({ instructor: instructors, session: groupSessions, group: groups })
    .from(instructors)
    .leftJoin(groupSessions, eq(groupSessions.instructorId, instructors.id))
    .leftJoin(groups, eq(groupSessions.groupId, groups.id))
    .orderBy(
      asc(instructors.name),
      asc(instructors.id),
      asc(groupSessions.dayOfWeek),
      asc(groupSessions.startTime),
    );
  const byId = new Map<number, {
    id: number;
    userId: number;
    name: string;
    email: string;
    phone: string | null;
    title: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    sessionCount: number;
    groups: { id: number; name: string }[];
    sessions: { id: number; groupName: string; dayOfWeek: number; startTime: string; endTime: string; location: string | null }[];
  }>();
  for (const row of rows) {
    const instructor = row.instructor;
    const entry = byId.get(instructor.id) ?? {
      id: instructor.id,
      userId: instructor.userId,
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      title: instructor.title,
      active: instructor.active,
      createdAt: instructor.createdAt,
      updatedAt: instructor.updatedAt,
      sessionCount: 0,
      groups: [] as { id: number; name: string }[],
      sessions: [] as { id: number; groupName: string; dayOfWeek: number; startTime: string; endTime: string; location: string | null }[],
    };
    if (row.session && row.group) {
      entry.sessionCount += 1;
      if (!entry.groups.some(group => group.id === row.group!.id)) {
        entry.groups.push({ id: row.group.id, name: row.group.name });
      }
      entry.sessions.push({
        id: row.session.id,
        groupName: row.group.name,
        dayOfWeek: row.session.dayOfWeek,
        startTime: row.session.startTime,
        endTime: row.session.endTime,
        location: row.session.location,
      });
    }
    byId.set(instructor.id, entry);
  }
  return Array.from(byId.values());
}

export async function getInstructor(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
  return rows[0];
}

/** What the auth middleware resolves the signed-in `users` row to. */
export async function getInstructorByUserId(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(instructors).where(eq(instructors.userId, userId)).limit(1);
  return rows[0];
}

export async function getInstructorByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(instructors).where(eq(instructors.email, normalized)).limit(1);
  return rows[0];
}

/**
 * Registers an instructor end to end: credential (the hashed password), the
 * `users` account with the instructor role, and the profile row. The password
 * lives only in `user_credentials`; nothing about it ever comes back.
 */
export async function createInstructorAccount(values: {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  title?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = values.email.trim().toLowerCase();
  const name = values.name.trim();

  // The address must not already log in as someone else — silently taking that
  // person's account would hand the admin another person's dashboard.
  if (await getCredentialByEmail(email)) {
    throw new Error("This email already has an account. Choose a different email.");
  }
  if (await getInstructorByEmail(email)) {
    throw new Error("This instructor already exists");
  }
  if (await getUserByOpenId(openIdForEmail(email))) {
    throw new Error("This email is already linked to an account. Choose a different email.");
  }

  const openId = openIdForEmail(email);
  const { hash, salt } = hashPassword(values.password);
  await upsertCredential({ email, passwordHash: hash, salt });
  await upsertUser(
    {
      openId,
      email,
      name: name || email.split("@")[0],
      loginMethod: "email",
      role: "instructor",
      lastSignedIn: new Date(),
    },
    // An address the admin typed proves nothing on its own, so the promotion
    // allow-list is ignored — only the explicit instructor role is written.
    { allowAdminPromotion: false },
  );
  const account = await getUserByOpenId(openId);
  if (!account) throw new Error("Instructor account could not be created");
  const result = await db.insert(instructors).values({
    userId: account.id,
    name: name || email.split("@")[0],
    email,
    phone: values.phone?.trim() || null,
    title: values.title?.trim() || null,
  });
  return Number(result[0].insertId);
}

/**
 * Updates the profile and, when asked, the login itself: an email change moves
 * the credential, the user row and its openId together so signing in with the
 * new address lands on the same account.
 */
export async function updateInstructorById(
  id: number,
  values: {
    name?: string;
    email?: string;
    phone?: string | null;
    title?: string | null;
    active?: boolean;
    password?: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
  const instructor = rows[0];
  if (!instructor) throw new Error("Instructor not found");

  const nextEmail = values.email?.trim() ? values.email.trim().toLowerCase() : instructor.email;
  const emailChanged = nextEmail !== instructor.email;

  if (emailChanged) {
    if (await getInstructorByEmail(nextEmail)) {
      throw new Error("Another instructor already uses that email");
    }
    if (await getCredentialByEmail(nextEmail)) {
      throw new Error("That email already has an account. Choose a different email.");
    }
  }

  const profile: Partial<typeof instructors.$inferInsert> = {};
  if (values.name !== undefined && values.name.trim()) profile.name = values.name.trim();
  if (values.phone !== undefined) profile.phone = values.phone?.trim() || null;
  if (values.title !== undefined) profile.title = values.title?.trim() || null;
  if (values.active !== undefined) profile.active = values.active;
  if (emailChanged) profile.email = nextEmail;
  if (Object.keys(profile).length > 0) {
    await db.update(instructors).set(profile).where(eq(instructors.id, id));
  }

  if (emailChanged) {
    await db
      .update(userCredentials)
      .set({ email: nextEmail, updatedAt: new Date() })
      .where(eq(userCredentials.email, instructor.email));
    await db
      .update(users)
      .set({ email: nextEmail, openId: openIdForEmail(nextEmail) })
      .where(eq(users.id, instructor.userId));
  }

  if (values.password) {
    const { hash, salt } = hashPassword(values.password);
    await upsertCredential({ email: nextEmail, passwordHash: hash, salt });
  }
}

/**
 * Removes the instructor. Their timetable slots survive, unassigned, and the
 * evaluations they recorded keep their provenance; the account itself drops
 * back to a plain user so it opens no dashboard afterwards.
 */
export async function deleteInstructorById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
  const instructor = rows[0];
  if (!instructor) return { success: true };
  await db.update(groupSessions).set({ instructorId: null }).where(eq(groupSessions.instructorId, id));
  await db.delete(instructors).where(eq(instructors.id, id));
  await db.update(users).set({ role: "user" }).where(eq(users.id, instructor.userId));
  return { success: true };
}

/**
 * The recurring slots this instructor teaches, joined to their groups. This
 * join *is* the group assignment mechanism — there is no second table to keep
 * in sync, so a coalignment drift is impossible by construction.
 */
export async function listInstructorGroupSessions(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db
    .select({ session: groupSessions, group: groups })
    .from(groupSessions)
    .innerJoin(groups, eq(groupSessions.groupId, groups.id))
    .where(eq(groupSessions.instructorId, instructorId))
    .orderBy(asc(groupSessions.dayOfWeek), asc(groupSessions.startTime), asc(groupSessions.id));
}

/**
 * Everything the instructor dashboard needs for their groups: the distinct
 * groups their slots belong to plus, per group, the student count and the set
 * of courses its students are enrolled in.
 */
export async function listInstructorGroups(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  const slotRows = await listInstructorGroupSessions(instructorId);
  if (slotRows.length === 0) return [];
  const byGroup = new Map<number, {
    group: typeof groups.$inferSelect;
    sessions: { id: number; dayOfWeek: number; startTime: string; endTime: string; location: string | null; notes: string | null }[];
  }>();
  for (const row of slotRows) {
    if (!row.group) continue;
    const entry = byGroup.get(row.group.id) ?? { group: row.group, sessions: [] };
    entry.sessions.push({
      id: row.session.id,
      dayOfWeek: row.session.dayOfWeek,
      startTime: row.session.startTime,
      endTime: row.session.endTime,
      location: row.session.location,
      notes: row.session.notes,
    });
    byGroup.set(row.group.id, entry);
  }

  const groupIds = Array.from(byGroup.keys());
  const studentRows = await db
    .select({ student: students, course: studentCourses.course })
    .from(students)
    .leftJoin(studentCourses, eq(students.id, studentCourses.studentId))
    .where(inArray(students.groupId, groupIds));
  // Join per course duplicates student rows, so one student is counted once by
  // id while their courses accumulate into the group's course set.
  const studentIdsByGroup = new Map<number, Set<number>>();
  const courseSetByGroup = new Map<number, Set<CourseName>>();
  for (const row of studentRows) {
    const groupId = row.student.groupId;
    if (!groupId || !byGroup.has(groupId)) continue;
    const ids = studentIdsByGroup.get(groupId) ?? new Set<number>();
    ids.add(row.student.id);
    studentIdsByGroup.set(groupId, ids);
    if (row.course) {
      const courseSet = courseSetByGroup.get(groupId) ?? new Set<CourseName>();
      courseSet.add(row.course);
      courseSetByGroup.set(groupId, courseSet);
    }
  }

  return Array.from(byGroup.values()).map(({ group, sessions }) => ({
    id: group.id,
    name: group.name,
    level: group.level,
    studentCount: studentIdsByGroup.get(group.id)?.size ?? 0,
    courses: Array.from(courseSetByGroup.get(group.id) ?? []),
    sessions,
  }));
}

/**
 * The full teaching surface of one group — sessions (every instructor of the
 * group, flagged by who is asking), enrolled students with their courses, and
 * itself null when the instructor has no slot in that group, which is the
 * authorization answer: no slot, no detail.
 */
export async function getGroupDetailForInstructor(instructorId: number, groupId: number) {
  const db = await getDb(); if (!db) return null;
  const mine = await db
    .select({ id: groupSessions.id })
    .from(groupSessions)
    .where(and(eq(groupSessions.groupId, groupId), eq(groupSessions.instructorId, instructorId)))
    .limit(1);
  if (mine.length === 0) return null;

  const groupRows = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  const group = groupRows[0];
  if (!group) return null;

  const sessionRows = await db
    .select({ session: groupSessions, instructor: instructors })
    .from(groupSessions)
    .leftJoin(instructors, eq(groupSessions.instructorId, instructors.id))
    .where(eq(groupSessions.groupId, groupId))
    .orderBy(asc(groupSessions.dayOfWeek), asc(groupSessions.startTime), asc(groupSessions.id));

  const studentRows = await db
    .select({ student: students, course: studentCourses.course })
    .from(students)
    .leftJoin(studentCourses, eq(students.id, studentCourses.studentId))
    .where(and(eq(students.groupId, groupId), eq(students.status, "active")))
    .orderBy(asc(students.name));

  // One-off changes matter to the instructor too: a cancelled week should not
  // appear on the evaluation sheet, and a moved week lands on its new date.
  const sessionIds = sessionRows.map(row => row.session.id);
  const exceptionRows = sessionIds.length
    ? await db.select().from(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessionIds))
    : [];

  const studentsById = new Map<number, { id: number; name: string; phone: string | null; email: string | null; status: string; courses: CourseName[] }>();
  for (const row of studentRows) {
    const entry = studentsById.get(row.student.id) ?? {
      id: row.student.id,
      name: row.student.name,
      phone: row.student.phone,
      email: row.student.email,
      status: row.student.status,
      courses: [] as CourseName[],
    };
    if (row.course) entry.courses.push(row.course);
    studentsById.set(row.student.id, entry);
  }

  return {
    group,
    // The evaluator expands these with `buildOccurrences`, exactly like the
    // admin calendar does, so cancels and moved weeks read the same for both.
    exceptions: exceptionRows,
    sessions: sessionRows.map(row => ({
      id: row.session.id,
      dayOfWeek: row.session.dayOfWeek,
      startTime: row.session.startTime,
      endTime: row.session.endTime,
      location: row.session.location,
      notes: row.session.notes,
      instructorId: row.session.instructorId,
      instructorName: row.instructor?.name ?? null,
      // `true` exactly when this caller may save evaluations into it.
      mine: row.session.instructorId === instructorId,
    })),
    students: Array.from(studentsById.values()),
  };
}

/**
 * Whether this instructor may write an evaluation into this session: their own
 * slot, or an unassigned slot inside a group they teach — so the admin can
 * leave a slot unassigned without freezing that group's record keeping.
 */
export async function isSessionAuthorizedForInstructor(instructorId: number, sessionId: number): Promise<boolean> {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select().from(groupSessions).where(eq(groupSessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return false;
  if (session.instructorId === instructorId) return true;
  if (session.instructorId !== null) return false;
  const assigned = await db
    .select({ id: groupSessions.id })
    .from(groupSessions)
    .where(and(eq(groupSessions.groupId, session.groupId), eq(groupSessions.instructorId, instructorId)))
    .limit(1);
  return assigned.length > 0;
}

/** Confirms the student actually sits in the session's group. */
export async function isStudentInGroup(studentId: number, groupId: number): Promise<boolean> {
  const db = await getDb(); if (!db) return false;
  const rows = await db
    .select({ id: students.id, groupId: students.groupId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const student = rows[0];
  return Boolean(student && student.groupId === groupId);
}

/** Writes one evaluation row, updating in place when the triple already exists. */
export async function upsertEvaluation(values: {
  studentId: number;
  sessionId: number;
  dateKey: string;
  attendance: AttendanceState;
  homework: HomeworkState;
  focus: number | null;
  participation: number | null;
  notes: string | null;
  recordedBy: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(studentEvaluations)
    .values({ ...values, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: {
        attendance: values.attendance,
        homework: values.homework,
        focus: values.focus,
        participation: values.participation,
        notes: values.notes,
        recordedBy: values.recordedBy,
        updatedAt: new Date(),
      },
    });
  return getEvaluation(values.studentId, values.sessionId, values.dateKey);
}

export async function getEvaluation(studentId: number, sessionId: number, dateKey: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db
    .select()
    .from(studentEvaluations)
    .where(
      and(
        eq(studentEvaluations.studentId, studentId),
        eq(studentEvaluations.sessionId, sessionId),
        eq(studentEvaluations.dateKey, dateKey),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * Evaluation history, newest day first. Filters are conjunctive and optional:
 * by group (through the student's membership), by student, or both — the same
 * shape serves the group sheet and the per-student history view.
 */
export async function listEvaluations(options: {
  groupId?: number | null;
  studentId?: number | null;
}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (options.studentId != null) conditions.push(eq(studentEvaluations.studentId, options.studentId));
  if (options.groupId != null) conditions.push(eq(students.groupId, options.groupId));
  return db
    .select({ evaluation: studentEvaluations, studentName: students.name })
    .from(studentEvaluations)
    .innerJoin(students, eq(studentEvaluations.studentId, students.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(studentEvaluations.dateKey), asc(studentEvaluations.sessionId), asc(studentEvaluations.id));
}

// ── طلبات الوصول ──────────────────────────────────────────────────────────────

/** Open requests, newest first. Approving one is what turns it into an invite. */
export async function listAccessRequests() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt));
}

/**
 * Records the request. Re-submitting an address that is already pending only
 * refreshes the note and timestamp rather than failing, so someone who pressed
 * the button twice does not think it broke.
 */
export async function upsertAccessRequest(values: {
  email: string;
  name?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = values.email.trim().toLowerCase();
  await db
    .insert(accessRequests)
    .values({
      email: normalized,
      name: values.name?.trim() || null,
      // ON UPDATE CURRENT_TIMESTAMP with no DEFAULT, so it must be supplied.
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  return getAccessRequest(normalized);
}

export async function getAccessRequest(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(accessRequests).where(eq(accessRequests.email, normalized)).limit(1);
  return rows[0];
}

export async function deleteAccessRequest(email: string) {
  const db = await getDb(); if (!db) return { success: true };
  await db.delete(accessRequests).where(eq(accessRequests.email, email.trim().toLowerCase()));
  return { success: true };
}

/**
 * Approving a request grants the access and clears the queue in one step, so the
 * panel can never show an approved address still waiting for a decision.
 */
export async function approveAccessRequest(email: string, invitedBy: string | null) {
  await addAdminInvite(email, invitedBy);
  await deleteAccessRequest(email);
  return { success: true };
}

/**
 * Registers the person who asked for access so the account is ready the moment
 * the owner approves it — they sign in with the password they just chose and land
 * in the panel, with no second signup step.
 *
 * The role is left at the default `user` on purpose: `upsertUser` would promote
 * anyone whose address is already allow-listed, and a request must never be able
 * to grant itself access. Only the approval path sets the admin role.
 */
export async function createPendingAccount(values: {
  email: string;
  name?: string | null;
  password: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = values.email.trim().toLowerCase();
  const { hash, salt } = hashPassword(values.password);
  await upsertCredential({ email, passwordHash: hash, salt });
  await upsertUser(
    {
      openId: openIdForEmail(email),
      email,
      name: values.name?.trim() || email.split("@")[0],
      loginMethod: "email",
      role: "user",
      lastSignedIn: new Date(),
    },
    { allowAdminPromotion: false },
  );
  return { success: true };
}

export function shouldBeAdmin(openId: string, email: string | null | undefined, explicitRole?: string): boolean {
  if (explicitRole === "admin") return true;
  if (ENV.ownerOpenId && openId === ENV.ownerOpenId) return true;
  if (isAdminEmail(email)) return true;
  return false;
}

/**
 * Writes the profile row.
 *
 * `allowAdminPromotion: false` is what keeps a self-asserted address out of the
 * admin role. The allow-list (`ADMIN_EMAILS` plus the panel's invites) is a list
 * of *addresses*, and an address alone is not proof of identity — so any caller
 * that learned the email from the person filling in a form rather than from a
 * verified identity provider has to pass this and set the role itself.
 */
export async function upsertUser(
  user: InsertUser,
  options: { allowAdminPromotion?: boolean } = {},
): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (['name', 'email', 'loginMethod'] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  // Auto-promote: explicit role, OWNER_OPEN_ID, or the admin allowlist
  // (ADMIN_EMAILS plus the invites the panel manages).
  const emailForCheck = (user.email !== undefined ? user.email : undefined) ?? null;
  const isAllowed =
    options.allowAdminPromotion !== false && emailForCheck
      ? await isAllowedAdminEmail(emailForCheck)
      : false;
  if (user.role !== undefined || (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) || isAllowed) {
    values.role = user.role ?? 'admin';
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function ensureAdminByEmail(email: string, name?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Also try case-insensitive match
  const found = existing[0] ?? (await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1))[0];
  const openId = found?.openId ?? `email:${normalizedEmail}`;
  await upsertUser({
    openId,
    email,
    name: name ?? found?.name ?? email.split("@")[0] ?? "Admin",
    loginMethod: found?.loginMethod ?? "email",
    role: "admin",
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(openId);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ── بيانات الدخول بالإيميل والباسورد ─────────────────────────────────────────

/**
 * The `openId` a password account gets. It has to be stable and unique because
 * the session JWT stores it exactly like an OAuth identity — `authenticateRequest`
 * resolves the signed-in user through the same `users` row.
 */
export function openIdForEmail(email: string): string {
  return `email:${email.trim().toLowerCase()}`.slice(0, 64);
}

export async function getCredentialByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const result = await db.select().from(userCredentials).where(eq(userCredentials.email, normalized)).limit(1);
  return result[0];
}

export async function upsertCredential(values: {
  email: string;
  passwordHash: string;
  salt: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = values.email.trim().toLowerCase();
  // `updatedAt` is ON UPDATE CURRENT_TIMESTAMP with no DEFAULT (same shape as
  // the other tables here), so it has to be supplied explicitly on insert.
  await db
    .insert(userCredentials)
    .values({ ...values, email: normalized, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { passwordHash: values.passwordHash, salt: values.salt },
    });
}

export async function listStudents() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ student: students, group: groups, course: studentCourses.course }).from(students).leftJoin(groups, eq(students.groupId, groups.id)).leftJoin(studentCourses, eq(students.id, studentCourses.studentId));
  const byId = new Map<number, any>();
  for (const row of rows) {
    const existing = byId.get(row.student.id) ?? { ...row.student, group: row.group, courses: [] as CourseName[] };
    if (row.course) existing.courses.push(row.course);
    byId.set(row.student.id, existing);
  }
  return Array.from(byId.values());
}

export async function listGroups() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(groups);
}

// ── جدول المواعيد ───────────────────────────────────────────────────────────

/**
 * The recurring weekly slots behind the admin calendar, joined to their group so
 * the grid can label each block without a second round trip. Ordered earliest day
 * first, then by start time, which is how the week view reads top-to-bottom.
 */
export async function listGroupSessions() {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({ session: groupSessions, group: groups, instructor: instructors })
    .from(groupSessions)
    .leftJoin(groups, eq(groupSessions.groupId, groups.id))
    .leftJoin(instructors, eq(groupSessions.instructorId, instructors.id))
    .orderBy(
      asc(groupSessions.dayOfWeek),
      asc(groupSessions.startTime),
      asc(groupSessions.id),
    );
  return rows.map(row => ({
    ...row.session,
    groupName: row.group?.name ?? "Unknown group",
    groupLevel: row.group?.level ?? null,
    instructorId: row.session.instructorId,
    instructorName: row.instructor?.name ?? null,
  }));
}

export async function insertGroupSession(
  values: typeof groupSessions.$inferInsert,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(groupSessions).values(values);
  return Number(result[0].insertId);
}

export async function updateGroupSession(
  id: number,
  values: Partial<typeof groupSessions.$inferInsert>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(groupSessions).set(values).where(eq(groupSessions.id, id));
}

/** Drops the series and every one-off exception that hung off it. */
export async function deleteGroupSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(sessionExceptions).where(eq(sessionExceptions.sessionId, id));
  await db.delete(groupSessions).where(eq(groupSessions.id, id));
}

/** Every session belonging to a group — used when the group itself goes away. */
export async function deleteSessionsForGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const owned = await db
    .select({ id: groupSessions.id })
    .from(groupSessions)
    .where(eq(groupSessions.groupId, groupId));
  for (const row of owned) {
    await db
      .delete(sessionExceptions)
      .where(eq(sessionExceptions.sessionId, row.id));
  }
  await db.delete(groupSessions).where(eq(groupSessions.groupId, groupId));
}

/**
 * Exceptions touching a visible window. Two sides matter: the date a change was
 * booked against, and the date a moved session now lands on.
 */
export async function listSessionExceptions(fromDateKey: string, toDateKey: string) {
  const db = await getDb(); if (!db) return [];
  type DateKeyColumn = typeof sessionExceptions.dateKey | typeof sessionExceptions.moveToDate;
  const inRange = (column: DateKeyColumn) =>
    and(gte(column, fromDateKey), lte(column, toDateKey));
  return db
    .select()
    .from(sessionExceptions)
    .where(
      or(inRange(sessionExceptions.dateKey), inRange(sessionExceptions.moveToDate)),
    );
}

/** One exception per session per date — so replacing means delete-then-insert. */
export async function insertSessionException(
  values: typeof sessionExceptions.$inferInsert,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(sessionExceptions)
    .where(
      and(
        eq(sessionExceptions.sessionId, values.sessionId),
        eq(sessionExceptions.dateKey, values.dateKey),
      ),
    );
  const result = await db.insert(sessionExceptions).values(values);
  return Number(result[0].insertId);
}

export async function deleteSessionException(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(sessionExceptions).where(eq(sessionExceptions.id, id));
}

// ── الإنجازات ────────────────────────────────────────────────────────────────

/** Public order: the trainer's own `sortOrder` first, then insertion order. */
export async function listAchievements() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(achievements).orderBy(asc(achievements.sortOrder), asc(achievements.id));
}

export async function getAchievement(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
  return result[0];
}

export async function insertAchievement(values: typeof achievements.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.insert(achievements).values(values);
  return Number(result[0].insertId);
}

export async function updateAchievement(id: number, values: Partial<typeof achievements.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(achievements).set(values).where(eq(achievements.id, id));
}

export async function deleteAchievement(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.delete(achievements).where(eq(achievements.id, id));
}

// ── الإعلان ─────────────────────────────────────────────────────────────────

export { readAnnouncement } from "./announcement";

/** Newest first, so the admin panel lists the live announcement on top. */
export async function listAnnouncements() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(announcements).orderBy(desc(announcements.updatedAt), desc(announcements.id));
  return rows.map(readAnnouncement).filter((item): item is ParsedAnnouncement => !!item);
}

/** What the public site renders: the most recently touched announcement that's on. */
export async function getActiveAnnouncement() {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(announcements).where(eq(announcements.enabled, true)).orderBy(desc(announcements.updatedAt), desc(announcements.id)).limit(1);
  return readAnnouncement(rows[0]);
}

export async function insertAnnouncement(values: typeof announcements.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.insert(announcements).values(values);
  return Number(result[0].insertId);
}

export async function updateAnnouncement(id: number, values: Partial<typeof announcements.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(announcements).set(values).where(eq(announcements.id, id));
}

/** Turning one on turns every other off — the site only ever shows one popup. */
export async function setOnlyAnnouncementEnabled(id: number, enabled: boolean) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  if (enabled) await db.update(announcements).set({ enabled: false }).where(ne(announcements.id, id));
  await db.update(announcements).set({ enabled }).where(eq(announcements.id, id));
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.delete(announcements).where(eq(announcements.id, id));
}

export async function createAccessCode() {
  const db = await getDb();
  for (let i = 0; i < 10; i++) {
    const accessCode = `IDA-${createCode()}`;
    if (!db) return accessCode;
    const found = await db.select({ id: students.id }).from(students).where(eq(students.accessCode, accessCode)).limit(1);
    if (!found.length) return accessCode;
  }
  throw new Error("Unable to generate a unique access code");
}

export async function getStudentByCode(accessCode: string) {
  const normalizedCode = accessCode.trim().toUpperCase();
  const db = await getDb(); if (!db) return null;
  const result = await db.select({ student: students, group: groups, course: studentCourses.course })
    .from(students)
    .leftJoin(groups, eq(students.groupId, groups.id))
    .leftJoin(studentCourses, eq(students.id, studentCourses.studentId))
    .where(and(eq(students.accessCode, normalizedCode), eq(students.status, "active")));
  if (!result.length) return null;
  return { ...result[0].student, group: result[0].group, courses: result.map(row => row.course).filter(Boolean) as CourseName[] };
}

/**
 * Profile by primary key, with the same group/courses shape as the access-code
 * lookup. Used by the signed student session, so `activeOnly` re-checks the
 * account on every request instead of trusting the token's issue time.
 */
export async function getStudentById(id: number, options: { activeOnly?: boolean } = {}) {
  const db = await getDb(); if (!db) return null;
  const result = await db
    .select({ student: students, group: groups, course: studentCourses.course })
    .from(students)
    .leftJoin(groups, eq(students.groupId, groups.id))
    .leftJoin(studentCourses, eq(students.id, studentCourses.studentId))
    .where(
      options.activeOnly
        ? and(eq(students.id, id), eq(students.status, "active"))
        : eq(students.id, id),
    );
  if (!result.length) return null;
  return {
    ...result[0].student,
    group: result[0].group,
    courses: result.map(row => row.course).filter(Boolean) as CourseName[],
  };
}


// ── Curriculum ──────────────────────────────────────────────────────────────

/** Full curriculum row plus its ordered lessons. Returns null when the course is unknown. */
export async function getCurriculumWithLessons(course: string) {
  const db = await getDb(); if (!db) return null;
  const [curriculum] = await db.select().from(curriculumCurricula).where(eq(curriculumCurricula.course, course as any)).limit(1);
  if (!curriculum) return null;
  const lessons = await db.select().from(curriculumLessons).where(eq(curriculumLessons.curriculumId, curriculum.id)).orderBy(asc(curriculumLessons.number));
  return { curriculum, lessons };
}

/** All curricula with a lesson count per course. */
export async function listCurricula() {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({ curriculum: curriculumCurricula, lessonCount: curriculumLessons.id })
    .from(curriculumCurricula)
    .leftJoin(curriculumLessons, eq(curriculumLessons.curriculumId, curriculumCurricula.id))
    .orderBy(asc(curriculumCurricula.id));
  const byId = new Map<number, { curriculum: typeof curriculumCurricula.$inferSelect; lessonCount: number }>();
  for (const row of rows) {
    const entry = byId.get(row.curriculum.id) ?? { curriculum: row.curriculum, lessonCount: 0 };
    if (row.lessonCount !== null) entry.lessonCount += 1;
    byId.set(row.curriculum.id, entry);
  }
  return Array.from(byId.values()).map(({ curriculum, lessonCount }) => ({ ...curriculum, lessonCount }));
}

/** Upserts every lesson for a curriculum from an array of lesson shapes. */
export async function upsertCurriculumLessons(curriculumId: number, lessons: { lessonId: string; number: number; month: number; phase: number; kind: string; title: string; subtitle?: string | null }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existingIds = await db.select({ lessonId: curriculumLessons.lessonId }).from(curriculumLessons).where(eq(curriculumLessons.curriculumId, curriculumId));
  const keep = new Set(lessons.map(l => l.lessonId));
  for (const row of existingIds) {
    if (!keep.has(row.lessonId)) {
      await db.delete(curriculumLessons).where(and(eq(curriculumLessons.curriculumId, curriculumId), eq(curriculumLessons.lessonId, row.lessonId)));
    }
  }
  for (const lesson of lessons) {
    const existing = await db
      .select({ id: curriculumLessons.id })
      .from(curriculumLessons)
      .where(and(eq(curriculumLessons.curriculumId, curriculumId), eq(curriculumLessons.lessonId, lesson.lessonId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(curriculumLessons).values({ curriculumId, ...lesson, subtitle: lesson.subtitle ?? null });
    } else {
      await db.update(curriculumLessons)
        .set({ number: lesson.number, month: lesson.month, phase: lesson.phase, kind: lesson.kind, title: lesson.title, subtitle: lesson.subtitle ?? null, updatedAt: new Date() })
        .where(and(eq(curriculumLessons.curriculumId, curriculumId), eq(curriculumLessons.lessonId, lesson.lessonId)));
    }
  }
}

/** Seed the DB from the static curriculum arrays exported by each course file. */
export async function seedCurriculaFromStatic() {
  const db = await getDb();
  if (!db) return;
  // Dynamic imports so the server bundle stays small and we don't pull in
  // the heavy curriculum files unless explicitly asked to seed.
  const { allPythonLessons } = await import("../client/src/data/pythonCurriculum");
  const { allScratchLessons } = await import("../client/src/data/scratchCurriculum");
  const { allWebLessons } = await import("../client/src/data/webCurriculum");
  const COURSE_MAP: Record<string, { course: string; displayName: string; lessons: { lessonId: string; number: number; month: number; phase: number; kind: string; title: string; subtitle?: string | null }[] }> = {
    Python: { course: "Python", displayName: "Python Programming", lessons: allPythonLessons.map(l => ({ lessonId: l.id, number: l.number, month: l.month, phase: l.phase, kind: l.kind, title: l.title, subtitle: l.subtitle ?? null })) },
    Scratch: { course: "Scratch", displayName: "Scratch Blocks", lessons: allScratchLessons.map(l => ({ lessonId: l.id, number: l.number, month: l.month, phase: l.phase, kind: l.kind, title: l.title, subtitle: l.subtitle ?? null })) },
    Web: { course: "Web", displayName: "Web Development", lessons: allWebLessons.map(l => ({ lessonId: l.id, number: l.number, month: l.month, phase: l.phase, kind: l.kind, title: l.title, subtitle: l.subtitle ?? null })) },
  };
  for (const { course, displayName, lessons } of Object.values(COURSE_MAP)) {
    let curriculum = await db.select({ id: curriculumCurricula.id }).from(curriculumCurricula).where(eq(curriculumCurricula.course, course as any)).limit(1);
    let id: number;
    if (curriculum.length === 0) {
      const result = await db.insert(curriculumCurricula).values({ course: course as any, displayName });
      id = Number(result[0].insertId);
    } else {
      id = curriculum[0].id;
      await db.update(curriculumCurricula).set({ displayName, updatedAt: new Date() }).where(eq(curriculumCurricula.id, id));
    }
    await upsertCurriculumLessons(id, lessons);
  }
}

// ── Student progress ────────────────────────────────────────────────────────

/**
 * All progress rows for one student across every curriculum, joined to lesson
 * titles so the UI can render the tree without extra round trips.
 */
export async function getStudentProgress(studentId: number) {
  const db = await getDb(); if (!db) return [];
  return db
    .select({
      progress: studentProgress,
      curriculum: curriculumCurricula,
      lesson: curriculumLessons,
    })
    .from(studentProgress)
    .leftJoin(curriculumCurricula, eq(curriculumCurricula.id, studentProgress.curriculumId))
    .leftJoin(curriculumLessons, and(eq(curriculumLessons.lessonId, studentProgress.lessonId), eq(curriculumLessons.curriculumId, studentProgress.curriculumId)))
    .where(eq(studentProgress.studentId, studentId))
    .orderBy(asc(studentProgress.curriculumId), asc(curriculumLessons.number));
}

/**
 * Status map keyed by `curriculumId:lessonId` for fast lookup in the UI.
 */
export async function getStudentProgressMap(studentId: number): Promise<Map<string, { status: string; completedAt: Date | null; instructorNote: string | null }>> {
  const db = await getDb(); if (!db) return new Map();
  const rows = await db
    .select({ curriculumId: studentProgress.curriculumId, lessonId: studentProgress.lessonId, status: studentProgress.status, completedAt: studentProgress.completedAt, instructorNote: studentProgress.instructorNote })
    .from(studentProgress)
    .where(eq(studentProgress.studentId, studentId));
  const map = new Map<string, { status: string; completedAt: Date | null; instructorNote: string | null }>();
  for (const row of rows) {
    map.set(`${row.curriculumId}:${row.lessonId}`, { status: row.status, completedAt: row.completedAt, instructorNote: row.instructorNote });
  }
  return map;
}

/**
 * Sets (or resets) the status for one (student, curriculum, lesson) triple.
 * idempotent: calling it again with the same values is a no-op.
 */
export async function setProgressStatus(values: { studentId: number; curriculumId: number; lessonId: string; status: "not_started" | "in_progress" | "completed"; instructorNote?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const completedAt = values.status === "completed" ? new Date() : null;
  await db
    .insert(studentProgress)
    .values({
      studentId: values.studentId,
      curriculumId: values.curriculumId,
      lessonId: values.lessonId,
      status: values.status,
      completedAt,
      instructorNote: values.instructorNote ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: values.status,
        completedAt,
        instructorNote: values.instructorNote ?? null,
        updatedAt: new Date(),
      },
    });
}

// ── Monthly metrics (derived from evaluations, not from progress rows) ──────

/**
 * Aggregated monthly stats for one student: attendance %, homework %, avg
 * focus, avg participation, and evaluation count. Grouped by YYYY-MM.
 */
export async function getStudentMonthlyMetrics(studentId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({ evaluation: studentEvaluations, session: groupSessions })
    .from(studentEvaluations)
    .leftJoin(groupSessions, eq(groupSessions.id, studentEvaluations.sessionId))
    .where(eq(studentEvaluations.studentId, studentId))
    .orderBy(desc(studentEvaluations.dateKey));
  const byMonth = new Map<string, {
    sessionsTotal: number;
    sessionsAttended: number;
    homeworkAssigned: number;
    homeworkCompleted: number;
    focusSum: number;
    focusCount: number;
    participationSum: number;
    participationCount: number;
    notes: string[];
  }>();
  for (const row of rows) {
    const dateKey = row.evaluation.dateKey;
    if (!dateKey) continue;
    const [year, month] = dateKey.slice(0, 7).split("-");
    const key = `${year}-${month}`;
    const bucket = byMonth.get(key) ?? { sessionsTotal: 0, sessionsAttended: 0, homeworkAssigned: 0, homeworkCompleted: 0, focusSum: 0, focusCount: 0, participationSum: 0, participationCount: 0, notes: [] };
    bucket.sessionsTotal += 1;
    if (row.evaluation.attendance === "present") bucket.sessionsAttended += 1;
    if (row.evaluation.homework !== null) {
      bucket.homeworkAssigned += 1;
      if (row.evaluation.homework === "completed") bucket.homeworkCompleted += 1;
    }
    if (row.evaluation.focus !== null) { bucket.focusSum += row.evaluation.focus; bucket.focusCount += 1; }
    if (row.evaluation.participation !== null) { bucket.participationSum += row.evaluation.participation; bucket.participationCount += 1; }
    if (row.evaluation.notes) bucket.notes.push(row.evaluation.notes);
    byMonth.set(key, bucket);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, m]) => ({
      month: monthKey,
      sessionsTotal: m.sessionsTotal,
      sessionsAttended: m.sessionsAttended,
      attendanceRate: m.sessionsTotal > 0 ? Math.round((m.sessionsAttended / m.sessionsTotal) * 100) : null,
      homeworkAssigned: m.homeworkAssigned,
      homeworkCompleted: m.homeworkCompleted,
      homeworkRate: m.homeworkAssigned > 0 ? Math.round((m.homeworkCompleted / m.homeworkAssigned) * 100) : null,
      avgFocus: m.focusCount > 0 ? +(m.focusSum / m.focusCount).toFixed(1) : null,
      avgParticipation: m.participationCount > 0 ? +(m.participationSum / m.participationCount).toFixed(1) : null,
      noteCount: m.notes.length,
    }));
}

/**
 * Group-level monthly metrics: same shape but aggregated across all students
 * in the group. Useful for the admin overview.
 */
export async function getGroupMonthlyMetrics(groupId: number) {
  const db = await getDb(); if (!db) return [];
  const studentRows = await db.select({ id: students.id }).from(students).where(and(eq(students.groupId, groupId), eq(students.status, "active")));
  if (studentRows.length === 0) return [];
  const studentIds = studentRows.map(s => s.id);
  const rows = await db
    .select({ evaluation: studentEvaluations })
    .from(studentEvaluations)
    .where(inArray(studentEvaluations.studentId, studentIds))
    .orderBy(desc(studentEvaluations.dateKey));
  const byMonth = new Map<string, { sessionsTotal: number; sessionsAttended: number; homeworkAssigned: number; homeworkCompleted: number; focusSum: number; focusCount: number; participationSum: number; participationCount: number; studentCount: number }>();
  for (const row of rows) {
    const dateKey = row.evaluation.dateKey;
    if (!dateKey) continue;
    const [year, month] = dateKey.slice(0, 7).split("-");
    const key = `${year}-${month}`;
    const bucket = byMonth.get(key) ?? { sessionsTotal: 0, sessionsAttended: 0, homeworkAssigned: 0, homeworkCompleted: 0, focusSum: 0, focusCount: 0, participationSum: 0, participationCount: 0, studentCount: 0 };
    bucket.sessionsTotal += 1;
    if (row.evaluation.attendance === "present") bucket.sessionsAttended += 1;
    if (row.evaluation.homework !== null) { bucket.homeworkAssigned += 1; if (row.evaluation.homework === "completed") bucket.homeworkCompleted += 1; }
    if (row.evaluation.focus !== null) { bucket.focusSum += row.evaluation.focus; bucket.focusCount += 1; }
    if (row.evaluation.participation !== null) { bucket.participationSum += row.evaluation.participation; bucket.participationCount += 1; }
    bucket.studentCount += 1;
    byMonth.set(key, bucket);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, m]) => ({
      month: monthKey,
      sessionsTotal: m.sessionsTotal,
      sessionsAttended: m.sessionsAttended,
      attendanceRate: m.sessionsTotal > 0 ? Math.round((m.sessionsAttended / m.sessionsTotal) * 100) : null,
      homeworkAssigned: m.homeworkAssigned,
      homeworkCompleted: m.homeworkCompleted,
      homeworkRate: m.homeworkAssigned > 0 ? Math.round((m.homeworkCompleted / m.homeworkAssigned) * 100) : null,
      avgFocus: m.focusCount > 0 ? +(m.focusSum / m.focusCount).toFixed(1) : null,
      avgParticipation: m.participationCount > 0 ? +(m.participationSum / m.participationCount).toFixed(1) : null,
    }));
}

// ── Admin progress overview ─────────────────────────────────────────────────

/**
 * One row per student with aggregated progress stats — used by the admin
 * "all students" progress table. Pulls from evaluations (monthly metrics) and
 * from student_progress (curriculum completion).
 */
export async function listStudentProgressOverview() {
  const db = await getDb(); if (!db) return [];
  const studentRows = await db.select({ student: students, group: groups, course: studentCourses.course }).from(students).leftJoin(groups, eq(students.groupId, groups.id)).leftJoin(studentCourses, eq(studentCourses.studentId, students.id)).orderBy(asc(students.name));
  const byId = new Map<number, { student: typeof students.$inferSelect; group: typeof groups.$inferSelect | null; courses: CourseName[] }>();
  for (const row of studentRows) {
    const entry = byId.get(row.student.id) ?? { student: row.student, group: row.group, courses: [] as CourseName[] };
    if (row.course) entry.courses.push(row.course);
    byId.set(row.student.id, entry);
  }

  const results = [];
  for (const { student, group, courses } of byId.values()) {
    // Monthly metrics
    const evalRows = await db.select({ evaluation: studentEvaluations }).from(studentEvaluations).where(eq(studentEvaluations.studentId, student.id)).orderBy(desc(studentEvaluations.dateKey));
    const months = new Map<string, { attended: number; total: number; hwDone: number; hwTotal: number; focusSum: number; focusN: number; partSum: number; partN: number }>();
    for (const row of evalRows) {
      const dk = row.evaluation.dateKey;
      if (!dk) continue;
      const key = dk.slice(0, 7);
      const m = months.get(key) ?? { attended: 0, total: 0, hwDone: 0, hwTotal: 0, focusSum: 0, focusN: 0, partSum: 0, partN: 0 };
      m.total += 1;
      if (row.evaluation.attendance === "present") m.attended += 1;
      if (row.evaluation.homework !== null) { m.hwTotal += 1; if (row.evaluation.homework === "completed") m.hwDone += 1; }
      if (row.evaluation.focus !== null) { m.focusSum += row.evaluation.focus; m.focusN += 1; }
      if (row.evaluation.participation !== null) { m.partSum += row.evaluation.participation; m.partN += 1; }
      months.set(key, m);
    }
    const latestMonth = Array.from(months.keys()).sort().at(-1);
    const latest = latestMonth ? months.get(latestMonth)! : null;

    // Curriculum completion
    const progRows = await db.select().from(studentProgress).where(eq(studentProgress.studentId, student.id));
    const completedCount = progRows.filter(r => r.status === "completed").length;
    const inProgressCount = progRows.filter(r => r.status === "in_progress").length;

    results.push({
      studentId: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      groupId: student.groupId,
      groupName: group?.name ?? null,
      groupLevel: group?.level ?? null,
      courses,
      overallAttendanceRate: latest?.total ? Math.round((latest.attended / latest.total) * 100) : null,
      overallHomeworkRate: latest?.hwTotal ? Math.round((latest.hwDone / latest.hwTotal) * 100) : null,
      avgFocus: latest?.focusN ? +(latest.focusSum / latest.focusN).toFixed(1) : null,
      avgParticipation: latest?.partN ? +(latest.partSum / latest.partN).toFixed(1) : null,
      latestMonth,
      curriculumCompleted: completedCount,
      curriculumInProgress: inProgressCount,
      curriculumTotal: progRows.length,
      createdAt: student.createdAt,
    });
  }
  return results;
}

// -- Course availability -----------------------------------------------------

/**
 * Creates any missing course-offering rows from the documented defaults and
 * leaves every existing row untouched. Both admin and public reads call this so
 * a fresh database still renders a consistent catalogue.
 */
export async function ensureCourseOfferings(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ course: courseOfferings.course })
    .from(courseOfferings);
  const present = new Set(existing.map(row => row.course));
  const missing = COURSE_NAMES.filter(course => !present.has(course));
  if (missing.length === 0) return;
  await db
    .insert(courseOfferings)
    .values(
      missing.map(course => ({
        course,
        status: DEFAULT_COURSE_STATUS[course],
        updatedAt: new Date(),
      })),
    )
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function listCourseOfferings(): Promise<CourseOffering[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureCourseOfferings();
  return db.select().from(courseOfferings).orderBy(asc(courseOfferings.id));
}

export async function updateCourseOffering(
  course: CourseName,
  status: CourseOfferingStatus,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(courseOfferings)
    .values({ course, status, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { status, updatedAt: new Date() } });
}

/** Public waiting-list submission, idempotent per phone + course. */
export async function upsertWaitingListRequest(values: {
  course: CourseName;
  name: string;
  phone: string;
  email?: string | null;
  note?: string | null;
}): Promise<{ id: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: courseWaitingList.id })
    .from(courseWaitingList)
    .where(and(eq(courseWaitingList.course, values.course), eq(courseWaitingList.phone, values.phone)))
    .limit(1);
  await db
    .insert(courseWaitingList)
    .values({
      course: values.course,
      name: values.name.trim(),
      phone: values.phone,
      email: values.email?.trim() || null,
      note: values.note?.trim() || null,
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        name: values.name.trim(),
        email: values.email?.trim() || null,
        note: values.note?.trim() || null,
        updatedAt: new Date(),
      },
    });
  if (existing[0]) return { id: existing[0].id, duplicate: true };
  const row = await db
    .select({ id: courseWaitingList.id })
    .from(courseWaitingList)
    .where(and(eq(courseWaitingList.course, values.course), eq(courseWaitingList.phone, values.phone)))
    .limit(1);
  return { id: row[0]?.id ?? 0, duplicate: false };
}

export async function listWaitingListRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courseWaitingList).orderBy(desc(courseWaitingList.createdAt));
}

export async function updateWaitingListStatus(
  id: number,
  status: "pending" | "contacted" | "enrolled",
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(courseWaitingList).set({ status, updatedAt: new Date() }).where(eq(courseWaitingList.id, id));
}

// -- Registration requests ---------------------------------------------------

/**
 * Fingerprint used to make retries idempotent. It deliberately includes the
 * course and contact details so the same child cannot be entered twice by a
 * double click, while a sibling enrolling in another course is still a new row.
 */
export function registrationRequestKey(values: {
  fullName: string;
  phone: string;
  parentEmail: string;
  course: string;
}): string {
  return createHash("sha256")
    .update(
      [
        values.fullName.trim().toLowerCase(),
        values.phone.trim(),
        values.parentEmail.trim().toLowerCase(),
        values.course,
      ].join("|"),
    )
    .digest("hex");
}

export async function upsertRegistrationRequest(values: {
  fullName: string;
  phone: string;
  age: number;
  address: string;
  school: string;
  parentEmail: string;
  parentPhone: string;
  course: CourseName;
  gender: string;
  siblingRegistered: boolean;
  siblingName?: string | null;
  siblingPhone?: string | null;
  notes?: string | null;
}): Promise<{ request: RegistrationRequest; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const requestKey = registrationRequestKey(values);
  const existing = await db
    .select()
    .from(registrationRequests)
    .where(eq(registrationRequests.requestKey, requestKey))
    .limit(1);
  await db
    .insert(registrationRequests)
    .values({
      requestKey,
      fullName: values.fullName.trim(),
      phone: values.phone,
      age: values.age,
      address: values.address.trim(),
      school: values.school.trim(),
      parentEmail: values.parentEmail.trim().toLowerCase(),
      parentPhone: values.parentPhone,
      course: values.course,
      gender: values.gender,
      siblingRegistered: values.siblingRegistered,
      siblingName: values.siblingName?.trim() || null,
      siblingPhone: values.siblingPhone?.trim() || null,
      notes: values.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        fullName: values.fullName.trim(),
        age: values.age,
        address: values.address.trim(),
        school: values.school.trim(),
        parentEmail: values.parentEmail.trim().toLowerCase(),
        parentPhone: values.parentPhone,
        gender: values.gender,
        siblingRegistered: values.siblingRegistered,
        siblingName: values.siblingName?.trim() || null,
        siblingPhone: values.siblingPhone?.trim() || null,
        notes: values.notes?.trim() || null,
        updatedAt: new Date(),
      },
    });
  const row = await db
    .select()
    .from(registrationRequests)
    .where(eq(registrationRequests.requestKey, requestKey))
    .limit(1);
  if (!row[0]) throw new Error("The registration request could not be saved");
  return { request: row[0], duplicate: existing.length > 0 };
}

export async function listRegistrationRequests(status?: RegistrationStatus | null) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(registrationRequests)
    .where(status ? eq(registrationRequests.status, status) : undefined)
    .orderBy(desc(registrationRequests.createdAt));
}

export async function countPendingRegistrationRequests(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: registrationRequests.id })
    .from(registrationRequests)
    .where(eq(registrationRequests.status, "pending"));
  return rows.length;
}

export async function updateRegistrationStatus(
  id: number,
  status: RegistrationStatus,
  reviewedBy: number | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(registrationRequests)
    .set({
      status,
      reviewedBy,
      reviewedAt: status === "pending" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(registrationRequests.id, id));
}

/**
 * Converts a pending request into a real student in one transaction. Approval
 * is explicit: submitting the public form never creates a student on its own.
 */
export async function approveRegistrationRequest(
  id: number,
  reviewedBy: number | null,
): Promise<{ studentId: number; accessCode: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select()
    .from(registrationRequests)
    .where(eq(registrationRequests.id, id))
    .limit(1);
  const request = rows[0];
  if (!request) throw new Error("That registration request no longer exists");
  if (request.studentId) {
    const existing = await db
      .select({ id: students.id, accessCode: students.accessCode })
      .from(students)
      .where(eq(students.id, request.studentId))
      .limit(1);
    if (existing[0]) return { studentId: existing[0].id, accessCode: existing[0].accessCode };
  }
  if (request.status === "approved") {
    throw new Error("This request was already approved");
  }

  const accessCode = await createAccessCode();
  const studentId = await db.transaction(async tx => {
    const result = await tx.insert(students).values({
      name: request.fullName,
      email: request.parentEmail,
      phone: request.phone,
      groupId: null,
      accessCode,
      status: "active",
    });
    const newId = Number(result[0].insertId);
    await tx.insert(studentCourses).values({ studentId: newId, course: request.course });
    await tx
      .update(registrationRequests)
      .set({
        status: "approved",
        studentId: newId,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(registrationRequests.id, id));
    return newId;
  });
  return { studentId, accessCode };
}

// -- Lesson completion + quiz attempts ---------------------------------------

/** Resolves (and lazily creates) the curriculum row for a course. */
export async function ensureCurriculumForCourse(course: CourseName): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: curriculumCurricula.id })
    .from(curriculumCurricula)
    .where(eq(curriculumCurricula.course, course))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const { displayNameForCourse } = await import("./curriculum");
  const result = await db
    .insert(curriculumCurricula)
    .values({ course, displayName: displayNameForCourse(course), updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { displayName: displayNameForCourse(course) } });
  if (Number(result[0].insertId) > 0) return Number(result[0].insertId);
  const row = await db
    .select({ id: curriculumCurricula.id })
    .from(curriculumCurricula)
    .where(eq(curriculumCurricula.course, course))
    .limit(1);
  if (!row[0]) throw new Error("The course curriculum could not be created");
  return row[0].id;
}

export async function setStudentLessonCompletion(values: {
  studentId: number;
  course: CourseName;
  lessonId: string;
  completed: boolean;
}): Promise<void> {
  const curriculumId = await ensureCurriculumForCourse(values.course);
  await setProgressStatus({
    studentId: values.studentId,
    curriculumId,
    lessonId: values.lessonId,
    status: values.completed ? "completed" : "not_started",
  });
}

export async function recordQuizAttempt(values: {
  studentId: number;
  course: CourseName;
  lessonId: string;
  score: number;
  total: number;
  answers: number[];
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(quizAttempts).values({
    studentId: values.studentId,
    course: values.course,
    lessonId: values.lessonId,
    score: values.score,
    total: values.total,
    answers: JSON.stringify(values.answers),
  });
}

export async function getStudentQuizAttempts(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.studentId, studentId))
    .orderBy(desc(quizAttempts.submittedAt), desc(quizAttempts.id));
}

/** Progress rows plus every quiz attempt for one student. */
export async function getStudentLearningRecord(studentId: number) {
  const [progress, quizzes] = await Promise.all([
    getStudentProgress(studentId),
    getStudentQuizAttempts(studentId),
  ]);
  return { progress, quizzes };
}

// -- Assignments and submissions ---------------------------------------------

export async function createAssignment(values: {
  groupId: number;
  course: CourseName;
  sessionId?: number | null;
  title: string;
  instructions: string;
  dueAt?: Date | null;
  maxGrade: number;
  createdBy: number | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assignments).values({
    groupId: values.groupId,
    course: values.course,
    sessionId: values.sessionId ?? null,
    title: values.title.trim(),
    instructions: values.instructions.trim(),
    dueAt: values.dueAt ?? null,
    maxGrade: values.maxGrade,
    createdBy: values.createdBy,
    updatedAt: new Date(),
  });
  return Number(result[0].insertId);
}

export async function getAssignment(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
  return rows[0];
}

export async function updateAssignment(
  id: number,
  values: Partial<{
    title: string;
    instructions: string;
    dueAt: Date | null;
    maxGrade: number;
    active: boolean;
  }>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assignments).set({ ...values, updatedAt: new Date() }).where(eq(assignments.id, id));
}

export async function listAssignmentsForGroup(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.groupId, groupId))
    .orderBy(desc(assignments.createdAt));
}

export async function listGroupSubmissions(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      submission: assignmentSubmissions,
      assignment: assignments,
      studentName: students.name,
      fileId: assignmentFiles.id,
      fileName: assignmentFiles.originalName,
    })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .leftJoin(assignmentFiles, eq(assignmentFiles.submissionId, assignmentSubmissions.id))
    .where(eq(assignments.groupId, groupId))
    .orderBy(desc(assignmentSubmissions.submittedAt));
}

export async function getSubmissionWithAssignment(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ submission: assignmentSubmissions, assignment: assignments })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1);
  return rows[0];
}

export async function getAssignmentFile(fileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      file: assignmentFiles,
      submission: assignmentSubmissions,
      assignment: assignments,
    })
    .from(assignmentFiles)
    .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, assignmentFiles.submissionId))
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .where(eq(assignmentFiles.id, fileId))
    .limit(1);
  return rows[0];
}

export async function listAssignmentsForStudent(student: {
  id: number;
  groupId: number | null;
  courses: CourseName[];
}) {
  const db = await getDb();
  if (!db || student.groupId == null || student.courses.length === 0) return [];
  const rows = await db
    .select({ assignment: assignments, submission: assignmentSubmissions, fileId: assignmentFiles.id, fileName: assignmentFiles.originalName })
    .from(assignments)
    .leftJoin(
      assignmentSubmissions,
      and(
        eq(assignmentSubmissions.assignmentId, assignments.id),
        eq(assignmentSubmissions.studentId, student.id),
      ),
    )
    .leftJoin(assignmentFiles, eq(assignmentFiles.submissionId, assignmentSubmissions.id))
    .where(
      and(
        eq(assignments.groupId, student.groupId),
        eq(assignments.active, true),
        inArray(assignments.course, student.courses),
      ),
    )
    .orderBy(asc(assignments.dueAt), desc(assignments.createdAt));
  return rows;
}

/**
 * Upserts the student's submission. A graded submission is frozen: the student
 * can read the grade and feedback, but cannot silently replace graded work.
 */
export async function upsertAssignmentSubmission(values: {
  assignmentId: number;
  studentId: number;
  textResponse?: string | null;
  codeResponse?: string | null;
  late: boolean;
  file?: {
    originalName: string;
    mimeType: string;
    size: number;
    dataBase64: string;
  } | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select()
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, values.assignmentId),
        eq(assignmentSubmissions.studentId, values.studentId),
      ),
    )
    .limit(1);
  const current = existing[0];
  if (current?.status === "graded") {
    throw new Error("This submission has already been graded and cannot be replaced");
  }

  const submissionId = await db.transaction(async tx => {
    let id: number;
    if (current) {
      await tx
        .update(assignmentSubmissions)
        .set({
          textResponse: values.textResponse?.trim() || null,
          codeResponse: values.codeResponse?.trim() || null,
          late: values.late,
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(assignmentSubmissions.id, current.id));
      id = current.id;
    } else {
      const result = await tx.insert(assignmentSubmissions).values({
        assignmentId: values.assignmentId,
        studentId: values.studentId,
        textResponse: values.textResponse?.trim() || null,
        codeResponse: values.codeResponse?.trim() || null,
        late: values.late,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      });
      id = Number(result[0].insertId);
    }
    if (values.file) {
      await tx.delete(assignmentFiles).where(eq(assignmentFiles.submissionId, id));
      await tx.insert(assignmentFiles).values({
        submissionId: id,
        storageKey: randomUUID(),
        originalName: values.file.originalName,
        mimeType: values.file.mimeType,
        size: values.file.size,
        dataBase64: values.file.dataBase64,
      });
    }
    return id;
  });
  return submissionId;
}

export async function gradeAssignmentSubmission(values: {
  submissionId: number;
  grade: number;
  feedback?: string | null;
  gradedBy: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(assignmentSubmissions)
    .set({
      status: "graded",
      grade: values.grade,
      feedback: values.feedback?.trim() || null,
      gradedBy: values.gradedBy,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assignmentSubmissions.id, values.submissionId));
}

/**
 * Homework totals for a set of students, used by the performance loaders.
 * Relevant = active assignments for the student's group and one of the
 * student's enrolled courses. Submitted counts a stored submission regardless
 * of grade; graded is reported separately.
 */
export async function getAssignmentStatsByStudent(
  studentIds: number[],
): Promise<Map<number, { total: number; submitted: number; graded: number }>> {
  const result = new Map<number, { total: number; submitted: number; graded: number }>();
  const db = await getDb();
  if (!db || studentIds.length === 0) return result;
  const roster = await db
    .select({ id: students.id, groupId: students.groupId, course: studentCourses.course })
    .from(students)
    .leftJoin(studentCourses, eq(studentCourses.studentId, students.id))
    .where(inArray(students.id, studentIds));
  const coursesByStudent = new Map<number, Set<CourseName>>();
  const groupByStudent = new Map<number, number | null>();
  for (const row of roster) {
    groupByStudent.set(row.id, row.groupId);
    const set = coursesByStudent.get(row.id) ?? new Set<CourseName>();
    if (row.course) set.add(row.course);
    coursesByStudent.set(row.id, set);
  }
  const groupIds = Array.from(new Set(Array.from(groupByStudent.values()).filter((id): id is number => id != null)));
  if (groupIds.length === 0) return result;
  const [assignmentRows, submissionRows] = await Promise.all([
    db.select().from(assignments).where(and(inArray(assignments.groupId, groupIds), eq(assignments.active, true))),
    db
      .select({ submission: assignmentSubmissions })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(inArray(assignmentSubmissions.studentId, studentIds)),
  ]);
  const relevantByStudent = new Map<number, number[]>();
  for (const studentId of studentIds) {
    const groupId = groupByStudent.get(studentId) ?? null;
    const courses = coursesByStudent.get(studentId) ?? new Set<CourseName>();
    const relevant = assignmentRows
      .filter(row => row.groupId === groupId && courses.has(row.course))
      .map(row => row.id);
    relevantByStudent.set(studentId, relevant);
    result.set(studentId, { total: relevant.length, submitted: 0, graded: 0 });
  }
  for (const row of submissionRows) {
    const relevant = relevantByStudent.get(row.submission.studentId);
    if (!relevant || !relevant.includes(row.submission.assignmentId)) continue;
    const bucket = result.get(row.submission.studentId);
    if (!bucket) continue;
    bucket.submitted += 1;
    if (row.submission.status === "graded") bucket.graded += 1;
  }
  return result;
}

/** Whether this instructor teaches any slot in the group. */
export async function isGroupAuthorizedForInstructor(
  instructorId: number,
  groupId: number,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: groupSessions.id })
    .from(groupSessions)
    .where(and(eq(groupSessions.groupId, groupId), eq(groupSessions.instructorId, instructorId)))
    .limit(1);
  return rows.length > 0;
}
