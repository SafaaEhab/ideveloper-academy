import type { Express, Request, Response } from "express";
import { HOME_LINK_HEADER } from "../../shared/discovery";
import { markdownForPath } from "../markdown";

/**
 * Public agent-discovery endpoints that need application logic.
 *
 * Static discovery documents (robots, sitemap, auth.md, API catalog, ARD and
 * agent-skills index) live in `client/public` and are served by Vercel. This
 * module handles the homepage Link header, a minimal health endpoint and
 * Markdown content negotiation.
 */
const MARKDOWN_PAGES = new Set(["/", "/courses", "/register"]);

export function registerDiscoveryRoutes(app: Express): void {
  // Markdown for Agents: the Vercel deployment has a proxy for this, and the
  // MonsterASP deployment needs the same behaviour from Express itself.
  app.use((req: Request, res: Response, next) => {
    if (!MARKDOWN_PAGES.has(req.path)) {
      next();
      return;
    }
    const accept = String(req.headers.accept ?? "").toLowerCase();
    if (!accept.includes("text/markdown")) {
      next();
      return;
    }
    const markdown = markdownForPath(req.path);
    if (markdown === null) {
      next();
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Vary", "Accept");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(markdown);
  });

  // Website-only Personal Agent Protocol (Poppy) discovery. The organization
  // domain is the host that actually answered, so the same route is correct on
  // both the Vercel frontend and the MonsterASP deployment.
  app.get("/.well-known/poppy.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      protocol_version: "0.1",
      organization: {
        name: "iDeveloper Academy",
        domain: String(req.hostname ?? "").replace(/^www\./i, ""),
      },
      web: {},
    });
  });

  app.use((req: Request, res: Response, next) => {
    if (req.path === "/" || req.path === "/index.html") {
      res.setHeader("Link", HOME_LINK_HEADER);
      res.setHeader("Vary", "Accept");
    } else if (req.path === "/courses" || req.path === "/register") {
      res.setHeader("Vary", "Accept");
    }
    next();
  });

  // A deliberately tiny public liveness endpoint used by the API catalog. It
  // does not touch the database and exposes no deployment details.
  app.get("/api/health", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.json({ status: "ok", service: "ideveloper-academy" });
  });

  app.get("/api/markdown", (req, res) => {
    const requested = typeof req.query.path === "string" ? req.query.path : "/";
    const markdown = markdownForPath(requested);
    if (markdown === null) {
      res.status(404).json({ error: "No public Markdown representation for that path" });
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Vary", "Accept");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(markdown);
  });
}
