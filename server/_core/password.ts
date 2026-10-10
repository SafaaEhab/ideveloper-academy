import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

// scrypt with its default N=16384 costs roughly 50-100ms here — slow enough to
// make offline cracking expensive, fast enough to sit in a login request.
// Output is hex so it fits the `varchar` columns without encoding concerns.
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  let expected: Buffer;
  try {
    expected = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const derived = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/**
 * Per-process brute-force brake. On serverless this resets whenever a warm
 * instance is recycled, so treat it as a speed bump, not a real lockout.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function checkRateLimit(key: string, maxAttempts = MAX_ATTEMPTS): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}

/**
 * Buckets the caller by IP plus whatever they are asking about, so one person
 * cannot lock out an entire office by failing ten logins in a row, and one
 * address cannot be hammered from many IPs by dropping the email from the key.
 * Vercel puts the real client address in `x-forwarded-for`.
 */
export function rateLimitKey(req: Request, scope: string): string {
  const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
  const forwarded = headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    "unknown";
  return `${ip}:${scope}`;
}