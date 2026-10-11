import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isOwnerEmail } from "../db";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
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
