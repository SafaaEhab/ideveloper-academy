/**
 * WebMCP progressive enhancement.
 *
 * Only public, read-only course discovery and navigation are exposed. The API
 * is experimental and browser-dependent, so every reference is feature-detected
 * and registration failures are ignored. Normal site behavior never depends on
 * this module.
 */

import { API_BASE_URL } from "@/const";

const PUBLIC_PAGES = ["/", "/courses", "/register", "/privacy", "/terms"] as const;

type PublicPage = (typeof PUBLIC_PAGES)[number];

type RegisterToolOptions = {
  signal?: AbortSignal;
};

type ModelContext = {
  registerTool?: (
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    },
    options?: RegisterToolOptions,
  ) => Promise<unknown> | unknown;
};

type CourseOffering = {
  course: string;
  status: string;
};

function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const doc = document as unknown as { modelContext?: ModelContext };
  const nav = typeof navigator === "undefined" ? undefined : (navigator as unknown as { modelContext?: ModelContext });
  return doc.modelContext ?? nav?.modelContext ?? null;
}

async function searchPublicCourses(input: Record<string, unknown>) {
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 80) : "";
  const response = await fetch(`${API_BASE_URL}/api/trpc/site.courses`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Course availability could not be loaded");
  const payload = (await response.json()) as {
    result?: { data?: { json?: unknown } };
  };
  const courses = payload?.result?.data?.json;
  if (!Array.isArray(courses)) throw new Error("Course availability response was not understood");
  const rows = courses as CourseOffering[];
  const filtered = query
    ? rows.filter(course => course.course.toLowerCase().includes(query.toLowerCase()))
    : rows;
  return {
    query,
    courses: filtered.map(course => ({ course: course.course, status: course.status })),
  };
}

async function openPublicPage(input: Record<string, unknown>) {
  const page = typeof input.path === "string" ? input.path : "";
  if (!PUBLIC_PAGES.includes(page as PublicPage)) {
    throw new Error("That page is not a public academy page");
  }
  if (typeof window === "undefined") throw new Error("Navigation is unavailable");
  window.location.assign(page);
  return { navigated: page };
}

/**
 * Registers the public WebMCP tools when the browser supports them.
 * Returns a cleanup function that unregisters all tools via AbortSignal.
 */
export function registerPublicWebMcpTools(): () => void {
  const context = getModelContext();
  if (!context?.registerTool) return () => {};
  const controller = new AbortController();

  const register = (tool: Parameters<NonNullable<ModelContext["registerTool"]>>[0]) => {
    try {
      const result = context.registerTool!(tool, { signal: controller.signal });
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch(() => {
          /* Experimental API: ignore registration failures */
        });
      }
    } catch {
      /* Experimental API: ignore registration failures */
    }
  };

  register({
    name: "search_public_courses",
    description:
      "Search the public iDeveloper Academy course catalogue and return each course's current availability.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional course name or topic, for example Python or robotics.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: searchPublicCourses,
  });

  register({
    name: "open_public_page",
    description:
      "Open one of the academy's public pages. Authenticated dashboards and admin pages are not available.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          enum: [...PUBLIC_PAGES],
          description: "A public academy page path.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
    execute: openPublicPage,
  });

  return () => controller.abort();
}
