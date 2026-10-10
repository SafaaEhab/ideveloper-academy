import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { checkRateLimit, clearRateLimit, hashPassword, verifyPassword } from "./_core/password";

/**
 * Regression cover for the hardening pass. Each test names the attack it stops,
 * so a future change that reopens the hole fails here rather than in production.
 */

const SITE = "https://ideveloper-academy.vercel.app";

function fakeRequest(options: {
  protocol?: string;
  host?: string;
  forwardedHost?: string;
  forwardedProto?: string;
  origin?: string;
}): Request {
  const headers: Record<string, string> = {};
  if (options.forwardedHost) headers["x-forwarded-host"] = options.forwardedHost;
  if (options.forwardedProto) headers["x-forwarded-proto"] = options.forwardedProto;
  if (options.origin) headers.origin = options.origin;
  if (options.host) headers.host = options.host;
  return { protocol: options.protocol ?? "https", headers } as unknown as Request;
}

describe("session cookie scope", () => {
  beforeAll(() => {
    // In production this list holds the site's own domain, which is exactly the
    // case the host comparison exists for.
    process.env.WEB_ORIGIN = SITE;
  });
  afterAll(() => {
    delete process.env.WEB_ORIGIN;
  });

  it("keeps the session host-only and SameSite=Lax for a same-origin request", () => {
    const options = getSessionCookieOptions(
      fakeRequest({ host: "ideveloper-academy.vercel.app", origin: SITE }),
    );
    expect(options.sameSite).toBe("lax");
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.domain).toBeUndefined();
  });

  it("uses SameSite=None only for a genuinely cross-site caller", () => {
    const options = getSessionCookieOptions(
      fakeRequest({
        host: "api.example.com",
        origin: SITE,
        forwardedHost: "api.example.com",
      }),
    );
    expect(options.sameSite).toBe("none");
  });

  it("never marks a same-origin request as cross-site, even with its own domain allow-listed", () => {
    // WEB_ORIGIN normally contains this site's own address. Treating membership as
    // "cross-site" is what would hand every visitor a SameSite=None cookie.
    const options = getSessionCookieOptions(
      fakeRequest({ host: "ideveloper-academy.vercel.app", origin: SITE }),
    );
    expect(options.sameSite).toBe("lax");
  });

  it("falls back to Lax over plain http so the cookie is stored at all", () => {
    const options = getSessionCookieOptions(
      fakeRequest({ protocol: "http", host: "localhost:3000" }),
    );
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", () => {
    const { hash, salt } = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", hash, salt)).toBe(true);
    expect(verifyPassword("Correct horse battery", hash, salt)).toBe(false);
  });

  it("never stores the password itself", () => {
    const password = "unique-passphrase-9182";
    const { hash, salt } = hashPassword(password);
    expect(hash).not.toContain(password);
    expect(salt).not.toContain(password);
  });

  it("salts, so the same password hashes differently every time", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a.hash).not.toBe(b.hash);
    expect(a.salt).not.toBe(b.salt);
  });

  it("refuses a hash that is not the expected length instead of throwing", () => {
    const { salt } = hashPassword("whatever");
    expect(verifyPassword("whatever", "00", salt)).toBe(false);
    expect(verifyPassword("whatever", "not-hex", salt)).toBe(false);
  });
});

describe("rate limiting", () => {
  it("blocks once the attempt budget is spent, then lets a fresh key through", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit(key, 3)).toBe(true);
    expect(checkRateLimit(key, 3)).toBe(false);
    expect(checkRateLimit("test:unrelated", 3)).toBe(true);
    clearRateLimit(key);
    expect(checkRateLimit(key, 3)).toBe(true);
  });

  it("honours a per-caller budget rather than a single global one", () => {
    const signup = `signup:${Math.random()}`;
    expect(checkRateLimit(signup, 5)).toBe(true);
    expect(checkRateLimit(`lookup:${Math.random()}`, 30)).toBe(true);
    expect(checkRateLimit(`lookup:${Math.random()}`, 30)).toBe(true);
  });
});