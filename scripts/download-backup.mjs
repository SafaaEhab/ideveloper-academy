/**
 * Downloads the latest Excel backup from the deployed site to this computer.
 *
 *   $env:BACKUP_SITE_URL="https://ideveloper-academy.runasp.net"
 *   $env:BACKUP_JWT_SECRET="same JWT_SECRET as the Monster panel"
 *   $env:BACKUP_EMAIL="safsafehab012345@gmail.com"
 *   node scripts/download-backup.mjs
 *
 * The file lands in `backups/excel/` with a timestamp, so a local copy exists
 * even if the hosting account is ever lost.
 *
 * If this Windows machine does not trust the new Let's Encrypt root yet, add
 * BACKUP_INSECURE=1 for this one download. Do not leave that on.
 */
import { SignJWT } from "jose";
import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = (process.env.BACKUP_SITE_URL || "https://ideveloper-academy.runasp.net").replace(/\/$/, "");
const secret = process.env.BACKUP_JWT_SECRET;
const email = (process.env.BACKUP_EMAIL || "").trim().toLowerCase();

if (!secret) {
  console.error("BACKUP_JWT_SECRET is required (the same value set on MonsterASP).");
  process.exit(1);
}
if (!email) {
  console.error("BACKUP_EMAIL is required (the owner email used to sign in).");
  process.exit(1);
}
if (process.env.BACKUP_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("TLS verification is disabled for this download (BACKUP_INSECURE=1).");
}

const token = await new SignJWT({
  openId: `email:${email}`,
  appId: "",
  name: "Backup download",
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(Math.floor(Date.now() / 1000) + 300)
  .sign(new TextEncoder().encode(secret));

const response = await fetch(`${siteUrl}/api/admin/backups/latest`, {
  headers: { Cookie: `app_session_id=${token}` },
});
if (!response.ok) {
  console.error(`Download failed: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve(process.cwd(), "backups", "excel");
await fs.mkdir(outDir, { recursive: true });
const target = path.join(outDir, `ideveloper-data-${stamp}.xlsx`);
const latest = path.join(outDir, "ideveloper-data-latest.xlsx");
await fs.writeFile(target, buffer);
await fs.copyFile(target, latest);
console.log(`Saved ${target} (${(buffer.length / 1024).toFixed(1)} KB)`);
console.log(`Latest copy: ${latest}`);
