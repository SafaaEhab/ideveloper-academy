import { and, asc, desc, eq, gte, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, groups, groupSessions, sessionExceptions, students, studentCourses, achievements, announcements, userCredentials, adminInvites, accessRequests, CourseName } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { readAnnouncement, type ParsedAnnouncement } from "./announcement";
import { hashPassword } from "./_core/password";
import { customAlphabet } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;
const createCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
export const SHARED_COURSE_CODES: Record<string, CourseName[]> = {
  "ID-123456789": ["Python"],
  "ID-987654321": ["Web"],
  "ID-147852369": ["Scratch"],
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
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
  await upsertUser({
    openId: openIdForEmail(email),
    email,
    name: values.name?.trim() || email.split("@")[0],
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  return { success: true };
}

export function shouldBeAdmin(openId: string, email: string | null | undefined, explicitRole?: string): boolean {
  if (explicitRole === "admin") return true;
  if (ENV.ownerOpenId && openId === ENV.ownerOpenId) return true;
  if (isAdminEmail(email)) return true;
  return false;
}

export async function upsertUser(user: InsertUser): Promise<void> {
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
  const isAllowed = emailForCheck ? await isAllowedAdminEmail(emailForCheck) : false;
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
    .select({ session: groupSessions, group: groups })
    .from(groupSessions)
    .leftJoin(groups, eq(groupSessions.groupId, groups.id))
    .orderBy(
      asc(groupSessions.dayOfWeek),
      asc(groupSessions.startTime),
      asc(groupSessions.id),
    );
  return rows.map(row => ({
    ...row.session,
    groupName: row.group?.name ?? "Unknown group",
    groupLevel: row.group?.level ?? null,
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
  const sharedCourses = SHARED_COURSE_CODES[normalizedCode];
  if (sharedCourses) {
    return { id: 0, name: "Student", email: null, phone: null, groupId: null, accessCode: normalizedCode, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), group: null, courses: sharedCourses };
  }
  const db = await getDb(); if (!db) return null;
  const result = await db.select({ student: students, group: groups, course: studentCourses.course })
    .from(students)
    .leftJoin(groups, eq(students.groupId, groups.id))
    .leftJoin(studentCourses, eq(students.id, studentCourses.studentId))
    .where(and(eq(students.accessCode, normalizedCode), eq(students.status, "active")));
  if (!result.length) return null;
  return { ...result[0].student, group: result[0].group, courses: result.map(row => row.course).filter(Boolean) as CourseName[] };
}
