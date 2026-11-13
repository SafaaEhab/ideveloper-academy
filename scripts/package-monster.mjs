/**
 * Builds the single ZIP that is uploaded to MonsterASP's File Manager and
 * extracted into /wwwroot.
 *
 * The production server is a fully bundled `dist/server.cjs`, so the archive
 * does not need node_modules. The client is in `dist/public`, and `web.config`
 * starts the Node process through HttpPlatformHandler.
 *
 * Usage:
 *   pnpm build
 *   pnpm package:monster
 */
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "release", "monsterasp");
const siteDir = path.join(outDir, "site");
const zipPath = path.join(outDir, "monsterasp-site.zip");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(existsSync(path.join(root, "dist", "server.cjs")), "dist/server.cjs is missing — run `pnpm build` first.");
assert(existsSync(path.join(root, "dist", "public", "index.html")), "dist/public/index.html is missing — run `pnpm build` first.");

await rm(outDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });

await cp(path.join(root, "web.config"), path.join(siteDir, "web.config"));
await cp(path.join(root, "dist", "server.cjs"), path.join(siteDir, "dist", "server.cjs"));
await cp(path.join(root, "dist", "public"), path.join(siteDir, "dist", "public"), { recursive: true });

// A short deployment note travels with the archive so the folder is
// self-explanatory when opened in the panel.
await writeFile(
  path.join(outDir, "README.txt"),
  [
    "MonsterASP deployment package",
    "",
    "1. Upload monsterasp-site.zip in Website → Files.",
    "2. Unzip into /wwwroot, with overwrite enabled.",
    "3. Set the environment variables in Website → Scripting → Environment variables:",
    "   DATABASE_URL, JWT_SECRET, ADMIN_EMAILS, OWNER_EMAIL, OWNER_OPEN_ID,",
    "   SITE_URL, WEB_ORIGIN, GMAIL_USER, GMAIL_APP_PASSWORD (optional),",
    "   CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET (optional),",
    "   GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY,",
    "   GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_SHEET_NAME (optional).",
    "   Phase 2 WhatsApp (optional until live messaging is approved):",
    "   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,",
    "   WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_WEBHOOK_VERIFY_TOKEN,",
    "   WHATSAPP_APP_SECRET, WHATSAPP_API_VERSION=v21.0.",
    "4. Apply docs/phase2-migration.sql (backup first) if the database is not migrated.",
    "5. Restart the application. The Phase 2 worker starts with the Node process.",
    "",
    "The server reads .env too, but panel variables are safer.",
    "Excel backups are written to App_Data/excel-backups.",
  ].join("\r\n"),
  "utf8",
);

// Compress-Archive is available on every Windows machine this project runs on;
// the archive is built from inside `site` so /wwwroot gets the files directly.
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${path.join(siteDir, "*")}' -DestinationPath '${zipPath}' -Force`,
  ],
  { stdio: "inherit" },
);

const info = await stat(zipPath);
console.log(`\nCreated ${zipPath}`);
console.log(`Size: ${(info.size / 1024 / 1024).toFixed(1)} MB`);
console.log("Upload it in MonsterASP → Website → Files, then Unzip into /wwwroot.");
