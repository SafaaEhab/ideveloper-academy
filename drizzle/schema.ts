import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// بيانات دخول بالإيميل والباسورد — separate from `users` so the OAuth flow
// (which has no password) keeps working untouched. One row per email address;
// the password never leaves this table.
export const userCredentials = mysqlTable("user_credentials", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 128 }).notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

// قائمة المسموح لهم بالدخول على لوحة الأدمن — بديل قاعدة البيانات لمتغير
// ADMIN_EMAILS في البيئة. الأدمن بيزوّد الإيميلات من جوّه اللوحة من غير ما
// necessitates إعادة نشر، والـ env لسه شغّال عشان صاحب اللوحة مقفلش نفسه برّه.
export const adminInvites = mysqlTable("admin_invites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  invitedBy: varchar("invitedBy", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// طلبات الوصول للوحة الأدمن — حد بيكتب إيميله واسمه بس، إيميل بيوصل لصاحب
// الموقع، وهو من واجهة الأدمن بيقبل أو بيرفض. وجود صف = طلب لسه مفتوح.
// `note` سيب في الجدول من أول نسخة اتعملت، بس مش بيتكتب دلوقتي — سيبه عشان لو
// رجعت السبب تاني ما تحتاجش migration جديد.
export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

export const groups = mysqlTable("academy_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  level: varchar("level", { length: 80 }),
  scheduleDays: varchar("scheduleDays", { length: 200 }),
  scheduleTime: varchar("scheduleTime", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const students = mysqlTable("academy_students", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  accessCode: varchar("accessCode", { length: 32 }).notNull().unique(),
  groupId: int("groupId"),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const studentCourses = mysqlTable("academy_student_courses", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// جدول المواعيد — the calendar behind "Groups & schedules". A row here is a
// recurring weekly slot for one group, the same idea as a repeating Google
// Calendar event. The admin drags it on the grid and the whole series moves.
export const groupSessions = mysqlTable("academy_group_sessions", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  // 0 = Sunday … 6 = Saturday, matching JavaScript's Date#getDay.
  dayOfWeek: int("dayOfWeek").notNull(),
  // 24-hour "HH:MM". Stored as text because these sort chronologically as strings
  // and are far easier to read in the raw database than minute offsets.
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  // Optional room / Zoom link, shown on the event block.
  location: varchar("location", { length: 120 }),
  // Optional admin-only note.
  notes: varchar("notes", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

// استثناءات — one-off changes to a single week. A cancelled class on a holiday, or
// a session pushed to another day for a workshop. Rows here win over the weekly
// recurrence for the single date they name.
export const sessionExceptions = mysqlTable("academy_session_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  // The date the change applies to, "YYYY-MM-DD". Not a timestamp on purpose:
  // a schedule is a wall-clock concept and must not drift across timezones.
  dateKey: varchar("dateKey", { length: 10 }).notNull(),
  kind: mysqlEnum("kind", ["cancelled", "moved"]).notNull(),
  // "moved" only: where the session lands. Null means the same day, new time.
  moveToDate: varchar("moveToDate", { length: 10 }),
  startTime: varchar("startTime", { length: 5 }),
  endTime: varchar("endTime", { length: 5 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

// الإنجازات — achievements shown on the home page. Admin-managed: image, text, date.
export const achievements = mysqlTable("academy_achievements", {
  id: int("id").autoincrement().primaryKey(),
  // Optional short heading. Falls back to the description when empty.
  title: varchar("title", { length: 200 }),
  // The card body — usually Arabic, rendered right-to-left.
  description: text("description").notNull(),
  // Free-form label exactly as it should read on the card: "2024", "28/3/2024", …
  achievedOn: varchar("achievedOn", { length: 60 }),
  // Cloudinary delivery URL, or any image URL pasted by hand.
  imageUrl: text("imageUrl"),
  // Small pill in the corner of the image, e.g. "Codeavour".
  tag: varchar("tag", { length: 60 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// الإعلان — the popup every visitor sees when the site loads. Admin-managed from
// the panel; when there is no enabled row the popup stays out of the way.
export const announcements = mysqlTable("academy_announcements", {
  id: int("id").autoincrement().primaryKey(),
  // Small pill above the title, e.g. "إعلان خاص".
  badge: varchar("badge", { length: 120 }),
  title: varchar("title", { length: 200 }).notNull(),
  // The punchier second line, shown under the title.
  headline: varchar("headline", { length: 200 }),
  body: text("body"),
  ctaLabel: varchar("ctaLabel", { length: 80 }),
  ctaHint: varchar("ctaHint", { length: 200 }),
  // Country code + number without "+" or spaces, because wa.me needs that shape.
  // Empty falls back to the academy's inbox from lib/contact.
  whatsappNumber: varchar("whatsappNumber", { length: 40 }),
  // Drives the countdown. Empty means no countdown block.
  deadline: timestamp("deadline"),
  // The admin switch: off hides the popup without losing the copy.
  enabled: boolean("enabled").default(false).notNull(),
  // One chip per line in the form, stored as a JSON array of strings.
  facts: text("facts"),
  // One prize per line as "place | reward", stored as a JSON array.
  prizes: text("prizes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserCredential = typeof userCredentials.$inferSelect;
export type AdminInvite = typeof adminInvites.$inferSelect;
export type AccessRequest = typeof accessRequests.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Student = typeof students.$inferSelect;
export type StudentCourse = typeof studentCourses.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;
export type GroupSession = typeof groupSessions.$inferSelect;
export type InsertGroupSession = typeof groupSessions.$inferInsert;
export type SessionException = typeof sessionExceptions.$inferSelect;
export type InsertSessionException = typeof sessionExceptions.$inferInsert;
export type SessionExceptionKind = (typeof sessionExceptions.$inferSelect)["kind"];
export type CourseName = "Scratch" | "Robotics" | "Web" | "Python";
