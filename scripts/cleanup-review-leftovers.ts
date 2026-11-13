/**
 * Removes only rows created by the final review, identified by the review run
 * prefix. It never deletes a real row and never touches the owner account.
 */
import "dotenv/config";
import { eq, like } from "drizzle-orm";
import {
  achievements,
  adminInvites,
  announcements,
  groups,
  groupSessions,
  instructors,
  studentCourses,
  students,
  userCredentials,
  users,
} from "../drizzle/schema";
import { getDb } from "../server/db";

const RUN = process.env.REVIEW_RUN ?? "20261113";
const db = await getDb();
if (!db) throw new Error("DATABASE_URL is required");

const studentRows = await db
  .select({ id: students.id })
  .from(students)
  .where(like(students.name, `%${RUN}%`));
for (const row of studentRows) {
  await db.delete(studentCourses).where(eq(studentCourses.studentId, row.id));
  await db.delete(students).where(eq(students.id, row.id));
}

const groupRows = await db
  .select({ id: groups.id })
  .from(groups)
  .where(like(groups.name, `%${RUN}%`));
for (const row of groupRows) {
  await db.delete(groupSessions).where(eq(groupSessions.groupId, row.id));
  await db.delete(groups).where(eq(groups.id, row.id));
}

await db.delete(instructors).where(like(instructors.email, `review-instructor-${RUN}%`));
await db.delete(userCredentials).where(like(userCredentials.email, `review-instructor-${RUN}%`));
await db.delete(users).where(like(users.email, `review-instructor-${RUN}%`));

await db.delete(achievements).where(like(achievements.title, `%${RUN}%`));
await db.delete(announcements).where(like(announcements.title, `%${RUN}%`));
await db.delete(adminInvites).where(like(adminInvites.email, `review-admin-${RUN}%`));

console.log("REVIEW_LEFTOVERS_CLEANED", RUN);
process.exit(0);
