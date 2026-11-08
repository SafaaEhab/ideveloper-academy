import { next } from "@vercel/functions";

/**
 * Header-dependent Markdown negotiation.
 *
 * Static Vercel rewrites did not reliably match `Accept`, so this tiny Routing
 * Middleware handles only the three public pages that have Markdown versions.
 * Everything else continues through the normal static/API routing unchanged.
 */
const MARKDOWN_PAGES = new Set(["/", "/courses", "/register"]);

export default async function proxy(request: Request) {
  const url = new URL(request.url);
  if (!MARKDOWN_PAGES.has(url.pathname)) return next();

  const accept = (request.headers.get("accept") ?? "").toLowerCase();
  if (!accept.includes("text/markdown")) return next();

  const target = new URL("/api/markdown", url);
  target.searchParams.set("path", url.pathname);
  try {
    const response = await fetch(target, { headers: { accept: "text/markdown" } });
    if (!response.ok) return next();
    const headers = new Headers(response.headers);
    for (const name of ["content-encoding", "content-length", "transfer-encoding", "connection"]) {
      headers.delete(name);
    }
    headers.set("Vary", "Accept");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return next();
  }
}

export const config = {
  matcher: ["/", "/courses", "/register"],
};
