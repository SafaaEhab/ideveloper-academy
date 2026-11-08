/**
 * Canonical public discovery data.
 *
 * Production is intentionally the Vercel alias below, not a preview hostname.
 * Keep every machine-readable document on this origin so crawlers do not learn
 * preview URLs or non-canonical duplicates.
 */
export const CANONICAL_ORIGIN = "https://ideveloper-academy.vercel.app";

/** Backend + database host. The public site stays on `CANONICAL_ORIGIN`. */
export const CANONICAL_API_ORIGIN = "https://ideveloper-academy.runasp.net";

export const SITE_NAME = "iDeveloper Academy";
export const SITE_DESCRIPTION =
  "A children's programming and robotics academy in Banha, Egypt, teaching Scratch, Robotics, Web and Python.";

export type PublicPage = {
  path: string;
  title: string;
  description: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: string;
};

/**
 * Only routes that exist in `client/src/App.tsx` and are safe for search
 * indexing. Authenticated dashboards, login, API routes and the 404 route are
 * deliberately excluded.
 */
export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: "/",
    title: "iDeveloper Academy",
    description: SITE_DESCRIPTION,
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/courses",
    title: "Courses",
    description: "Scratch, Robotics, Web and Python courses for children aged 6–17.",
    changefreq: "weekly",
    priority: "0.9",
  },
  {
    path: "/register",
    title: "Registration",
    description: "Register a student with iDeveloper Academy.",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/terms",
    title: "Terms and conditions",
    description: "The academy's terms and conditions.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/privacy",
    title: "Privacy policy",
    description: "The academy's privacy policy.",
    changefreq: "yearly",
    priority: "0.3",
  },
];

/**
 * Link relations advertised on the homepage. `service-desc` is intentionally
 * absent because this project has no published OpenAPI document.
 */
export const HOME_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api.md>; rel="service-doc"',
  '</auth.md>; rel="describedby"',
  '</.well-known/ai-catalog.json>; rel="describedby"',
  '</.well-known/agent-skills/index.json>; rel="describedby"',
  '</sitemap.xml>; rel="sitemap"',
].join(", ");

export function absoluteUrl(path: string): string {
  return `${CANONICAL_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
