import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "./_core/app";

/**
 * These checks pin the transport/security headers and the API 404 contract.
 * They run the same Express app that Vercel and MonsterASP use, without the
 * static SPA layer, so a regression here fails before deployment.
 */
describe("API hardening", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it("adds the conservative API response headers and no banner", async () => {
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("adds HSTS when the proxy reports HTTPS", async () => {
    const response = await fetch(`${base}/api/health`, {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it("returns JSON 404 for an unknown API path instead of SPA HTML", async () => {
    const response = await fetch(`${base}/api/this-route-does-not-exist`);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("keeps unknown tRPC procedures as JSON 404s", async () => {
    const response = await fetch(`${base}/api/trpc/notAProcedure`);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
