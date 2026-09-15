import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { ensureAdminByEmail, isAdminEmail } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Local-dev admin login without OAuth.
 * Only registered when NOT in production.
 * Only emails listed in ADMIN_EMAILS are allowed.
 */
export function registerDevAuthRoutes(app: Express) {
  if (ENV.isProduction) return;

  app.post("/api/dev-login", async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = typeof req.body?.name === "string" ? String(req.body.name).slice(0, 120) : undefined;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }
    if (!isAdminEmail(email)) {
      res.status(403).json({ error: "This email is not in ADMIN_EMAILS" });
      return;
    }

    try {
      const user = await ensureAdminByEmail(email, name ?? null);
      if (!user) {
        res.status(500).json({ error: "Failed to create admin user" });
        return;
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      // Return the token too so the client can use it as a Bearer fallback
      // (Safari ITP / cookie blocked). Stored as `manus-cookie` in sessionStorage.
      res.json({ success: true, user, token: sessionToken });
    } catch (error) {
      console.error("[DevAuth] login failed", error);
      res.status(500).json({ error: "Dev login failed. Is DATABASE_URL set?" });
    }
  });
}
