import { NOT_ADMIN_ERR_MSG, NOT_INSTRUCTOR_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TrpcContext } from "./context";
import { getInstructorByUserId, getStudentById, isOwnerEmail, type Instructor } from "../db";
import { resolveLeadActor, type LeadActor } from "../leads";
import { readStudentSessionFromRequest } from "./studentSession";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  /**
   * Zod's message is a JSON array of issues. Forms should show the human
   * sentence, so the first issue's message is promoted to `message` while the
   * original structured error remains available to clients that want it.
   */
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) {
      const first = error.cause.issues[0];
      if (first?.message) return { ...shape, message: first.message };
    }
    // tRPC also stringifies some Zod issues into the message before this hook
    // sees a cause; recover the first human sentence in that shape too.
    const raw = error.message?.trim() ?? "";
    if (raw.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const first = parsed.find(
            item => item && typeof item === "object" && "message" in item,
          ) as { message?: unknown } | undefined;
          if (typeof first?.message === "string") {
            return { ...shape, message: first.message };
          }
        }
      } catch {
        /* not a Zod issue array — leave the original message */
      }
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * The leads workspace gate. Admins always pass. A reception employee passes
 * only while an active `academy_lead_staff` row points at their existing
 * account; trainers and students never do unless an admin explicitly grants
 * that account access. The actor is resolved on every request, so deactivating
 * an employee closes the workspace immediately.
 */
export const leadAccessProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const actor = await resolveLeadActor(ctx.user);
    if (!actor.leadAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: { ...ctx, user: ctx.user, leadActor: actor } as typeof ctx & {
        leadActor: LeadActor;
      },
    });
  }),
);

/**
 * The owner is the single account pinned in the environment — `OWNER_EMAIL`, or
 * `OWNER_OPEN_ID` when there is no address to go by. Admins invited through the
 * panel are teammates, not the owner, so this is deliberately narrower than
 * `adminProcedure`: it is what guards the admin roster and the access queue.
 */
export function isOwnerUser(
  user: { openId: string; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (isOwnerEmail(user.email)) return true;
  return Boolean(ENV.ownerOpenId) && user.openId === ENV.ownerOpenId;
}

export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin" || !isOwnerUser(ctx.user)) {
      // The same error as a non-admin gets, so probing these endpoints tells an
      // invited admin nothing about the roster or who the owner is.
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * The instructor dashboard's gate. Two layers, both server-side: the account
 * must carry the instructor role, and a live `academy_instructors` profile must
 * point at it and be active — deactivating or deleting the profile closes the
 * dashboard immediately, on the next request, without waiting for a refresh.
 */
export const instructorProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "instructor") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
    }
    const instructor = await getInstructorByUserId(ctx.user.id);
    if (!instructor || !instructor.active) {
      // Deactivated and missing read identically, so probing tells a former
      // instructor their profile still exists somewhere.
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_INSTRUCTOR_ERR_MSG });
    }

    return next({ ctx: { ...ctx, instructor } as typeof ctx & { instructor: Instructor } });
  }),
);

export type StudentSessionProfile = NonNullable<
  Awaited<ReturnType<typeof getStudentById>>
>;

/**
 * The student portal's personal-data gate. It reads the signed HttpOnly cookie
 * issued after an access-code lookup, then re-loads the student from the
 * database on every request. A paused/deleted student or a forged token gets the
 * same UNAUTHORIZED response. No endpoint accepts a student id from the caller.
 */
export const studentProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const studentId = await readStudentSessionFromRequest(ctx.req);
    if (!studentId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Student session expired. Enter your access code again.",
      });
    }
    const student = await getStudentById(studentId, { activeOnly: true });
    if (!student) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Student session expired. Enter your access code again.",
      });
    }
    return next({
      ctx: { ...ctx, student } as typeof ctx & {
        student: StudentSessionProfile;
      },
    });
  }),
);
