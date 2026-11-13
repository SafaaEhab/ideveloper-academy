import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { allowedCrossOrigins } from "./cookies";
import { createContext } from "./context";
import { registerDevAuthRoutes } from "./devAuth";
import { registerEmailAuthRoutes } from "./emailAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerAssignmentFileRoutes } from "./assignmentFiles";
import { registerDiscoveryRoutes } from "./discovery";
import { registerBackupRoutes } from "./backupRoutes";
import { registerExcelBackupTriggers } from "./excelBackup";
import { registerAgentMcpRoute } from "./agentMcp";
import { registerUploadRoutes } from "./uploadRoutes";
import { registerWhatsAppWebhook } from "../whatsappWebhook";

/**
 * Builds the Express app shared by every deployment target:
 * standalone Node (Render/Docker), and Vercel serverless functions.
 *
 * Deliberately free of `vite` imports so the serverless bundle stays small
 * and does not need devDependencies. Dev-only static/Vite middleware is wired
 * by the caller (`server/_core/index.ts`); production on Vercel serves the
 * built client from the CDN instead.
 */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  // Conservative response headers for every API route. IIS/MonsterASP may add
  // its own banner before Node sees the request; web.config removes that at the
  // hosting layer, and this also strips it when Express itself set one.
  app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    // Trust the reverse proxy for the scheme: IIS and Vercel both forward the
    // original protocol in X-Forwarded-Proto. HSTS is only meaningful over TLS,
    // so local HTTP development does not receive it.
    const forwarded = req.headers["x-forwarded-proto"];
    const forwardedProto = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0]?.trim();
    if (req.secure || forwardedProto === "https") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }

    next();
  });

  // Split deployment (static frontend on Vercel + API here):
  // allow the configured frontend origins to call /api/* cross-origin.
  // Set WEB_ORIGIN="https://your-site.vercel.app" (comma-separated for more).
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedCrossOrigins().includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // WhatsApp webhooks need the raw body for HMAC verification, so they are
  // registered before the global JSON parser. The route itself applies
  // express.raw() and rejects unsigned requests when the app secret is absent.
  registerWhatsAppWebhook(app);

  // Configure body parser with larger size limit for file uploads. The largest
  // legitimate payload is an achievement photo — 8 MB of bytes plus base64
  // overhead, so ~11 MB — and anything bigger is only a way to burn the
  // function's memory before the route ever looks at it.
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  registerStorageProxy(app);
  registerAssignmentFileRoutes(app);
  registerDiscoveryRoutes(app);
  registerOAuthRoutes(app);
  registerEmailAuthRoutes(app);
  registerDevAuthRoutes(app);
  registerBackupRoutes(app);
  registerUploadRoutes(app);
  registerAgentMcpRoute(app);

  // Every successful write to /api/* schedules a debounced Excel snapshot.
  // This must be registered before the tRPC router so its `finish` listener is
  // attached to the response that the router eventually ends.
  if (process.env.EXCEL_BACKUP_ENABLED !== "false") {
    registerExcelBackupTriggers(app);
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Any /api path that no route above handled is a genuine 404, not a client
  // route. Without this, the SPA fallback in serveStatic() would answer an
  // unknown API path with 200 + index.html — which hides broken integrations
  // from monitoring and returns the wrong content type.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}