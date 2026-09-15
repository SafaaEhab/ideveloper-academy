import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("academy authorization and portal", () => {
  it("rejects an access code that is too short", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.portal.byCode({ accessCode: "x" })).rejects.toBeTruthy();
  });

  it("requires authentication for admin statistics", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
