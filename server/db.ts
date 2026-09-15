import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, groups, students, studentCourses, CourseName } from "../drizzle/schema";
import { ENV } from "./_core/env";
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
  // Auto-promote: explicit role, OWNER_OPEN_ID, or ADMIN_EMAILS allowlist
  const emailForCheck = (user.email !== undefined ? user.email : undefined) ?? null;
  if (user.role !== undefined || (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) || isAdminEmail(emailForCheck)) {
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
