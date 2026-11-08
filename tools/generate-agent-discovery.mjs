import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Generates the static agent-discovery documents from one source of truth.
 *
 * Run automatically before every production build. The generated files are also
 * committed so previews and local builds behave predictably.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "client", "public");
// Public pages live on Vercel; the API and database live on MonsterASP.
// Both can be overridden at build time if the split changes.
const ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || "https://ideveloper-academy.vercel.app").replace(/\/$/, "");
const API_ORIGIN = (process.env.PUBLIC_API_ORIGIN || "https://ideveloper-academy.runasp.net").replace(/\/$/, "");

const CONTENT_SIGNAL = "Content-Signal: ai-train=no, search=yes, ai-input=no";

// Keep this list in sync with shared/discovery.ts. The discovery test compares
// the sitemap against PUBLIC_PAGES so drift fails CI.
const PAGES = ["/", "/courses", "/register", "/terms", "/privacy"];

const PRIVATE_RULES = [
  "Disallow: /admin",
  "Disallow: /student",
  "Disallow: /instructor",
  "Disallow: /login",
  "Disallow: /api/trpc/admin.",
  "Disallow: /api/trpc/instructor.",
  "Disallow: /api/trpc/portal.",
  "Disallow: /api/trpc/auth.",
  "Disallow: /api/assignment-files/",
  "Allow: /",
  "Allow: /api/trpc/site.",
  "Allow: /api/health",
  "Allow: /api.md",
  "Allow: /auth.md",
  "Allow: /.well-known/",
  "Allow: /robots.txt",
  "Allow: /sitemap.xml",
];

const SEARCH_AGENTS = [
  "OAI-SearchBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "ChatGPT-User",
  "Claude-User",
  "Perplexity-User",
];

const TRAINING_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
];

const robots = [
  "# iDeveloper Academy public discovery and AI crawler policy",
  "",
  "# AI content usage preferences for this site.",
  CONTENT_SIGNAL,
  "",
  "User-agent: *",
  CONTENT_SIGNAL,
  ...PRIVATE_RULES,
  "",
  "# AI search and user-triggered fetchers may index public pages.",
  ...SEARCH_AGENTS.flatMap(agent => [`User-agent: ${agent}`]),
  CONTENT_SIGNAL,
  ...PRIVATE_RULES,
  "",
  "# Model-training crawlers are not permitted to ingest the site.",
  ...TRAINING_AGENTS.flatMap(agent => [`User-agent: ${agent}`]),
  "Content-Signal: ai-train=no, search=no, ai-input=no",
  "Disallow: /",
  "",
  `Sitemap: ${ORIGIN}/sitemap.xml`,
  // `Agentmap` is not a standard robots.txt directive and makes Lighthouse
  // report the file as invalid. The AI catalog is linked from the homepage
  // Link header and the .well-known directory instead.
  "# Agentmap: " + `${ORIGIN}/.well-known/ai-catalog.json`,
  "",
].join("\n");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...PAGES.map(page => `  <url><loc>${ORIGIN}${page}</loc></url>`),
  "</urlset>",
  "",
].join("\n");

const apiCatalog = {
  linkset: [
    {
      anchor: `${API_ORIGIN}/api/trpc`,
      "service-doc": [
        {
          href: `${ORIGIN}/api.md`,
          type: "text/markdown",
        },
      ],
      status: [
        {
          href: `${API_ORIGIN}/api/health`,
          type: "application/json",
        },
      ],
      describedby: [
        {
          href: `${ORIGIN}/.well-known/ai-catalog.json`,
          type: "application/json",
        },
      ],
    },
  ],
};

const ard = {
  specVersion: "1.0",
  host: {
    displayName: "iDeveloper Academy",
    identifier: "did:web:ideveloper-academy.vercel.app",
  },
  entries: [
    {
      identifier: "urn:air:ideveloper-academy.vercel.app:site:home",
      displayName: "iDeveloper Academy homepage",
      type: "text/html",
      url: `${ORIGIN}/`,
      representativeQueries: [
        "what is iDeveloper Academy",
        "where is the academy in Banha",
        "what age groups does the academy teach",
      ],
    },
    {
      identifier: "urn:air:ideveloper-academy.vercel.app:site:courses",
      displayName: "iDeveloper Academy public course catalogue",
      type: "text/html",
      url: `${ORIGIN}/courses`,
      representativeQueries: [
        "which programming courses are available for children",
        "does the academy teach Scratch and Python",
        "is the robotics course running",
      ],
    },
    {
      identifier: "urn:air:ideveloper-academy.vercel.app:api:course-availability",
      displayName: "Public course availability API",
      type: "application/json",
      url: `${API_ORIGIN}/api/trpc/site.courses`,
      representativeQueries: [
        "get current course availability",
        "which courses are coming soon",
        "which course is live right now",
      ],
    },
    {
      identifier: "urn:air:ideveloper-academy.vercel.app:doc:api",
      displayName: "iDeveloper Academy public API documentation",
      type: "text/markdown",
      url: `${ORIGIN}/api.md`,
      representativeQueries: [
        "how do I call the academy course API",
        "what public tRPC procedures exist",
        "which endpoints need a student session",
      ],
    },
    {
      identifier: "urn:air:ideveloper-academy.vercel.app:site:register",
      displayName: "iDeveloper Academy registration page",
      type: "text/html",
      url: `${ORIGIN}/register`,
      representativeQueries: [
        "how do I register a child at the academy",
        "what information does the registration form need",
        "can I register without WhatsApp",
      ],
    },
  ],
};

const skills = [
  {
    name: "ideveloper-course-discovery",
    description:
      "Discover iDeveloper Academy courses, current availability, and the correct public booking or waiting-list action.",
    file: path.join(
      PUBLIC,
      ".well-known",
      "agent-skills",
      "course-discovery",
      "SKILL.md",
    ),
    url: `${ORIGIN}/.well-known/agent-skills/course-discovery/SKILL.md`,
  },
  {
    name: "ideveloper-public-site-guide",
    description:
      "Navigate the public iDeveloper Academy website, understand registration, and avoid private areas.",
    file: path.join(
      PUBLIC,
      ".well-known",
      "agent-skills",
      "public-site-guide",
      "SKILL.md",
    ),
    url: `${ORIGIN}/.well-known/agent-skills/public-site-guide/SKILL.md`,
  },
];

const mcpCard = {
  $schema: "https://modelcontextprotocol.io/schemas/server-card/v1.json",
  version: "1.0",
  protocolVersion: "2025-06-18",
  serverInfo: {
    name: "ideveloper-academy",
    title: "iDeveloper Academy",
    version: "1.0.0",
    description:
      "Public read-only course catalogue, achievements and announcement for iDeveloper Academy in Banha, Egypt.",
    websiteUrl: ORIGIN,
  },
  transport: {
    type: "streamable-http",
    endpoint: `${API_ORIGIN}/mcp`,
  },
  capabilities: {
    tools: { listChanged: false },
  },
  authentication: { required: false },
};

const poppy = {
  protocol_version: "0.1",
  organization: {
    name: "iDeveloper Academy",
    domain: new URL(ORIGIN).hostname,
  },
  web: {},
};

const skillIndex = {
  $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  skills: skills.map(skill => {
    const digest = createHash("sha256").update(fs.readFileSync(skill.file)).digest("hex");
    return {
      name: skill.name,
      type: "skill-md",
      description: skill.description,
      url: skill.url,
      digest: `sha256:${digest}`,
    };
  }),
};

function write(relativePath, content) {
  const target = path.join(PUBLIC, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

write("robots.txt", robots);
write("sitemap.xml", sitemap);
write(".well-known/api-catalog", `${JSON.stringify(apiCatalog, null, 2)}\n`);
write(".well-known/ai-catalog.json", `${JSON.stringify(ard, null, 2)}\n`);
write(".well-known/agent-skills/index.json", `${JSON.stringify(skillIndex, null, 2)}\n`);
write(".well-known/mcp/server-card.json", `${JSON.stringify(mcpCard, null, 2)}\n`);
write(".well-known/poppy.json", `${JSON.stringify(poppy, null, 2)}\n`);

console.log(
  "Generated agent discovery: robots.txt, sitemap.xml, api-catalog, ai-catalog.json, agent-skills/index.json, mcp/server-card.json, poppy.json",
);
