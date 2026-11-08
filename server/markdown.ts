import {
  ACADEMY_ADDRESS,
  ACADEMY_HOURS,
  ACADEMY_PHONE,
  COURSES,
  FAQS,
  HERO_POINTS,
  OFFERINGS,
} from "../client/src/data/academyContent";
import { absoluteUrl, SITE_NAME } from "../shared/discovery";

/**
 * Application-level Markdown representations for public, non-authenticated
 * pages. These are used by `/api/markdown` when a request negotiates
 * `Accept: text/markdown`. Private routes are not in this map and therefore
 * cannot be fetched as Markdown.
 */

function homeMarkdown(): string {
  return [
    `# ${SITE_NAME}`,
    "",
    "A children's programming and robotics academy in Banha, Egypt.",
    "",
    "## Who it is for",
    ...HERO_POINTS.map(point => `- ${point}`),
    "",
    "## What the academy offers",
    ...OFFERINGS.map(item => `- **${item.title}**: ${item.body}`),
    "",
    "## Courses",
    ...COURSES.map(
      course =>
        `- **${course.title}** (${course.facts.join(" · ")}): ${course.description}`,
    ),
    "",
    "## Visit or contact",
    `- Address: ${ACADEMY_ADDRESS}`,
    `- Hours: ${ACADEMY_HOURS}`,
    `- Phone: ${ACADEMY_PHONE}`,
    "",
    "## Public links",
    `- [Courses](${absoluteUrl("/courses")})`,
    `- [Registration](${absoluteUrl("/register")})`,
    `- [Privacy policy](${absoluteUrl("/privacy")})`,
    `- [Terms and conditions](${absoluteUrl("/terms")})`,
    "",
    "## For agents",
    `- Course availability API: ${absoluteUrl("/api/trpc/site.courses")}`,
    `- API documentation: ${absoluteUrl("/api.md")}`,
    `- Authentication guide: ${absoluteUrl("/auth.md")}`,
  ].join("\n");
}

function coursesMarkdown(): string {
  return [
    "# Courses at iDeveloper Academy",
    "",
    "The academy teaches children aged 6–17 through practical, project-based courses.",
    "Current availability (Live, Coming soon, Waiting list) is published by the",
    `[course availability API](${absoluteUrl("/api/trpc/site.courses")}).`,
    "",
    ...COURSES.flatMap(course => [
      `## ${course.title}`,
      "",
      `- Format: ${course.facts.join(" · ")}`,
      `- Course page: ${absoluteUrl(`/courses#${course.slug}`)}`,
      "",
      course.description,
      "",
    ]),
    "## Registration",
    "",
    `Start a registration at ${absoluteUrl("/register")}. The form stores the request on the server; WhatsApp is an optional follow-up, not the only submission path.`,
    "",
    "## Frequently asked questions",
    "",
    ...FAQS.flatMap(faq => [`### ${faq.question}`, "", faq.answer, ""]),
  ].join("\n");
}

function registerMarkdown(): string {
  return [
    "# Register with iDeveloper Academy",
    "",
    `Use the public registration form at ${absoluteUrl("/register")}.`,
    "",
    "## Required information",
    "- Student full name and phone number",
    "- Student age (6–17), address and school",
    "- Parent email and parent phone number",
    "- Selected course and gender",
    "- Whether a sibling is already registered in the same course",
    "- Optional notes",
    "",
    "## What happens after submission",
    "The request is saved in the academy database with a Pending status. Academy staff review it from the admin workspace. A parent may optionally send the same details through WhatsApp after the successful save.",
    "",
    "## Privacy",
    `Do not submit student data to third parties. The academy privacy policy is at ${absoluteUrl("/privacy")}.`,
  ].join("\n");
}

const MARKDOWN_PAGES: Record<string, () => string> = {
  "/": homeMarkdown,
  "/courses": coursesMarkdown,
  "/register": registerMarkdown,
};

export const MARKDOWN_PATHS = Object.keys(MARKDOWN_PAGES);

export function markdownForPath(path: string): string | null {
  const normalized = path === "" ? "/" : path.replace(/\/+$/, "") || "/";
  return MARKDOWN_PAGES[normalized]?.() ?? null;
}
