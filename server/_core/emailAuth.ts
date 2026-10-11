import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { checkRateLimit, clearRateLimit, hashPassword, rateLimitKey, verifyPassword } from "./password";
import { sdk } from "./sdk";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_NAME_LENGTH = 120;
const SIGNUP_MAX_ATTEMPTS = 5;

/**
 * A hash and salt that no account can match, used to keep the login reply the
 * same shape whether or not the address exists. The value is a throwaway —
 * nothing is ever compared against a real password with it.
 */
const DUMMY_HASH = hashPassword("no-account-uses-this-password").hash;
const DUMMY_SALT = hashPassword("no-account-uses-this-salt").salt;

/**
 * Same generic wording for "no such user" and "wrong password" so the endpoint
 * cannot be used to enumerate which emails have accounts.
 */
const INVALID_CREDENTIALS = "Incorrect email or password";

function readBody(req: Request): Record<string, unknown> {
  const body = req.body as unknown;
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

function readEmail(req: Request): string {
  return String(readBody(req).email ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 320;
}

function readPassword(req: Request): string {
  return String(readBody(req).password ?? "");
}

function issueSession(req: Request, res: Response, user: { openId: string; name: string | null }) {
  return sdk
    .createSessionToken(user.openId, { name: user.name ?? "" })
    .then(sessionToken => {
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return sessionToken;
    });
}

async function registerAccount(req: Request, res: Response) {
  const email = readEmail(req);
  const password = readPassword(req);
  const name = String(readBody(req).name ?? "").trim().slice(0, MAX_NAME_LENGTH);

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }

  // Signup is open to anyone, so without a brake it becomes a way to fill the
  // users table with junk and to mail the owner nothing in particular.
  const signupKey = rateLimitKey(req, "signup");
  if (!checkRateLimit(signupKey, SIGNUP_MAX_ATTEMPTS)) {
    res.status(429).json({ error: "Too many accounts from this device. Try again later." });
    return;
  }

  if (await db.getCredentialByEmail(email)) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const openId = db.openIdForEmail(email);
  const existingUser = await db.getUserByOpenId(openId);
  const { hash, salt } = hashPassword(password);

  await db.upsertCredential({ email, passwordHash: hash, salt });
  // Typing an address proves nothing, so signing up never inherits the admin
  // allow-list — otherwise anyone who guessed the owner's email would walk
  // straight into the panel by making an account with it. The owner's own
  // address is the single exception, kept so a fresh password account can never
  // lock them out of the panel they own.
  await db.upsertUser({
    openId,
    email,
    name: name || existingUser?.name || email.split("@")[0],
    loginMethod: "email",
    role: db.isOwnerEmail(email) ? "admin" : "user",
    lastSignedIn: new Date(),
  });

  const user = await db.getUserByOpenId(openId);
  const sessionToken = await issueSession(req, res, { openId, name: user?.name ?? null });

  res.json({ success: true, user: user ?? null, token: sessionToken });
}

async function loginWithPassword(req: Request, res: Response) {
  const email = readEmail(req);
  const password = readPassword(req);

  if (!isValidEmail(email) || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const limitKey = rateLimitKey(req, email);
  if (!checkRateLimit(limitKey)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  const credential = await db.getCredentialByEmail(email);
  // Always spend the same time hashing, even for an address that has no account.
  // Skipping the scrypt work for unknown emails would make those replies arrive
  // in a few milliseconds and turn this endpoint into a way to list who has
  // registered, no matter how careful the error message is.
  const passwordOk = verifyPassword(
    password,
    credential?.passwordHash ?? DUMMY_HASH,
    credential?.salt ?? DUMMY_SALT,
  );

  if (!credential || !passwordOk) {
    res.status(401).json({ error: INVALID_CREDENTIALS });
    return;
  }

  clearRateLimit(limitKey);

  const openId = db.openIdForEmail(email);
  const signedInAt = new Date();
  let user = await db.getUserByOpenId(openId);

  // The credential row and the profile row are written separately, so a signup
  // that died midway leaves a login without a profile. Recreate it here — as a
  // plain user, since an address alone never earns the admin role.
  if (!user) {
    await db.upsertUser(
      {
        openId,
        email,
        name: email.split("@")[0],
        loginMethod: "email",
        role: db.isOwnerEmail(email) ? "admin" : "user",
        lastSignedIn: signedInAt,
      },
      { allowAdminPromotion: false },
    );
    user = await db.getUserByOpenId(openId);
  } else {
    await db.upsertUser({ openId, lastSignedIn: signedInAt });
  }

  const sessionToken = await issueSession(req, res, { openId, name: user?.name ?? null });

  res.json({ success: true, user: user ?? null, token: sessionToken });
}

/**
 * Email + password sign-in, used when the OAuth provider is not configured
 * (self-hosted / Vercel). Registered unconditionally so the admin workspace and
 * the student portal work on a plain deployment; the Manus OAuth routes keep
 * working untouched when they are set up.
 */
export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/signup", (req, res) => {
    registerAccount(req, res).catch(error => {
      console.error("[EmailAuth] signup failed", error);
      res.status(500).json({ error: "Could not create the account. Try again." });
    });
  });

  app.post("/api/auth/login", (req, res) => {
    loginWithPassword(req, res).catch(error => {
      console.error("[EmailAuth] login failed", error);
      res.status(500).json({ error: "Login failed. Try again." });
    });
  });
}