import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

const OWNER_EMAIL = "owner@example.test";

function contextFor(
  user: { openId: string; email: string; role: "user" | "admin" } | null,
): TrpcContext {
  return {
    user: user
      ? ({
          id: 1,
          name: user.email,
          loginMethod: "email",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          ...user,
        } as TrpcContext["user"])
      : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const owner = { openId: "email:owner@example.test", email: OWNER_EMAIL, role: "admin" as const };
const invitedAdmin = { openId: "email:teacher@example.test", email: "teacher@example.test", role: "admin" as const };
const plainUser = { openId: "email:someone@example.test", email: "someone@example.test", role: "user" as const };

describe("academy authorization and portal", () => {
  it("rejects an access code that is too short", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.portal.byCode({ accessCode: "x" })).rejects.toBeTruthy();
  });

  it("requires authentication for admin statistics", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

/**
 * The admin roster and the request queue belong to the owner alone. These cover
 * the rule that an invited admin is refused exactly like a stranger, so widening
 * `ownerProcedure` back to `adminProcedure` fails here rather than in production.
 */
describe("owner-only admin roster", () => {
  const originalOwnerEmail = ENV.ownerEmail;

  beforeEach(() => {
    ENV.ownerEmail = OWNER_EMAIL;
  });

  afterEach(() => {
    ENV.ownerEmail = originalOwnerEmail;
  });

  it("tells the owner apart from an invited admin on auth.me", async () => {
    const asOwner = appRouter.createCaller(contextFor(owner));
    const asInvited = appRouter.createCaller(contextFor(invitedAdmin));

    await expect(asOwner.auth.me()).resolves.toMatchObject({ isOwner: true });
    await expect(asInvited.auth.me()).resolves.toMatchObject({ isOwner: false });
  });

  it("refuses the roster and the request queue to an invited admin", async () => {
    const caller = appRouter.createCaller(contextFor(invitedAdmin));

    await expect(caller.admin.admins()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.accessRequests()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.addAdmin({ email: "someone@example.test" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.admin.removeAdmin({ email: OWNER_EMAIL })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.admin.approveAccess({ email: "someone@example.test" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.admin.dismissAccess({ email: "someone@example.test" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses the roster to a signed-in non-admin", async () => {
    const caller = appRouter.createCaller(contextFor(plainUser));

    await expect(caller.admin.admins()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.accessRequests()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still lets an invited admin use the shared academy screens", async () => {
    const caller = appRouter.createCaller(contextFor(invitedAdmin));

    // The gate is the middleware, not the query: with no database configured the
    // read answers an empty list, so reaching it at all is the thing being checked.
    await expect(caller.admin.students()).resolves.toEqual([]);
  });
});
