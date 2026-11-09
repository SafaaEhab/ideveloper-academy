import { next } from "@vercel/functions";

/**
 * Routing Middleware for the split Vercel deployment.
 *
 * Two responsibilities:
 *   1. Header-dependent Markdown negotiation for the three public pages that
 *      have Markdown versions.
 *   2. A real 404 status for unknown client routes. The SPA fallback in
 *      vercel.json still serves `index.html`, so the React not-found page is
 *      rendered, but it is now served with HTTP 404 instead of 200.
 */

const MARKDOWN_PAGES = new Set(["/", "/courses", "/register"]);

const KNOWN_STATIC_ROUTES = new Set([
  "/",
  "/courses",
  "/register",
  "/terms",
  "/privacy",
  "/login",
  "/student",
  "/admin",
  "/leads",
  "/404",
]);

const STATIC_PREFIXES = [
  "/api/",
  "/assets/",
  "/images/",
  "/curriculum/",
  "/__manus__/",
  "/_next/",
  "/.well-known/",
];

const STATIC_FILES = new Set([
  "/index.html",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/auth.md",
  "/api.md",
]);

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

export function isKnownHtmlRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (KNOWN_STATIC_ROUTES.has(path)) return true;
  if (path === "/instructor" || path === "/instructor/analytics") return true;
  return (
    /^\/instructor\/group\/\d+$/.test(path) ||
    /^\/instructor\/group\/\d+\/student\/\d+$/.test(path)
  );
}

function isStaticPath(pathname: string): boolean {
  if (STATIC_FILES.has(pathname)) return true;
  return STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

async function serveIndexAs404(request: Request, url: URL): Promise<Response> {
  try {
    const indexUrl = new URL("/index.html", url);
    const response = await fetch(indexUrl, {
      headers: { accept: "text/html" },
      cache: "no-store",
    });
    if (!response.ok) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const headers = new Headers();
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-robots-tag", "noindex");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: 404,
      headers,
    });
  } catch {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export default async function proxy(request: Request) {
  const url = new URL(request.url);
  const path = normalizePathname(url.pathname);

  if (isStaticPath(url.pathname)) return next();

  const accept = (request.headers.get("accept") ?? "").toLowerCase();
  if (
    request.method !== "HEAD" &&
    MARKDOWN_PAGES.has(path) &&
    accept.includes("text/markdown")
  ) {
    const target = new URL("/api/markdown", url);
    target.searchParams.set("path", path);
    try {
      const response = await fetch(target, {
        headers: { accept: "text/markdown" },
      });
      if (!response.ok) return next();
      const headers = new Headers(response.headers);
      for (const name of [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
      ]) {
        headers.delete(name);
      }
      headers.set("Vary", "Accept");
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch {
      return next();
    }
  }

  if (path === "/404") return serveIndexAs404(request, url);
  if (isKnownHtmlRoute(path)) return next();

  return serveIndexAs404(request, url);
}

export const config = {
  // Everything except the API, static asset folders, and files that live at
  // the root (robots/sitemap/catalog/Markdown). HTML routes reach the proxy so
  // unknown paths can answer with a real 404 status.
  matcher: [
    "/((?!api/|assets/|images/|curriculum/|__manus__/|_next/|\\.well-known/|index\\.html|favicon\\.ico|robots\\.txt|sitemap\\.xml|auth\\.md|api\\.md).*)",
  ],
};
