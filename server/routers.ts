import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, NOT_INSTRUCTOR_ERR_MSG } from "@shared/const";
import { normalizeWhatsAppGroupUrl } from "@shared/whatsapp";
import {
  IMAGE_VALIDATION_MESSAGE,
  PHONE_VALIDATION_MESSAGE,
  normalizePhone,
  validateImageSource,
  validateOptionalPhone,
  validatePhone,
} from "@shared/validation";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, instructorProcedure, isOwnerUser, leadAccessProcedure, ownerProcedure, publicProcedure, router, studentProcedure } from "./_core/trpc";
import { clearStudentSessionCookie, readStudentSessionFromRequest, setStudentSessionCookie, signStudentSession } from "./_core/studentSession";
import { getAdminAnalytics, getInstructorAnalytics, getStudentPerformance, resolveAnalyticsRange } from "./analytics";
import { notifyAdminAccessRequest } from "./_core/mailer";
import { checkRateLimit, rateLimitKey } from "./_core/password";
import { cloudinaryConfigurationStatus, destroyImage, ownedPublicId, uploadImage } from "./_core/cloudinary";
import { eq } from "drizzle-orm";
import { getDb, getStudentByCode, getStudentById, insertStudentWithCourses, listAchievements, listGroups, listStudents, createAccessCode, deleteAchievement, getAchievement, insertAchievement, updateAchievement, listAnnouncements, getActiveAnnouncement, insertAnnouncement, updateAnnouncement, setOnlyAnnouncementEnabled, deleteAnnouncement, listGroupSessions, insertGroupSession, updateGroupSession, deleteGroupSession, deleteSessionsForGroup, listSessionExceptions, insertSessionException, deleteSessionException, listAdminInvites, addAdminInvite, removeAdminInvite, isAllowedAdminEmail, listAccessRequests, upsertAccessRequest, approveAccessRequest, deleteAccessRequest, createPendingAccount, getCredentialByEmail, listInstructors, getInstructor, createInstructorAccount, updateInstructorById, deleteInstructorById, listInstructorGroups, getGroupDetailForInstructor, isSessionAuthorizedForInstructor, isStudentInGroup, upsertEvaluation, listEvaluations, listCourseOfferings, updateCourseOffering, upsertWaitingListRequest, listWaitingListRequests, updateWaitingListStatus, upsertRegistrationRequest, listRegistrationRequests, countPendingRegistrationRequests, updateRegistrationStatus, approveRegistrationRequest, setStudentLessonCompletion, recordQuizAttempt, getStudentLearningRecord, createAssignment, getAssignment, updateAssignment, listAssignmentsForGroup, listGroupSubmissions, getSubmissionWithAssignment, getAssignmentFile, listAssignmentsForStudent, upsertAssignmentSubmission, gradeAssignmentSubmission } from "./db";
import { findCourseLesson, gradeQuiz, type ServerCourse } from "./curriculum";
import { AssignmentFileError, validateAssignmentFile } from "./assignmentUpload";
import { notifyAdminRegistrationRequest } from "./_core/mailer";
import { groups, students, studentCourses, groupSessions } from "../drizzle/schema";
import {
  addLeadEmployee,
  canManageLead,
  convertLeadToStudent,
  createLeadRegistration,
  getLeadCountersForOverview,
  getLeadDetail,
  listLeadEmployees,
  listLeads,
  logLeadContact,
  removeLeadEmployee,
  resolveLeadActor,
  updateLead,
  updateLeadEmployee,
  updateLeadStatus,
} from "./leads";
import {
  kickLeadSync,
  reconcileLeadSync,
  retryLeadSync,
} from "./leadSync";
import { googleSheetsStatus } from "./googleSheets";
import { LEAD_STATUSES, NOT_INTERESTED_REASONS } from "@shared/leads";

const courseSchema = z.enum(["Scratch", "Robotics", "Web", "Python"]);
const PORTAL_MAX_ATTEMPTS = 30;

// ── Shared form validation ──────────────────────────────────────────────────

/**
 * The same phone rule the client uses: optional leading `+`, then 8–15 digits.
 * A blank required field still surfaces the one agreed message rather than a
 * misleading "required" that made a letters-only number look like a bug.
 */
const phoneSchema = z
  .string()
  .max(40)
  .refine(value => validatePhone(value).ok, {
    message: PHONE_VALIDATION_MESSAGE,
  })
  .transform(value => normalizePhone(value));

const optionalPhoneSchema = z
  .string()
  .max(40)
  .optional()
  .or(z.literal(""))
  .refine(value => validateOptionalPhone(value).ok, {
    message: PHONE_VALIDATION_MESSAGE,
  })
  .transform(value => normalizePhone(value));

const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .refine(value => validateImageSource(value).ok, {
    message: IMAGE_VALIDATION_MESSAGE,
  });

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

function isRealDateKey(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || year < 1900 || year > 2999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Analytics dates must be real calendar days, not just the right shape. */
const analyticsDateKeySchema = dateKeySchema.refine(
  isRealDateKey,
  "Pick a real date",
);

const analyticsRangeShape = {
  from: analyticsDateKeySchema.optional(),
  to: analyticsDateKeySchema.optional(),
};

const rangeIsOrdered = (value: { from?: string; to?: string }) =>
  !value.from || !value.to || value.from <= value.to;

const rangeMessage = {
  message: "The start date must be on or before the end date",
  path: ["to"],
};

const performanceHistoryShape = {
  ...analyticsRangeShape,
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).max(100_000).default(0),
};

const instructorAnalyticsSchema = z
  .object({
    ...analyticsRangeShape,
    course: courseSchema.optional(),
    groupId: z.number().int().positive().optional(),
  })
  .refine(rangeIsOrdered, rangeMessage);

const adminAnalyticsSchema = z
  .object({
    ...analyticsRangeShape,
    course: courseSchema.optional(),
    groupId: z.number().int().positive().optional(),
    instructorId: z.number().int().positive().optional(),
    studentId: z.number().int().positive().optional(),
    search: z.string().trim().max(120).optional(),
    page: z.number().int().min(1).max(10_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  })
  .refine(rangeIsOrdered, rangeMessage);

const instructorStudentPerformanceSchema = z
  .object({
    groupId: z.number().int().positive(),
    studentId: z.number().int().positive(),
    ...performanceHistoryShape,
  })
  .refine(rangeIsOrdered, rangeMessage);

const adminStudentPerformanceSchema = z
  .object({
    studentId: z.number().int().positive(),
    groupId: z.number().int().positive().optional(),
    instructorId: z.number().int().positive().optional(),
    ...performanceHistoryShape,
  })
  .refine(rangeIsOrdered, rangeMessage);

const studentPerformanceSchema = z
  .object(performanceHistoryShape)
  .refine(rangeIsOrdered, rangeMessage);

/**
 * The instructor form for the admin panel. The password is required on create
 * (it *is* the account) and optional on update, which is the same shape with
 * the refinement applied only by the routes that need it.
 */
const instructorFormSchema = z.object({
  name: z.string().trim().min(2, "Write the instructor's name").max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(320),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  phone: optionalPhoneSchema,
  title: z.string().trim().max(120).optional().or(z.literal("")),
});

/**
 * The calendar form. Split from the refinement below because Zod 4 refuses
 * `.extend()` on an already-refined schema, and the update route needs the same
 * fields plus an id. The instructor is picked from the existing roster only —
 * a session carries whoever teaches it, and that assignment is what makes the
 * group show up on the instructor's dashboard.
 */
const groupSessionFields = z.object({
  groupId: z.number().int().positive(),
  instructorId: z.number().int().positive().nullable().optional(),
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
    instructorId: input.instructorId ?? null,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    location: text(input.location),
    notes: text(input.notes),
  };
}

/**
 * A timetable slot may only point at a real, active instructor. The admin UI
 * offers exactly those, but the endpoint is what stops a crafted request from
 * writing an id that would leave the session with no teacher able to open it.
 */
async function assertAssignableInstructor(instructorId: number | null | undefined) {
  if (instructorId == null) return;
  const instructor = await getInstructor(instructorId);
  if (!instructor) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected instructor no longer exists",
    });
  }
  if (!instructor.active) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This instructor account is deactivated",
    });
  }
}

const groupFormSchema = z.object({
  name: z.string().trim().min(2, "Group name is too short").max(120),
  level: z.string().trim().max(80).optional().or(z.literal("")),
  scheduleDays: z.string().trim().max(200).optional().or(z.literal("")),
  scheduleTime: z.string().trim().max(80).optional().or(z.literal("")),
  whatsappUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

function groupValues(input: z.infer<typeof groupFormSchema>) {
  const link = normalizeWhatsAppGroupUrl(input.whatsappUrl);
  if (link.error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: link.error });
  }
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  };
  return {
    name: input.name,
    level: text(input.level),
    scheduleDays: text(input.scheduleDays),
    scheduleTime: text(input.scheduleTime),
    whatsappUrl: link.url,
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
  imageUrl: imageUrlSchema,
  tag: z.string().trim().max(60).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

/** Trimmed form fields, empty strings collapsed to null for the database. */
function achievementValues(input: z.infer<typeof achievementSchema>) {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  };
  const image = validateImageSource(input.imageUrl);
  if (!image.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: IMAGE_VALIDATION_MESSAGE });
  }
  return {
    title: text(input.title),
    description: input.description.trim(),
    achievedOn: text(input.achievedOn),
    imageUrl: image.value,
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

/** Public registration. The sibling phone is required only when that answer is yes. */
const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Write the student's full name").max(160),
    phone: phoneSchema,
    age: z.number().int().min(6, "Age must be between 6 and 17").max(17, "Age must be between 6 and 17"),
    address: z.string().trim().min(2, "Write the address").max(500),
    school: z.string().trim().min(2, "Write the school").max(200),
    parentEmail: z.string().trim().toLowerCase().email("Enter a valid email").max(320),
    parentPhone: phoneSchema,
    course: courseSchema,
    gender: z.enum(["male", "female"], { message: "Choose the gender" }),
    siblingRegistered: z.boolean(),
    siblingName: z.string().trim().max(160).optional().or(z.literal("")),
    siblingPhone: optionalPhoneSchema,
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine(
    value =>
      !value.siblingRegistered ||
      (Boolean(value.siblingName?.trim()) && validatePhone(value.siblingPhone).ok),
    { message: "Add the sibling's name and a valid phone number", path: ["siblingPhone"] },
  );

// ── Leads dashboard inputs ──────────────────────────────────────────────────
const leadStatusSchema = z.enum(LEAD_STATUSES);
const leadCourseSchema = courseSchema;

const leadDateInput = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine(value => !Number.isNaN(new Date(value).getTime()), "موعد غير صالح")
  .transform(value => new Date(value));

const nullableLeadDateInput = z.union([leadDateInput, z.null()]).optional();

const leadListSchema = z
  .object({
    search: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(40).optional(),
    status: leadStatusSchema.optional(),
    course: leadCourseSchema.optional(),
    from: analyticsDateKeySchema.optional(),
    to: analyticsDateKeySchema.optional(),
    assignedEmployeeId: z.number().int().positive().optional(),
    mine: z.boolean().optional(),
    overdueOnly: z.boolean().optional(),
    page: z.number().int().min(1).max(10_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  })
  .refine(rangeIsOrdered, rangeMessage);

const leadStatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: leadStatusSchema,
  nextFollowUpDate: nullableLeadDateInput,
  notInterestedReason: z.enum(NOT_INTERESTED_REASONS).nullable().optional(),
  notInterestedNote: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

const leadUpdateSchema = z.object({
  id: z.number().int().positive(),
  internalNotes: z.string().max(10_000).nullable().optional(),
  nextFollowUpDate: nullableLeadDateInput,
  assignedEmployeeId: z.number().int().positive().nullable().optional(),
  whatsAppOptOut: z.boolean().optional(),
  customerNotes: z.string().max(10_000).nullable().optional(),
});

const leadContactSchema = z.object({
  id: z.number().int().positive(),
  note: z.string().trim().max(2000).nullable().optional(),
  nextFollowUpDate: nullableLeadDateInput,
});

const waitingListSchema = z.object({
  course: courseSchema,
  name: z.string().trim().min(2, "Write your name").max(160),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(320).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const courseStatusSchema = z.enum(["live", "coming_soon", "waiting_list"]);

const assignmentFields = z.object({
  groupId: z.number().int().positive(),
  course: courseSchema,
  sessionId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2, "Write a title").max(200),
  instructions: z.string().trim().min(10, "Write the assignment instructions").max(10_000),
  // ISO datetime-local from the form; empty means "no deadline".
  dueAt: z.string().trim().max(40).optional().or(z.literal("")),
  maxGrade: z.number().int().min(1).max(1000).default(100),
});

const assignmentSubmissionSchema = z.object({
  assignmentId: z.number().int().positive(),
  textResponse: z.string().trim().max(20_000).optional().or(z.literal("")),
  codeResponse: z.string().trim().max(50_000).optional().or(z.literal("")),
  file: z
    .object({
      name: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(3).max(120),
      // Base64 only; the server recalculates the decoded byte length.
      dataBase64: z.string().min(1).max(12_000_000),
    })
    .nullable()
    .optional(),
});

const gradeSchema = z.object({
  submissionId: z.number().int().positive(),
  grade: z.number().int().min(0).max(1000),
  feedback: z.string().trim().max(4000).optional().or(z.literal("")),
});

const quizSubmissionSchema = z.object({
  course: z.enum(["Scratch", "Web", "Python"]),
  lessonId: z.string().trim().min(1).max(64),
  answers: z.array(z.number().int().min(-1).max(50)).max(100),
});

const lessonCompletionSchema = z.object({
  course: z.enum(["Scratch", "Web", "Python"]),
  lessonId: z.string().trim().min(1).max(64),
  completed: z.boolean(),
});

function parseDueAt(value: string | undefined): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a valid due date" });
  }
  return date;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    // `isOwner` rides along so the panel can decide whether to show the admin
    // roster tab. It is only ever true for the single account pinned in the
    // environment, so an invited admin reads `false` and never learns more.
    me: publicProcedure.query(async opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      const leadActor = await resolveLeadActor(user);
      return {
        ...user,
        isOwner: isOwnerUser(user),
        leadAccess: leadActor.leadAccess,
        canConvertLeads: leadActor.canConvert,
      };
    }),
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
    //
    // On success the code is exchanged for a short-lived signed HttpOnly cookie.
    // Personal evaluations are then read through `portal.performance` without
    // sending the code again.
    byCode: publicProcedure
      .input(z.object({ accessCode: z.string().min(4) }))
      .query(async ({ input, ctx }) => {
        if (!checkRateLimit(rateLimitKey(ctx.req, "portal"), PORTAL_MAX_ATTEMPTS)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many lookups. Wait a moment and try again.",
          });
        }
        const student = await getStudentByCode(input.accessCode);
        if (student) {
          const token = await signStudentSession(student.id);
          setStudentSessionCookie(ctx.req, ctx.res, token);
        }
        return student;
      }),
    // Lets the portal restore a valid session on reload without re-entering the
    // code. Returns null rather than an error so the login screen stays calm.
    session: publicProcedure.query(async ({ ctx }) => {
      const studentId = await readStudentSessionFromRequest(ctx.req);
      if (!studentId) return null;
      return getStudentById(studentId, { activeOnly: true });
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearStudentSessionCookie(ctx.req, ctx.res);
      return { success: true } as const;
    }),
    // The student id comes from the signed cookie, never from the input.
    performance: studentProcedure
      .input(studentPerformanceSchema)
      .query(async ({ input, ctx }) => {
        const range = resolveAnalyticsRange(input.from, input.to);
        const result = await getStudentPerformance({
          studentId: ctx.student.id,
          from: range.from,
          to: range.to,
          historyLimit: input.limit,
          historyOffset: input.offset,
        });
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That student is no longer available",
          });
        }
        return result;
      }),
    // Server-side learning record used to hydrate the portal after reload and to
    // show progress in the performance report. The student id is the cookie's.
    learning: studentProcedure.query(async ({ ctx }) => {
      const record = await getStudentLearningRecord(ctx.student.id);
      return {
        completed: record.progress
          .filter(row => row.progress.status === "completed")
          .map(row => ({
            course: row.curriculum?.course ?? null,
            lessonId: row.progress.lessonId,
            completedAt: row.progress.completedAt,
          })),
        quizzes: record.quizzes.map(row => ({
          id: row.id,
          course: row.course,
          lessonId: row.lessonId,
          score: row.score,
          total: row.total,
          submittedAt: row.submittedAt,
        })),
      };
    }),
    setLessonComplete: studentProcedure
      .input(lessonCompletionSchema)
      .mutation(async ({ input, ctx }) => {
        if (!ctx.student.courses.includes(input.course)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This course is not enrolled for this student.",
          });
        }
        if (!findCourseLesson(input.course as ServerCourse, input.lessonId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That lesson does not exist" });
        }
        await setStudentLessonCompletion({
          // Never trust a student id from the browser: this is the signed
          // cookie's id, re-read from the database by studentProcedure.
          studentId: ctx.student.id,
          course: input.course,
          lessonId: input.lessonId,
          completed: input.completed,
        });
        return { success: true, completed: input.completed } as const;
      }),
    submitQuiz: studentProcedure
      .input(quizSubmissionSchema)
      .mutation(async ({ input, ctx }) => {
        if (!ctx.student.courses.includes(input.course)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This course is not enrolled for this student.",
          });
        }
        // The score is calculated from the server's own answer key. The client
        // only sends the option indexes it selected.
        const graded = gradeQuiz(input.course as ServerCourse, input.lessonId, input.answers);
        if (!graded) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That quiz does not exist" });
        }
        await recordQuizAttempt({
          studentId: ctx.student.id,
          course: input.course,
          lessonId: input.lessonId,
          score: graded.score,
          total: graded.total,
          answers: input.answers,
        });
        // Preserve the portal's existing behaviour: a quiz with at least one
        // correct answer completes the session. Repeated submissions simply add
        // another historical attempt.
        let completed = false;
        if (graded.score > 0) {
          await setStudentLessonCompletion({
            studentId: ctx.student.id,
            course: input.course,
            lessonId: input.lessonId,
            completed: true,
          });
          completed = true;
        }
        return {
          success: true,
          score: graded.score,
          total: graded.total,
          completed,
        } as const;
      }),
    assignments: studentProcedure.query(async ({ ctx }) => {
      const rows = await listAssignmentsForStudent({
        id: ctx.student.id,
        groupId: ctx.student.groupId,
        courses: ctx.student.courses,
      });
      return rows.map(row => ({
        assignment: row.assignment,
        submission: row.submission
          ? {
              id: row.submission.id,
              status: row.submission.status,
              late: row.submission.late,
              grade: row.submission.grade,
              feedback: row.submission.feedback,
              submittedAt: row.submission.submittedAt,
              textResponse: row.submission.textResponse,
              codeResponse: row.submission.codeResponse,
              fileId: row.fileId,
              fileName: row.fileName,
            }
          : null,
      }));
    }),
    submitAssignment: studentProcedure
      .input(assignmentSubmissionSchema)
      .mutation(async ({ input, ctx }) => {
        const rows = await listAssignmentsForStudent({
          id: ctx.student.id,
          groupId: ctx.student.groupId,
          courses: ctx.student.courses,
        });
        const match = rows.find(row => row.assignment.id === input.assignmentId);
        if (!match) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This assignment is not available to this student.",
          });
        }
        const hasText = Boolean(input.textResponse?.trim());
        const hasCode = Boolean(input.codeResponse?.trim());
        if (!hasText && !hasCode && !input.file) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Write an answer, add code, or attach a file before submitting.",
          });
        }
        let file: ReturnType<typeof validateAssignmentFile> | null = null;
        if (input.file) {
          try {
            file = validateAssignmentFile(input.file);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                error instanceof AssignmentFileError
                  ? error.message
                  : "That file could not be accepted.",
            });
          }
        }
        const dueAt = match.assignment.dueAt;
        const late = Boolean(dueAt && Date.now() > new Date(dueAt).getTime());
        try {
          const submissionId = await upsertAssignmentSubmission({
            assignmentId: input.assignmentId,
            studentId: ctx.student.id,
            textResponse: input.textResponse,
            codeResponse: input.codeResponse,
            late,
            file: file
              ? {
                  originalName: file.originalName,
                  mimeType: file.mimeType,
                  size: file.size,
                  dataBase64: file.dataBase64,
                }
              : null,
          });
          return { success: true, submissionId, late } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "The submission could not be saved",
          });
        }
      }),
  }),
  site: router({
    // Read by the home page. No auth: these are the academy's public results.
    achievements: publicProcedure.query(() => listAchievements()),
    // The site popup. Null whenever no announcement is switched on, which is what
    // keeps the home page clean.
    announcement: publicProcedure.query(() => getActiveAnnouncement()),
    // The one authoritative course catalogue. Admin and public both read this.
    courses: publicProcedure.query(async () => {
      const rows = await listCourseOfferings();
      return rows.map(row => ({
        course: row.course,
        status: row.status,
        updatedAt: row.updatedAt,
      }));
    }),
    // A parent's registration is stored before WhatsApp is offered. Re-submitting
    // the same child + course is idempotent, so a retry cannot create duplicates.
    submitRegistration: publicProcedure
      .input(registrationSchema)
      .mutation(async ({ input, ctx }) => {
        if (!checkRateLimit(rateLimitKey(ctx.req, "registration"), 5)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many registration requests. Try again in a little while.",
          });
        }
        const { lead, duplicate, duplicateMessage } =
          await createLeadRegistration({
            fullName: input.fullName,
            phone: input.phone,
            age: input.age,
            address: input.address,
            school: input.school,
            parentEmail: input.parentEmail,
            parentPhone: input.parentPhone,
            course: input.course,
            gender: input.gender,
            siblingRegistered: input.siblingRegistered,
            siblingName: input.siblingName,
            siblingPhone: input.siblingPhone,
            notes: input.notes,
          });
        // Only a genuinely new request notifies the academy; a retry does not
        // spam the inbox. The database row is already committed at this point.
        const delivered = duplicate
          ? []
          : await notifyAdminRegistrationRequest({
              fullName: lead.fullName,
              phone: lead.studentPhone,
              course: lead.course,
              parentEmail: lead.parentEmail,
            });
        // Google Sheets is a reporting copy. Enqueueing happened in the same
        // transaction; this only nudges the durable worker.
        kickLeadSync();
        return {
          success: true,
          id: lead.id,
          duplicate,
          duplicateMessage,
          notified: delivered.some(Boolean),
          status: lead.status,
          syncStatus: lead.googleSheetSyncStatus,
        } as const;
      }),
    joinWaitingList: publicProcedure
      .input(waitingListSchema)
      .mutation(async ({ input, ctx }) => {
        if (!checkRateLimit(rateLimitKey(ctx.req, "waiting-list"), 8)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Try again in a little while.",
          });
        }
        const result = await upsertWaitingListRequest({
          course: input.course,
          name: input.name,
          phone: input.phone,
          email: input.email,
          note: input.note,
        });
        return { success: true, id: result.id, duplicate: result.duplicate } as const;
      }),
    // Open to anyone, but rate limited so the endpoint cannot be used to spray
    // the owner's inbox or to grind through password hashes. The request is saved
    // whether or not the email goes out.
    requestAccess: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().trim().max(120).optional().or(z.literal("")),
        password: z.string().min(8, "Use at least 8 characters").max(200),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.trim().toLowerCase();
        const key = rateLimitKey(ctx.req, `access:${email}`);
        if (!checkRateLimit(key)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Try again in a few minutes." });
        }
        // Already allowed? Nothing to ask for, and no reason to email the owner.
        if (await isAllowedAdminEmail(email)) {
          throw new TRPCError({ code: "CONFLICT", message: "This email already has admin access." });
        }
        // An address that already signed up keeps the password it signed up with.
        // Overwriting it here would quietly hand the owner the ability to sign in
        // as that person, so a duplicate request is recorded and left alone.
        const existingCredential = await getCredentialByEmail(email);
        if (!existingCredential) {
          await createPendingAccount({ email, name: input.name, password: input.password });
        }

        const request = await upsertAccessRequest({
          email,
          name: input.name,
        });
        const delivered = await notifyAdminAccessRequest({
          email: request!.email,
          name: request!.name,
        });

        return {
          success: true,
          // The panel shows the request either way, so this only changes the
          // wording the visitor sees, never whether the request was recorded.
          notified: delivered.some(Boolean),
        } as const;
      }),
  }),
  admin: router({
    stats: adminProcedure.query(async () => {
      const [studentRows, groupRows, leadCounters] = await Promise.all([
        listStudents(),
        listGroups(),
        getLeadCountersForOverview(),
      ]);
      return {
        students: studentRows.length,
        groups: groupRows.length,
        active: studentRows.filter(s => s.status === "active").length,
        // `registrationPending` is kept for older screens; it now counts the
        // real lead pipeline rather than the legacy request table.
        registrationPending: leadCounters.new,
        newLeads: leadCounters.new,
        overdueLeads: leadCounters.overdue,
        leadCounters,
      };
    }),
    students: adminProcedure.query(() => listStudents()),
    groups: adminProcedure.query(() => listGroups()),
    // Academy-wide performance. One server-side loader returns the overview,
    // timeline, group/instructor/course breakdowns and a paginated student
    // table; the browser never computes the authoritative numbers.
    analytics: adminProcedure
      .input(adminAnalyticsSchema)
      .query(({ input }) => getAdminAnalytics(input)),
    studentPerformance: adminProcedure
      .input(adminStudentPerformanceSchema)
      .query(async ({ input }) => {
        const range = resolveAnalyticsRange(input.from, input.to);
        const result = await getStudentPerformance({
          studentId: input.studentId,
          from: range.from,
          to: range.to,
          groupId: input.groupId ?? null,
          instructorId: input.instructorId ?? null,
          historyLimit: input.limit,
          historyOffset: input.offset,
        });
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That student no longer exists",
          });
        }
        return result;
      }),
    // ── قائمة المسموح لهم بالدخول على اللوحة ─────────────────────────────────
    // Owner-only: these four are what reveal who holds access and who is waiting
    // for it, so an invited admin gets the same FORBIDDEN a stranger would.
    admins: ownerProcedure.query(() => listAdminInvites()),
    accessRequests: ownerProcedure.query(() => listAccessRequests()),
    addAdmin: ownerProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input, ctx }) => {
      await addAdminInvite(input.email, ctx.user?.email ?? null);
      return { success: true };
    }),
    removeAdmin: ownerProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      await removeAdminInvite(input.email);
      return { success: true };
    }),
    // Approving from the queue grants the invite and removes the request in one go.
    approveAccess: ownerProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input, ctx }) => {
      await approveAccessRequest(input.email, ctx.user?.email ?? null);
      return { success: true };
    }),
    dismissAccess: ownerProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      await deleteAccessRequest(input.email);
      return { success: true };
    }),
    createGroup: adminProcedure.input(groupFormSchema).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(groups).values(groupValues(input)); return { success: true };
    }),
    /** Finds a group by the name the admin typed, creating it when it is new. */
    ensureGroup: adminProcedure.input(z.object({ name: z.string().trim().min(2, "Group name is too short").max(120) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const name = input.name.trim();
      const [existing] = await db.select().from(groups).where(eq(groups.name, name)).limit(1);
      if (existing) return { id: existing.id, created: false };
      const result = await db.insert(groups).values({ name });
      return { id: Number(result[0].insertId), created: true };
    }),
    updateGroup: adminProcedure.input(groupFormSchema.extend({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(groups).set(groupValues(input)).where(eq(groups.id, input.id)); return { success: true };
    }),
    deleteGroup: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ groupId: null }).where(eq(students.groupId, input.id));
      // The calendar rows and their one-off exceptions have nowhere to point now.
      await deleteSessionsForGroup(input.id);
      await db.delete(groups).where(eq(groups.id, input.id)); return { success: true };
    }),
    createStudent: adminProcedure.input(z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: phoneSchema, groupId: z.number().nullable().optional(), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const accessCode = await createAccessCode();
      await db.transaction(tx =>
        insertStudentWithCourses(tx, {
          name: input.name,
          email: input.email || null,
          phone: input.phone,
          groupId: input.groupId ?? null,
          courses: input.courses,
        }, accessCode),
      );
      return { success: true, accessCode };
    }),
    updateStudent: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: phoneSchema, groupId: z.number().nullable().optional(), status: z.enum(["active", "paused"]), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ name: input.name, email: input.email || null, phone: input.phone, groupId: input.groupId ?? null, status: input.status }).where(eq(students.id, input.id));
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.insert(studentCourses).values(input.courses.map(course => ({ studentId: input.id, course })));
      return { success: true };
    }),
    deleteStudent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.delete(students).where(eq(students.id, input.id)); return { success: true };
    }),
    // ── Course availability ─────────────────────────────────────────────────
    courseOfferings: adminProcedure.query(() => listCourseOfferings()),
    updateCourseStatus: adminProcedure
      .input(z.object({ course: courseSchema, status: courseStatusSchema }))
      .mutation(async ({ input }) => {
        await updateCourseOffering(input.course, input.status);
        return { success: true };
      }),
    // ── Registration requests + waiting list ────────────────────────────────
    registrationRequests: adminProcedure
      .input(z.object({ status: z.enum(["pending", "contacted", "approved", "rejected"]).optional() }).optional())
      .query(({ input }) => listRegistrationRequests(input?.status ?? null)),
    updateRegistrationStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "contacted", "approved", "rejected"]) }))
      .mutation(async ({ input, ctx }) => {
        await updateRegistrationStatus(input.id, input.status, ctx.user?.id ?? null);
        return { success: true };
      }),
    approveRegistration: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return { success: true, ...(await approveRegistrationRequest(input.id, ctx.user?.id ?? null)) };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "The request could not be approved",
          });
        }
      }),
    waitingList: adminProcedure.query(() => listWaitingListRequests()),
    updateWaitingListStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "contacted", "enrolled"]) }))
      .mutation(async ({ input }) => {
        await updateWaitingListStatus(input.id, input.status);
        return { success: true };
      }),
    // ── Achievements ─────────────────────────────────────────────────────────
    achievements: adminProcedure.query(() => listAchievements()),
    uploadConfigured: adminProcedure.query(() => cloudinaryConfigurationStatus()),
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
      await assertAssignableInstructor(input.instructorId);
      const id = await insertGroupSession(groupSessionValues(input));
      return { success: true, id };
    }),
    updateGroupSession: adminProcedure
      .input(updateGroupSessionSchema)
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await assertAssignableInstructor(input.instructorId);
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
    // ── Instructors ──────────────────────────────────────────────────────────
    // Creating an instructor provisions the account as well — the response
    // carries nothing but ids; the password the admin chose is never returned.
    instructors: adminProcedure.query(() => listInstructors()),
    createInstructor: adminProcedure
      .input(instructorFormSchema)
      .mutation(async ({ input }) => {
        let id: number;
        try {
          id = await createInstructorAccount(input);
        } catch (error) {
          // The known duplicates read as form errors, everything else as a
          // genuine failure — but either way the caller sees one message.
          throw error instanceof Error ? error : new Error("Could not create the instructor");
        }
        return { success: true, id };
      }),
    updateInstructor: adminProcedure
      .input(
        instructorFormSchema
          .extend({ id: z.number().int().positive() })
          // Editing allows leaving the password untouched, and the panel's
          // activate/deactivate switch uses the same route.
          .extend({
            password: z.string().min(8, "Use at least 8 characters").max(200).optional().or(z.literal("")),
            active: z.boolean().optional(),
          }),
      )
      .mutation(async ({ input }) => {
        const { id, password, active, email, name, phone, title } = input;
        try {
          await updateInstructorById(id, {
            name,
            email,
            phone: phone ?? null,
            title: title ?? null,
            active,
            password: password ? password : undefined,
          });
        } catch (error) {
          throw error instanceof Error ? error : new Error("Could not update the instructor");
        }
        return { success: true };
      }),
    deleteInstructor: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteInstructorById(input.id);
      return { success: true };
    }),
  }),
  // ── لوحة المدرّب ─────────────────────────────────────────────────────────
  // Every route resolves groups through the timetable: the instructor sees
  // exactly the groups whose session slots carry their `instructorId`, and
  // writes evaluations only into sessions the rules above authorize.
  // ── Leads workspace (Phase 1) ─────────────────────────────────────────────
  // Admin + explicitly authorized reception staff only. Every mutation re-reads
  // the lead and checks the actor again; hiding a button is never the gate.
  leads: router({
    list: leadAccessProcedure
      .input(leadListSchema)
      .query(({ input, ctx }) =>
        listLeads({
          search: input.search,
          phone: input.phone,
          status: input.status,
          course: input.course,
          from: input.from,
          to: input.to,
          assignedEmployeeId: input.assignedEmployeeId,
          mineUserId: input.mine ? ctx.leadActor.userId : undefined,
          overdueOnly: input.overdueOnly,
          page: input.page,
          pageSize: input.pageSize,
        }),
      ),
    detail: leadAccessProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const detail = await getLeadDetail(input.id);
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        return detail;
      }),
    employees: leadAccessProcedure.query(() => listLeadEmployees()),
    updateStatus: leadAccessProcedure
      .input(leadStatusUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        const current = await getLeadDetail(input.id);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        if (!canManageLead(ctx.leadActor, current)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذا العميل مسند لموظف آخر، ولا يمكنك تغييره",
          });
        }
        try {
          const detail = await updateLeadStatus(ctx.leadActor, input);
          kickLeadSync();
          return detail;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "تعذر تحديث الحالة",
          });
        }
      }),
    update: leadAccessProcedure
      .input(leadUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        const current = await getLeadDetail(input.id);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        if (!canManageLead(ctx.leadActor, current)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذا العميل مسند لموظف آخر، ولا يمكنك تعديله",
          });
        }
        try {
          const detail = await updateLead(ctx.leadActor, input);
          kickLeadSync();
          return detail;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "تعذر تحديث العميل",
          });
        }
      }),
    logContact: leadAccessProcedure
      .input(leadContactSchema)
      .mutation(async ({ input, ctx }) => {
        const current = await getLeadDetail(input.id);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        if (!canManageLead(ctx.leadActor, current)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذا العميل مسند لموظف آخر، ولا يمكنك تسجيل تواصل عليه",
          });
        }
        try {
          const detail = await logLeadContact(ctx.leadActor, input);
          kickLeadSync();
          return detail;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "تعذر تسجيل التواصل",
          });
        }
      }),
    convert: leadAccessProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getLeadDetail(input.id);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        if (!canManageLead(ctx.leadActor, current)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "هذا العميل مسند لموظف آخر، ولا يمكنك تحويله",
          });
        }
        if (!ctx.leadActor.canConvert) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "ليس لديك صلاحية تحويل العملاء إلى طلاب",
          });
        }
        try {
          const result = await convertLeadToStudent(ctx.leadActor, input.id);
          kickLeadSync();
          return result;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "تعذر تحويل العميل",
          });
        }
      }),
    syncConfig: adminProcedure.query(() => googleSheetsStatus()),
    retrySync: leadAccessProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getLeadDetail(input.id);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "هذا العميل غير موجود" });
        }
        if (!canManageLead(ctx.leadActor, current)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لا يمكنك إعادة مزامنة عميل مسند لموظف آخر",
          });
        }
        return retryLeadSync(input.id);
      }),
    reconcileSync: adminProcedure.mutation(() => reconcileLeadSync()),
    addEmployee: adminProcedure
      .input(
        z.object({
          email: z.string().trim().toLowerCase().email("اكتب بريداً إلكترونياً صحيحاً"),
          canConvert: z.boolean().default(false),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await addLeadEmployee({
            email: input.email,
            canConvert: input.canConvert,
            createdBy: ctx.user?.id ?? 0,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "تعذر إضافة الموظف",
          });
        }
      }),
    updateEmployee: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          active: z.boolean().optional(),
          canConvert: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        return updateLeadEmployee(id, rest);
      }),
    removeEmployee: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => removeLeadEmployee(input.id)),
  }),
  instructor: router({
    me: instructorProcedure.query(({ ctx }) => ({
      id: ctx.instructor.id,
      userId: ctx.instructor.userId,
      name: ctx.instructor.name,
      email: ctx.instructor.email,
      phone: ctx.instructor.phone,
      title: ctx.instructor.title,
    })),
    groups: instructorProcedure.query(({ ctx }) => listInstructorGroups(ctx.instructor.id)),
    // Assignments for one of the instructor's groups, with every submission and
    // the student's name. No slot in the group means no data.
    assignments: instructorProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, input.groupId);
        if (!detail) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        const [assignmentRows, submissionRows] = await Promise.all([
          listAssignmentsForGroup(input.groupId),
          listGroupSubmissions(input.groupId),
        ]);
        return {
          assignments: assignmentRows.map(assignment => ({
            ...assignment,
            submissions: submissionRows
              .filter(row => row.submission.assignmentId === assignment.id)
              .map(row => ({
                ...row.submission,
                studentName: row.studentName,
                fileId: row.fileId,
                fileName: row.fileName,
              })),
          })),
        };
      }),
    createAssignment: instructorProcedure
      .input(assignmentFields)
      .mutation(async ({ input, ctx }) => {
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, input.groupId);
        if (!detail) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        if (input.sessionId != null && !detail.sessions.some(session => session.id === input.sessionId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That session does not belong to this group" });
        }
        const id = await createAssignment({
          groupId: input.groupId,
          course: input.course,
          sessionId: input.sessionId ?? null,
          title: input.title,
          instructions: input.instructions,
          dueAt: parseDueAt(input.dueAt),
          maxGrade: input.maxGrade,
          createdBy: ctx.user?.id ?? null,
        });
        return { success: true, id };
      }),
    updateAssignment: instructorProcedure
      .input(assignmentFields.extend({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, input.groupId);
        if (!detail) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        const existing = await getAssignment(input.id);
        if (!existing || existing.groupId !== input.groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That assignment no longer exists" });
        }
        if (input.sessionId != null && !detail.sessions.some(session => session.id === input.sessionId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That session does not belong to this group" });
        }
        await updateAssignment(input.id, {
          title: input.title,
          instructions: input.instructions,
          dueAt: parseDueAt(input.dueAt),
          maxGrade: input.maxGrade,
        });
        return { success: true };
      }),
    gradeSubmission: instructorProcedure
      .input(gradeSchema)
      .mutation(async ({ input, ctx }) => {
        const row = await getSubmissionWithAssignment(input.submissionId);
        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That submission no longer exists" });
        }
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, row.assignment.groupId);
        if (!detail) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        if (input.grade > row.assignment.maxGrade) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `The grade cannot exceed ${row.assignment.maxGrade}`,
          });
        }
        await gradeAssignmentSubmission({
          submissionId: input.submissionId,
          grade: input.grade,
          feedback: input.feedback,
          gradedBy: ctx.user?.id ?? null,
        });
        return { success: true };
      }),
    // The instructor's own analytics. A supplied group id goes through the same
    // ownership check as `groupDetail`; without one the loader derives the
    // group set from the caller's timetable slots.
    analytics: instructorProcedure
      .input(instructorAnalyticsSchema)
      .query(async ({ input, ctx }) => {
        if (input.groupId != null) {
          const detail = await getGroupDetailForInstructor(
            ctx.instructor.id,
            input.groupId,
          );
          if (!detail) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: NOT_INSTRUCTOR_ERR_MSG,
            });
          }
        }
        return getInstructorAnalytics(ctx.instructor.id, input);
      }),
    studentPerformance: instructorProcedure
      .input(instructorStudentPerformanceSchema)
      .query(async ({ input, ctx }) => {
        const detail = await getGroupDetailForInstructor(
          ctx.instructor.id,
          input.groupId,
        );
        if (!detail) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: NOT_INSTRUCTOR_ERR_MSG,
          });
        }
        const student = detail.students.find(
          entry => entry.id === input.studentId,
        );
        if (!student) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: NOT_INSTRUCTOR_ERR_MSG,
          });
        }
        const range = resolveAnalyticsRange(input.from, input.to);
        const result = await getStudentPerformance({
          studentId: input.studentId,
          from: range.from,
          to: range.to,
          groupId: input.groupId,
          historyLimit: input.limit,
          historyOffset: input.offset,
        });
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That student no longer exists",
          });
        }
        return result;
      }),
    groupDetail: instructorProcedure
      .input(z.object({ groupId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, input.groupId);
        if (!detail) {
          // The same refusal for a group that does not exist and one that is
          // not theirs — probing ids learns nothing.
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        return detail;
      }),
    evaluations: instructorProcedure
      .input(
        z.object({
          groupId: z.number().int().positive(),
          studentId: z.number().int().positive().optional(),
        }),
      )
      .query(async ({ input, ctx }) => {
        // Same ownership rule as groupDetail: no slot in the group, no history.
        const detail = await getGroupDetailForInstructor(ctx.instructor.id, input.groupId);
        if (!detail) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        return listEvaluations({ groupId: input.groupId, studentId: input.studentId ?? null });
      }),
    saveEvaluation: instructorProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          studentId: z.number().int().positive(),
          dateKey: dateKeySchema,
          attendance: z.enum(["present", "absent"]).nullable().optional(),
          homework: z.enum(["completed", "not_completed"]).nullable().optional(),
          focus: z.number().int().min(1).max(5).nullable().optional(),
          participation: z.number().int().min(1).max(5).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const authorized = await isSessionAuthorizedForInstructor(ctx.instructor.id, input.sessionId);
        if (!authorized) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const rows = await db.select().from(groupSessions).where(eq(groupSessions.id, input.sessionId)).limit(1);
        const session = rows[0];
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "That session no longer exists" });
        const inGroup = await isStudentInGroup(input.studentId, session.groupId);
        if (!inGroup) {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
        }
        const evaluation = await upsertEvaluation({
          studentId: input.studentId,
          sessionId: input.sessionId,
          dateKey: input.dateKey,
          attendance: input.attendance ?? null,
          homework: input.homework ?? null,
          focus: input.focus ?? null,
          participation: input.participation ?? null,
          notes: input.notes ?? null,
          // The middleware guarantees a signed-in account; `?? null` only keeps
          // the type-checker honest without ever shifting the value.
          recordedBy: ctx.user?.id ?? null,
        });
        return { success: true, evaluation };
      }),
  }),
});

export type AppRouter = typeof appRouter;
