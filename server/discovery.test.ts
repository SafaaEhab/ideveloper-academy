import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "./_core/app";
import { markdownForPath } from "./markdown";
import { CANONICAL_API_ORIGIN, CANONICAL_ORIGIN, HOME_LINK_HEADER, PUBLIC_PAGES } from "../shared/discovery";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const read = (relative: string) => fs.readFileSync(path.join(PUBLIC, relative), "utf8");

describe("generated public discovery documents", () => {
  it("uses the production canonical origin", () => {
    expect(CANONICAL_ORIGIN).toBe("https://ideveloper-academy.vercel.app");
  });

  it("publishes robots.txt with AI policies and the sitemap", () => {
    const robots = read("robots.txt");
    expect(robots).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
    expect(robots).toContain(`Agentmap: ${CANONICAL_ORIGIN}/.well-known/ai-catalog.json`);
    for (const agent of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "GPTBot", "ClaudeBot", "Google-Extended"]) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /student");
    expect(robots).toContain("Disallow: /instructor");
    expect(robots).toContain("Content-Signal: ai-train=no, search=yes, ai-input=no");
    expect(robots).not.toMatch(/Disallow: \/assets/);
    expect(robots).not.toMatch(/Disallow: \/images/);
  });

  it("publishes a valid sitemap containing only real public pages", () => {
    const xml = read("sitemap.xml");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(locations).toEqual(PUBLIC_PAGES.map(page => `${CANONICAL_ORIGIN}${page.path}`));
    for (const privatePath of ["/admin", "/student", "/instructor", "/login", "/api/"]) {
      expect(xml).not.toContain(privatePath);
    }
  });

  it("publishes a valid RFC 9727 linkset with the right advertised resources", () => {
    const catalog = JSON.parse(read(".well-known/api-catalog"));
    expect(Array.isArray(catalog.linkset)).toBe(true);
    const entry = catalog.linkset[0];
    expect(entry.anchor).toBe(`${CANONICAL_API_ORIGIN}/api/trpc`);
    expect(entry["service-doc"][0].href).toBe(`${CANONICAL_ORIGIN}/api.md`);
    expect(entry.status[0].href).toBe(`${CANONICAL_API_ORIGIN}/api/health`);
    expect(entry["service-desc"]).toBeUndefined();

    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    const route = vercel.routes.find((item: any) => item.src === "/.well-known/api-catalog");
    expect(route.headers["Content-Type"]).toBe("application/linkset+json");
  });

  it("publishes a valid ARD manifest with exactly one url per entry", () => {
    const ard = JSON.parse(read(".well-known/ai-catalog.json"));
    expect(ard.specVersion).toBe("1.0");
    expect(ard.host.displayName).toBeTruthy();
    expect(ard.host.identifier).toMatch(/^did:web:/);
    expect(ard.entries.length).toBeGreaterThanOrEqual(2);
    expect(ard.entries.length).toBeLessThanOrEqual(5);
    for (const entry of ard.entries) {
      expect(entry.identifier).toMatch(/^urn:air:ideveloper-academy\.vercel\.app:/);
      expect(entry.displayName).toBeTruthy();
      expect(entry.type).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/);
      expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
    }
    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    const route = vercel.routes.find((item: any) => item.src === "/.well-known/ai-catalog.json");
    expect(route.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("publishes an agent-skills index whose digests match the published bytes", () => {
    const index = JSON.parse(read(".well-known/agent-skills/index.json"));
    expect(index.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(index.skills.length).toBeGreaterThan(0);
    for (const skill of index.skills) {
      expect(skill.name).toMatch(/^[a-z0-9-]+$/);
      expect(skill.type).toBe("skill-md");
      expect(skill.url.startsWith(`${CANONICAL_ORIGIN}/`)).toBe(true);
      const relative = skill.url.slice(CANONICAL_ORIGIN.length + 1);
      const content = fs.readFileSync(path.join(PUBLIC, relative));
      const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
      expect(skill.digest).toBe(digest);
    }
  });

  it("publishes auth.md as accurate first-party authentication documentation", () => {
    const markdown = read("auth.md");
    expect(markdown.startsWith("# auth.md")).toBe(true);
    expect(markdown).toContain("There is **no** public agent-registration");
    expect(markdown).toContain("not an OAuth/OIDC");
    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    const route = vercel.routes.find((item: any) => item.src === "/auth.md");
    expect(route.headers["Content-Type"]).toBe("text/markdown; charset=utf-8");
  });

  it("advertises only real, valid Link relations", () => {
    expect(HOME_LINK_HEADER).toContain('rel="api-catalog"');
    expect(HOME_LINK_HEADER).toContain('rel="service-doc"');
    expect(HOME_LINK_HEADER).toContain('rel="describedby"');
    expect(HOME_LINK_HEADER).toContain('rel="sitemap"');
    expect(HOME_LINK_HEADER).not.toContain('rel="service-desc"');
    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    const route = vercel.routes.find((item: any) => item.src === "/" && item.headers?.Link);
    expect(route.headers.Link).toBe(HOME_LINK_HEADER);
    expect(route.headers.Vary).toBe("Accept");
  });
});

describe("markdown negotiable public pages", () => {
  it("provides markdown for public pages and refuses private paths", () => {
    expect(markdownForPath("/")).toContain("# iDeveloper Academy");
    expect(markdownForPath("/courses")).toContain("# Courses at iDeveloper Academy");
    expect(markdownForPath("/register")).toContain("# Register with iDeveloper Academy");
    expect(markdownForPath("/admin")).toBeNull();
    expect(markdownForPath("/student")).toBeNull();
    expect(markdownForPath("/instructor")).toBeNull();
    expect(markdownForPath("/api/trpc/admin.stats")).toBeNull();
  });

  it("serves health and Markdown through the Express app", async () => {
    const app = createApp();
    let server: Server | null = null;
    try {
      await new Promise<void>(resolve => {
        server = app.listen(0, "127.0.0.1", () => resolve());
      });
      const address = server!.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      const base = `http://127.0.0.1:${address.port}`;

      const health = await fetch(`${base}/api/health`);
      expect(health.status).toBe(200);
      expect(health.headers.get("content-type")).toContain("application/json");
      await expect(health.json()).resolves.toMatchObject({ status: "ok" });

      const markdown = await fetch(`${base}/api/markdown?path=/`);
      expect(markdown.status).toBe(200);
      expect(markdown.headers.get("content-type")).toContain("text/markdown");
      expect(markdown.headers.get("vary")?.toLowerCase()).toContain("accept");
      expect(await markdown.text()).toContain("# iDeveloper Academy");

      const blocked = await fetch(`${base}/api/markdown?path=/admin`);
      expect(blocked.status).toBe(404);

      const home = await fetch(`${base}/`);
      expect(home.headers.get("link")).toBe(HOME_LINK_HEADER);

      const negotiated = await fetch(`${base}/`, { headers: { accept: "text/markdown" } });
      expect(negotiated.status).toBe(200);
      expect(negotiated.headers.get("content-type")).toContain("text/markdown");
      expect(await negotiated.text()).toContain("# iDeveloper Academy");
    } finally {
      if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    }
  }, 15000);
});
