import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { checkRateLimit, rateLimitKey } from "./_core/password";
import { destroyImage, isCloudinaryConfigured, ownedPublicId, uploadImage } from "./_core/cloudinary";
import { eq } from "drizzle-orm";
import { getDb, getStudentByCode, listAchievements, listGroups, listStudents, createAccessCode, deleteAchievement, getAchievement, insertAchievement, updateAchievement, listAnnouncements, getActiveAnnouncement, insertAnnouncement, updateAnnouncement, setOnlyAnnouncementEnabled, deleteAnnouncement, listGroupSessions, insertGroupSession, updateGroupSession, deleteGroupSession, deleteSessionsForGroup, listSessionExceptions, insertSessionException, deleteSessionException, listAdminInvites, addAdminInvite, removeAdminInvite } from "./db";
import { groups, students, studentCourses, groupSessions } from "../drizzle/schema";

const courseSchema = z.enum(["Scratch", "Robotics", "Web", "Python"]);
const PORTAL_MAX_ATTEMPTS = 30;

// ── جدول المواعيد — the group schedule calendar ─────────────────────────────

/** Times are always 24-hour "HH:MM" so they sort as plain strings. */
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 17:00");

const dateKeySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

/**
 * The calendar form. Split from the refinement below because Zod 4 refuses
 * `.extend()` on an already-refined schema, and the update route needs the same
 * fields plus an id.
 */
const groupSessionFields = z.object({
  groupId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  location: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

const endsAfterStart = (value: { startTime: string; endTime: string }) =>
  value.endTime > value.startTime;

const endsAfterStartMessage = {
  message: "The session has to end after it starts",
  path: ["endTime"],
};

const groupSessionSchema = groupSessionFields.refine(
  endsAfterStart,
  endsAfterStartMessage,
);

const updateGroupSessionSchema = groupSessionFields
  .extend({ id: z.number().int().positive() })
  .refine(endsAfterStart, endsAfterStartMessage);

/** Empty strings collapse to null so the database stays tidy. */
function groupSessionValues(input: z.infer<typeof groupSessionSchema>) {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  };
  return {
    groupId: input.groupId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    location: text(input.location),
    notes: text(input.notes),
  };
}

const sessionExceptionSchema = z
  .object({
    sessionId: z.number().int().positive(),
    dateKey: dateKeySchema,
    kind: z.enum(["cancelled", "moved"]),
    // Blank means "same day, new time". Omitted times fall back to the session's.
    moveToDate: dateKeySchema.optional().or(z.literal("")),
    startTime: timeSchema.optional().or(z.literal("")),
    endTime: timeSchema.optional().or(z.literal("")),
  })
  .refine(
    value =>
      value.kind === "cancelled" || Boolean(value.startTime && value.endTime),
    {
      message: "A moved session needs a start and end time",
      path: ["startTime"],
    },
  )
  .refine(
    value =>
      !value.startTime || !value.endTime || value.endTime > value.startTime,
    { message: "The session has to end after it starts", path: ["endTime"] },
  );

/** The achievement form. Everything but the body text is optional. */
const achievementSchema = z.object({
  title: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(1, "Write what the achievement was"),
  achievedOn: z.string().trim().max(60).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  tag: z.string().trim().max(60).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

/** Trimmed form fields, empty strings collapsed to null for the database. */
function achievementValues(input: z.infer<typeof achievementSchema>) {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  };
  return {
    title: text(input.title),
    description: input.description.trim(),
    achievedOn: text(input.achievedOn),
    imageUrl: text(input.imageUrl),
    tag: text(input.tag),
    sortOrder: input.sortOrder ?? 0,
  };
}

/** The announcement form. Only the title is required — the popup fills itself in. */
const announcementSchema = z.object({
  badge: z.string().trim().max(120).optional().or(z.literal("")),
  title: z.string().trim().min(1, "العنوان مطلوب").max(200),
  headline: z.string().trim().max(200).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(80).optional().or(z.literal("")),
  ctaHint: z.string().trim().max(200).optional().or(z.literal("")),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{5,25}$/, "رقم واتساب غير صحيح")
    .optional()
    .or(z.literal("")),
  // A datetime-local value; empty means "no countdown".
  deadline: z.string().trim().max(40).optional().or(z.literal("")),
  enabled: z.boolean(),
  facts: z.array(z.string().trim().max(120)).max(8).optional(),
  prizes: z.array(z.object({ place: z.string().trim().max(120), reward: z.string().trim().max(200) })).max(8).optional(),
});

/** Trimmed announcement fields, empty strings collapsed to null for the database. */
function announcementValues(input: z.infer<typeof announcementSchema>) {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  };
  const deadline = input.deadline?.trim() ? new Date(input.deadline) : null;
  return {
    badge: text(input.badge),
    title: input.title.trim(),
    headline: text(input.headline),
    body: text(input.body),
    ctaLabel: text(input.ctaLabel),
    ctaHint: text(input.ctaHint),
    whatsappNumber: text(input.whatsappNumber),
    deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
    enabled: input.enabled,
    // Admin types one item per line; the database keeps them as JSON.
    facts: JSON.stringify((input.facts ?? []).filter(fact => fact.length > 0)),
    prizes: JSON.stringify(
      (input.prizes ?? []).filter(prize => prize.place.length > 0 && prize.reward.length > 0),
    ),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  portal: router({
    // Public and unguessable in theory — codes are 8 characters from a 32-symbol
    // alphabet — but nothing stopped a script from trying thousands in a row, so
    // the endpoint is throttled per caller as well. A wrong code is still
    // answered with the same null a paused student gets, so nothing leaks.
    byCode: publicProcedure
      .input(z.object({ accessCode: z.string().min(4) }))
      .query(({ input, ctx }) => {
        if (!checkRateLimit(rateLimitKey(ctx.req, "portal"), PORTAL_MAX_ATTEMPTS)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many lookups. Wait a moment and try again.",
          });
        }
        return getStudentByCode(input.accessCode);
      }),
  }),
  site: router({
    // Read by the home page. No auth: these are the academy's public results.
    achievements: publicProcedure.query(() => listAchievements()),
    // The site popup. Null whenever no announcement is switched on, which is what
    // keeps the home page clean.
    announcement: publicProcedure.query(() => getActiveAnnouncement()),
  }),
  admin: router({
    stats: adminProcedure.query(async () => {
      const [studentRows, groupRows] = await Promise.all([listStudents(), listGroups()]);
      return { students: studentRows.length, groups: groupRows.length, active: studentRows.filter(s => s.status === "active").length };
    }),
    students: adminProcedure.query(() => listStudents()),
    groups: adminProcedure.query(() => listGroups()),
    // ── قائمة المسموح لهم بالدخول على اللوحة ─────────────────────────────────
    admins: adminProcedure.query(() => listAdminInvites()),
    addAdmin: adminProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input, ctx }) => {
      await addAdminInvite(input.email, ctx.user?.email ?? null);
      return { success: true };
    }),
    removeAdmin: adminProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      await removeAdminInvite(input.email);
      return { success: true };
    }),
    createGroup: adminProcedure.input(z.object({ name: z.string().min(2), level: z.string().optional(), scheduleDays: z.string().optional(), scheduleTime: z.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(groups).values(input); return { success: true };
    }),
    updateGroup: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), level: z.string().optional(), scheduleDays: z.string().optional(), scheduleTime: z.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(groups).set({ name: input.name, level: input.level, scheduleDays: input.scheduleDays, scheduleTime: input.scheduleTime }).where(eq(groups.id, input.id)); return { success: true };
    }),
    deleteGroup: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ groupId: null }).where(eq(students.groupId, input.id));
      // The calendar rows and their one-off exceptions have nowhere to point now.
      await deleteSessionsForGroup(input.id);
      await db.delete(groups).where(eq(groups.id, input.id)); return { success: true };
    }),
    createStudent: adminProcedure.input(z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().min(7, "Phone number is required"), groupId: z.number().nullable().optional(), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const accessCode = await createAccessCode();
      const result = await db.insert(students).values({ name: input.name, email: input.email || null, phone: input.phone || null, groupId: input.groupId ?? null, accessCode });
      const studentId = Number(result[0].insertId);
      await db.insert(studentCourses).values(input.courses.map(course => ({ studentId, course })));
      return { success: true, accessCode };
    }),
    updateStudent: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().min(7, "Phone number is required"), groupId: z.number().nullable().optional(), status: z.enum(["active", "paused"]), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ name: input.name, email: input.email || null, phone: input.phone || null, groupId: input.groupId ?? null, status: input.status }).where(eq(students.id, input.id));
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.insert(studentCourses).values(input.courses.map(course => ({ studentId: input.id, course })));
      return { success: true };
    }),
    deleteStudent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.delete(students).where(eq(students.id, input.id)); return { success: true };
    }),
    // ── Achievements ─────────────────────────────────────────────────────────
    achievements: adminProcedure.query(() => listAchievements()),
    uploadConfigured: adminProcedure.query(() => ({ upload: isCloudinaryConfigured() })),
    uploadAchievementImage: adminProcedure
      .input(z.object({ dataUrl: z.string().min(32, "That file could not be read") }))
      .mutation(({ input }) => uploadImage(input.dataUrl)),
    createAchievement: adminProcedure.input(achievementSchema).mutation(async ({ input }) => {
      const id = await insertAchievement(achievementValues(input));
      return { success: true, id };
    }),
    updateAchievement: adminProcedure.input(achievementSchema.extend({ id: z.number() })).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const values = achievementValues(rest);
      // A replaced image leaves an orphan behind — remove it once the row points elsewhere.
      const previous = await getAchievement(id);
      await updateAchievement(id, values);
      const stale = ownedPublicId(previous?.imageUrl);
      if (stale && stale !== ownedPublicId(values.imageUrl)) await destroyImage(stale);
      return { success: true };
    }),
    deleteAchievement: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const existing = await getAchievement(input.id);
      await deleteAchievement(input.id);
      const owned = ownedPublicId(existing?.imageUrl);
      if (owned) await destroyImage(owned);
      return { success: true };
    }),
    // ── Announcements ────────────────────────────────────────────────────────
    announcements: adminProcedure.query(() => listAnnouncements()),
    saveAnnouncement: adminProcedure.input(announcementSchema.extend({ id: z.number().optional() })).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const values = announcementValues(rest);
      const targetId = id ?? (await insertAnnouncement(values));
      if (id) await updateAnnouncement(id, values);
      // One popup at a time: switching this on silences every other announcement.
      if (values.enabled) await setOnlyAnnouncementEnabled(targetId, true);
      return { success: true, id: targetId };
    }),
    setAnnouncementEnabled: adminProcedure.input(z.object({ id: z.number(), enabled: z.boolean() })).mutation(async ({ input }) => {
      await setOnlyAnnouncementEnabled(input.id, input.enabled);
      return { success: true };
    }),
    deleteAnnouncement: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAnnouncement(input.id);
      return { success: true };
    }),
    // ── Group schedule calendar ─────────────────────────────────────────────
    groupSessions: adminProcedure.query(() => listGroupSessions()),
    sessionExceptions: adminProcedure
      .input(z.object({ from: dateKeySchema, to: dateKeySchema }))
      .query(({ input }) => listSessionExceptions(input.from, input.to)),
    createGroupSession: adminProcedure.input(groupSessionSchema).mutation(async ({ input }) => {
      const id = await insertGroupSession(groupSessionValues(input));
      return { success: true, id };
    }),
    updateGroupSession: adminProcedure
      .input(updateGroupSessionSchema)
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await updateGroupSession(id, groupSessionValues(rest));
        return { success: true };
      }),
    deleteGroupSession: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteGroupSession(input.id);
      return { success: true };
    }),
    saveSessionException: adminProcedure.input(sessionExceptionSchema).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      // Omitted times inherit the series' own times, so "move it to next week"
      // only needs a new date.
      const [session] = await db
        .select()
        .from(groupSessions)
        .where(eq(groupSessions.id, input.sessionId))
        .limit(1);
      if (!session) throw new Error("That session no longer exists");
      const moveToDate = input.moveToDate?.trim() ? input.moveToDate.trim() : null;
      if (moveToDate === input.dateKey) {
        throw new Error("Pick a different date, or cancel this session instead");
      }
      const id = await insertSessionException({
        sessionId: input.sessionId,
        dateKey: input.dateKey,
        kind: input.kind,
        moveToDate,
        startTime: input.startTime?.trim() || session.startTime,
        endTime: input.endTime?.trim() || session.endTime,
      });
      return { success: true, id };
    }),
    deleteSessionException: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteSessionException(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
