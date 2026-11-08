import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

/**
 * The student portal authenticates with an access code, but personal
 * evaluations should not be fetched by putting that code in every request.
 * After a successful lookup the server exchanges the code for a short-lived,
 * signed, HttpOnly cookie. The code itself never leaves the login request.
 */
export const STUDENT_COOKIE_NAME = "student_session_id";
export const STUDENT_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function sessionSecret(): Uint8Array {
  if (!ENV.cookieSecret && ENV.isProduction) {
    throw new Error("JWT_SECRET is required for student sessions");
  }
  return new TextEncoder().encode(
    ENV.cookieSecret || "ideveloper-local-student-session",
  );
}

export async function signStudentSession(studentId: number): Promise<string> {
  const expiresAt = Math.floor(
    (Date.now() + STUDENT_SESSION_MAX_AGE_MS) / 1000,
  );
  return new SignJWT({ kind: "student", studentId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(sessionSecret());
}

export async function verifyStudentSession(
  token: string | null | undefined,
): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });
    const { kind, studentId } = payload as Record<string, unknown>;
    if (kind !== "student") return null;
    if (typeof studentId !== "number" || !Number.isInteger(studentId)) {
      return null;
    }
    return studentId > 0 ? studentId : null;
  } catch {
    return null;
  }
}

export async function readStudentSessionFromRequest(
  req: Request,
): Promise<number | null> {
  const header = req.headers.cookie;
  if (typeof header !== "string" || !header) return null;
  const cookies = parseCookieHeader(header);
  return verifyStudentSession(cookies[STUDENT_COOKIE_NAME]);
}

export function studentSessionCookieOptions(req: Request) {
  return {
    ...getSessionCookieOptions(req),
    httpOnly: true,
    maxAge: STUDENT_SESSION_MAX_AGE_MS,
  };
}

/** Wrapped so a minimal test double for `res` does not break the login flow. */
export function setStudentSessionCookie(
  req: Request,
  res: Response,
  token: string,
) {
  if (typeof res.cookie === "function") {
    res.cookie(STUDENT_COOKIE_NAME, token, studentSessionCookieOptions(req));
  }
}

export function clearStudentSessionCookie(req: Request, res: Response) {
  if (typeof res.clearCookie === "function") {
    res.clearCookie(STUDENT_COOKIE_NAME, {
      ...getSessionCookieOptions(req),
      maxAge: -1,
    });
  }
}
