import { boolean, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // "instructor" is the third role: it opens the instructor dashboard only —
  // never the admin workspace, no matter which screen it tries.
  role: mysqlEnum("role", ["user", "admin", "instructor"]).default("user").notNull(),
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

// المدربون — instructor profiles. Each row is tied to a real `users` account
// (created together with it, openId "email:<email>", role "instructor"), so the
// sign-in flow is exactly the existing email + password one and the password
// hash never leaves `user_credentials`. `active` is the admin's kill switch:
// an inactive row denies the dashboard without deleting anything.
export const instructors = mysqlTable("academy_instructors", {
  id: int("id").autoincrement().primaryKey(),
  // The `users` row this instructor signs in with. Not a foreign key on
  // purpose — the rest of this schema links by plain ints too.
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 40 }),
  // What they teach, shown next to their name in the timetable and dashboard.
  title: varchar("title", { length: 120 }),
  // Off hides the dashboard but keeps the profile, the history and the account.
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const groups = mysqlTable("academy_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  level: varchar("level", { length: 80 }),
  scheduleDays: varchar("scheduleDays", { length: 200 }),
  scheduleTime: varchar("scheduleTime", { length: 80 }),
  // Where the group talks on WhatsApp. Filled by the admin and used by the
  // instructor's share flow; never exposed beyond admin/instructor endpoints.
  whatsappUrl: varchar("whatsappUrl", { length: 500 }),
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
  // The instructor who teaches this slot — the single assignment mechanism.
  // Null means "unassigned"; the admin picks from existing instructors only.
  instructorId: int("instructorId"),
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

// تقييمات الطلاب — one row per student, per timetable session, per date. The
// date is a "YYYY-MM-DD" string (not a timestamp) for the same reason as the
// session exceptions: a class happened on a wall-clock day, and evaluations
// must not drift when the server's timezone does. The unique triple is what
// turns "save" into idempotent upserts, so an instructor can resave a row all
// evening without ever duplicating history.
export const studentEvaluations = mysqlTable(
  "academy_student_evaluations",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull(),
    // The timetable series this evaluation belongs to.
    sessionId: int("sessionId").notNull(),
    // The concrete day the session actually ran (a moved week uses its new date).
    dateKey: varchar("dateKey", { length: 10 }).notNull(),
    // Attendance has two states; null means "not recorded yet".
    attendance: mysqlEnum("attendance", ["present", "absent"]),
    homework: mysqlEnum("homework", ["completed", "not_completed"]),
    // Instructor ratings, 1–5 by the API contract. Kept as plain ints so a
    // changed scale later is a migration, not a datatype problem.
    focus: int("focus"),
    participation: int("participation"),
    // Optional comments about the student's performance.
    notes: varchar("notes", { length: 500 }),
    // The `users.id` of whoever recorded it — provenance, not for display.
    recordedBy: int("recordedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("evaluation_per_occurrence").on(
      table.studentId,
      table.sessionId,
      table.dateKey,
    ),
  ],
);
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

// ── Course availability ─────────────────────────────────────────────────────
// One authoritative status per catalogue course. Both the admin overview and
// the public cards read this table, so "Coming soon" can never disagree with
// "Book your spot" on two different screens.
export const courseOfferings = mysqlTable("academy_course_offerings", {
  id: int("id").autoincrement().primaryKey(),
  course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"])
    .notNull()
    .unique(),
  status: mysqlEnum("status", ["live", "coming_soon", "waiting_list"])
    .default("coming_soon")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

// Waiting-list requests collected from the public course cards. A phone number
// is unique per course, so a double tap (or a retry) updates the existing row
// instead of creating a second request.
export const courseWaitingList = mysqlTable(
  "academy_course_waiting_list",
  {
    id: int("id").autoincrement().primaryKey(),
    course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    email: varchar("email", { length: 320 }),
    note: varchar("note", { length: 500 }),
    status: mysqlEnum("status", ["pending", "contacted", "enrolled"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("waiting_list_course_phone").on(table.course, table.phone),
    index("waiting_list_status").on(table.status),
  ],
);

// ── Public registration requests ────────────────────────────────────────────
// A parent's submission is durable even when they never open WhatsApp. The
// admin reviews it and may promote it to a real student later; the request
// itself never becomes an active student automatically.
export const registrationRequests = mysqlTable(
  "academy_registration_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    // Stable fingerprint of the submitted person + course, used to make a
    // network retry idempotent rather than a duplicate request.
    requestKey: varchar("requestKey", { length: 64 }).notNull().unique(),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    age: int("age").notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    school: varchar("school", { length: 200 }).notNull(),
    parentEmail: varchar("parentEmail", { length: 320 }).notNull(),
    parentPhone: varchar("parentPhone", { length: 40 }).notNull(),
    course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
    gender: varchar("gender", { length: 16 }).notNull(),
    siblingRegistered: boolean("siblingRegistered").default(false).notNull(),
    siblingName: varchar("siblingName", { length: 160 }),
    siblingPhone: varchar("siblingPhone", { length: 40 }),
    notes: varchar("notes", { length: 2000 }),
    status: mysqlEnum("status", ["pending", "contacted", "approved", "rejected"])
      .default("pending")
      .notNull(),
    // Set only when an admin converts the request into a student.
    studentId: int("studentId"),
    reviewedBy: int("reviewedBy"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
  },
  table => [index("registration_status").on(table.status)],
);

// ── Quiz attempts ───────────────────────────────────────────────────────────
// Every attempt is kept: the performance page shows the latest and best score,
// while nothing is lost when a student retries a quiz.
export const quizAttempts = mysqlTable(
  "academy_quiz_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull(),
    course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
    lessonId: varchar("lessonId", { length: 64 }).notNull(),
    score: int("score").notNull(),
    total: int("total").notNull(),
    // The submitted option indexes, retained for auditability. Never returned
    // to a student and never used as the authoritative score.
    answers: text("answers"),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("quiz_attempt_student_lesson").on(
      table.studentId,
      table.course,
      table.lessonId,
    ),
  ],
);

// ── Assignments ─────────────────────────────────────────────────────────────
// Instructor-created homework attached to a group and course. A session link is
// optional; the group + course pair is the authorization boundary.
export const assignments = mysqlTable(
  "academy_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
    sessionId: int("sessionId"),
    title: varchar("title", { length: 200 }).notNull(),
    instructions: text("instructions").notNull(),
    dueAt: timestamp("dueAt"),
    maxGrade: int("maxGrade").default(100).notNull(),
    active: boolean("active").default(true).notNull(),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
  },
  table => [index("assignment_group_course").on(table.groupId, table.course)],
);

export const assignmentSubmissions = mysqlTable(
  "academy_assignment_submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    assignmentId: int("assignmentId").notNull(),
    studentId: int("studentId").notNull(),
    textResponse: text("textResponse"),
    codeResponse: text("codeResponse"),
    status: mysqlEnum("status", ["submitted", "graded"]).default("submitted").notNull(),
    // Computed on the server from the assignment deadline and the receipt time.
    late: boolean("late").default(false).notNull(),
    grade: int("grade"),
    feedback: text("feedback"),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    gradedBy: int("gradedBy"),
    gradedAt: timestamp("gradedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("submission_per_student").on(table.assignmentId, table.studentId),
    index("submission_student").on(table.studentId),
  ],
);

// Files live in the database, not on the serverless function's ephemeral disk.
// The original name is display-only; the storage key is always random, and the
// download route checks ownership before sending a byte.
export const assignmentFiles = mysqlTable(
  "academy_assignment_files",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionId: int("submissionId").notNull(),
    storageKey: varchar("storageKey", { length: 80 }).notNull().unique(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    size: int("size").notNull(),
    dataBase64: longtext("dataBase64").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("assignment_file_submission").on(table.submissionId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserCredential = typeof userCredentials.$inferSelect;
export type AdminInvite = typeof adminInvites.$inferSelect;
export type AccessRequest = typeof accessRequests.$inferSelect;
export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = typeof instructors.$inferInsert;
export type StudentEvaluation = typeof studentEvaluations.$inferSelect;
export type InsertStudentEvaluation = typeof studentEvaluations.$inferInsert;
export type AttendanceState = (typeof studentEvaluations.$inferSelect)["attendance"];
export type HomeworkState = (typeof studentEvaluations.$inferSelect)["homework"];
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

// ── Curriculum ──────────────────────────────────────────────────────────────
// Each academy course has one curriculum row; lessons are children of it.
// Kept in the DB so admins can update titles / ordering without a redeploy,
// and so the progress system can reference actual lesson ids rather than
// re-deriving them from static files on every query.
export const curriculumCurricula = mysqlTable("curriculum_curricula", {
  id: int("id").autoincrement().primaryKey(),
  course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const curriculumLessons = mysqlTable("curriculum_lessons", {
  id: int("id").autoincrement().primaryKey(),
  curriculumId: int("curriculumId").notNull(),
  // The stable id from the static curriculum files (e.g. "s1", "js-3", "css-2").
  lessonId: varchar("lessonId", { length: 64 }).notNull(),
  number: int("number").notNull(),
  month: int("month").notNull(),
  phase: int("phase").notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ── Student progress ────────────────────────────────────────────────────────
// One row per (student, curriculum lesson). Updated by the instructor (or
// admin) when a lesson is marked completed; never overwritten silently by
// session evaluations — those drive the separate monthly-metrics path.
export const studentProgress = mysqlTable(
  "student_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull(),
    curriculumId: int("curriculumId").notNull(),
    lessonId: varchar("lessonId", { length: 64 }).notNull(),
    // "not_started" | "in_progress" | "completed"
    status: mysqlEnum("status", ["not_started", "in_progress", "completed"])
      .default("not_started")
      .notNull(),
    completedAt: timestamp("completedAt"),
    // Instructor notes about this lesson; kept private from the student view.
    instructorNote: varchar("instructorNote", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    // Prevent duplicate rows when an instructor re-saves the same status.
    uniqueIndex("progress_unique").on(t.studentId, t.curriculumId, t.lessonId),
  ],
);

// ── Leads (Phase 1) ─────────────────────────────────────────────────────────
// A lead is a registration that has not become a student yet. It is deliberately
// separate from `academy_students`: the public form writes here, the dashboard
// works here, and only an explicit conversion creates a student row.
export const leads = mysqlTable(
  "academy_leads",
  {
    id: int("id").autoincrement().primaryKey(),
    // The old registration-request row this lead was migrated from, if any.
    // Unique so a re-run of the backfill can never duplicate a lead.
    legacyRegistrationId: int("legacyRegistrationId").unique(),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    // Stored in E.164 (+20...) after server-side normalization.
    studentPhone: varchar("studentPhone", { length: 20 }).notNull(),
    age: int("age").notNull(),
    school: varchar("school", { length: 200 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    parentEmail: varchar("parentEmail", { length: 320 }).notNull(),
    parentPhone: varchar("parentPhone", { length: 20 }).notNull(),
    course: mysqlEnum("course", ["Scratch", "Robotics", "Web", "Python"]).notNull(),
    gender: varchar("gender", { length: 16 }).notNull(),
    hasRegisteredSibling: boolean("hasRegisteredSibling").default(false).notNull(),
    siblingName: varchar("siblingName", { length: 160 }),
    siblingPhone: varchar("siblingPhone", { length: 20 }),
    customerNotes: text("customerNotes"),
    status: mysqlEnum("status", [
      "new",
      "needs_follow_up",
      "subscribed",
      "not_interested",
    ])
      .default("new")
      .notNull(),
    // `users.id` of the assigned reception employee / admin. Null = unassigned.
    assignedEmployeeId: int("assignedEmployeeId"),
    // Always written by the server; never accepted from the public form.
    registrationDate: timestamp("registrationDate").defaultNow().notNull(),
    lastContactDate: timestamp("lastContactDate"),
    nextFollowUpDate: timestamp("nextFollowUpDate"),
    internalNotes: text("internalNotes"),
    source: varchar("source", { length: 32 }).default("website").notNull(),
    whatsAppOptOut: boolean("whatsAppOptOut").default(false).notNull(),
    // One-way Google Sheets reporting state. The database remains the source
    // of truth; these fields only describe the reporting copy.
    googleSheetSyncStatus: mysqlEnum("googleSheetSyncStatus", [
      "pending",
      "synced",
      "failed",
    ])
      .default("pending")
      .notNull(),
    googleSheetLastSyncAt: timestamp("googleSheetLastSyncAt"),
    googleSheetRowNumber: int("googleSheetRowNumber"),
    googleSheetSyncAttempts: int("googleSheetSyncAttempts").default(0).notNull(),
    googleSheetSyncError: varchar("googleSheetSyncError", { length: 1000 }),
    googleSheetSyncedRevision: int("googleSheetSyncedRevision").default(0).notNull(),
    // Incremented on every change that should reach the reporting copy.
    syncRevision: int("syncRevision").default(1).notNull(),
    convertedStudentId: int("convertedStudentId"),
    convertedAt: timestamp("convertedAt"),
    duplicateAttempts: int("duplicateAttempts").default(0).notNull(),
    lastDuplicateAt: timestamp("lastDuplicateAt"),
    notInterestedReason: varchar("notInterestedReason", { length: 32 }),
    notInterestedNote: varchar("notInterestedNote", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("lead_phone").on(table.studentPhone),
    index("lead_course").on(table.course),
    index("lead_status").on(table.status),
    index("lead_assigned_employee").on(table.assignedEmployeeId),
    index("lead_registration_date").on(table.registrationDate),
    index("lead_follow_up").on(table.nextFollowUpDate),
    index("lead_sheet_sync").on(
      table.googleSheetSyncStatus,
      table.syncRevision,
    ),
    index("lead_converted_student").on(table.convertedStudentId),
  ],
);

// A serialized audit trail for lead details: status, notes, contacts,
// assignments, duplicate attempts and conversions all land here.
export const leadActivities = mysqlTable(
  "academy_lead_activities",
  {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull(),
    type: mysqlEnum("type", [
      "created",
      "status_changed",
      "note_added",
      "contact_logged",
      "follow_up_set",
      "employee_assigned",
      "converted",
      "duplicate_attempt",
      "sheet_sync_failed",
      "sheet_sync_succeeded",
      "updated",
    ]).notNull(),
    previousStatus: mysqlEnum("previousStatus", [
      "new",
      "needs_follow_up",
      "subscribed",
      "not_interested",
    ]),
    newStatus: mysqlEnum("newStatus", [
      "new",
      "needs_follow_up",
      "subscribed",
      "not_interested",
    ]),
    employeeId: int("employeeId"),
    note: text("note"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("lead_activity_lead").on(table.leadId, table.createdAt),
    index("lead_activity_employee").on(table.employeeId),
  ],
);

/**
 * Durable outbox for Google Sheets. A row exists per lead and is upserted on
 * every change, so a server restart or a failed attempt never loses the work.
 * No in-memory queue is involved.
 */
export const leadSyncJobs = mysqlTable(
  "academy_lead_sync_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().unique(),
    status: mysqlEnum("status", ["pending", "processing", "succeeded", "failed"])
      .default("pending")
      .notNull(),
    attempts: int("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
    lockedAt: timestamp("lockedAt"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("lead_sync_due").on(table.status, table.nextAttemptAt),
  ],
);

/**
 * One row per (normalized phone + course). `SELECT ... FOR UPDATE` on this row
 * serializes concurrent registrations for the same pair, which closes the race
 * between the 30-day duplicate check and the insert.
 */
export const leadDedupeLocks = mysqlTable("academy_lead_dedupe_locks", {
  dedupeKey: varchar("dedupeKey", { length: 64 }).primaryKey(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Reception access without inventing a second authentication system: a staff
 * row points at the existing `users` account those people already sign in with.
 * Only an admin can create or remove these rows.
 */
export const leadStaff = mysqlTable(
  "academy_lead_staff",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    active: boolean("active").default(true).notNull(),
    canConvert: boolean("canConvert").default(false).notNull(),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("lead_staff_active").on(table.active)],
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;
export type LeadSyncJob = typeof leadSyncJobs.$inferSelect;
export type LeadStaff = typeof leadStaff.$inferSelect;
export type InsertLeadStaff = typeof leadStaff.$inferInsert;
export type LeadStatusValue = Lead["status"];
export type LeadSyncStatus = Lead["googleSheetSyncStatus"];

export type CurriculumCurriculum = typeof curriculumCurricula.$inferSelect;
export type InsertCurriculumCurriculum = typeof curriculumCurricula.$inferInsert;
export type CurriculumLesson = typeof curriculumLessons.$inferSelect;
export type InsertCurriculumLesson = typeof curriculumLessons.$inferInsert;
export type StudentProgress = typeof studentProgress.$inferSelect;
export type InsertStudentProgress = typeof studentProgress.$inferInsert;
export type CourseOffering = typeof courseOfferings.$inferSelect;
export type CourseOfferingStatus = (typeof courseOfferings.$inferSelect)["status"];
export type CourseWaitingListRequest = typeof courseWaitingList.$inferSelect;
export type RegistrationRequest = typeof registrationRequests.$inferSelect;
export type RegistrationStatus = (typeof registrationRequests.$inferSelect)["status"];
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type AssignmentFile = typeof assignmentFiles.$inferSelect;
