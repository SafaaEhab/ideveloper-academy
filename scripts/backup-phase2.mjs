/**
 * Full logical backup before the Phase 2 migration.
 *
 * - Dumps every base table's CREATE statement and every row.
 * - Stores Buffers as base64 objects and timestamps as strings.
 * - Writes a manifest with row counts and MySQL CHECKSUM TABLE values.
 * - Restores the dump into temporary `_phase2_backup_test_*` tables, compares
 *   CHECKSUM TABLE results, then drops the temporary tables.
 *
 * Usage:
 *   node scripts/backup-phase2.mjs
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const connection = await mysql.createConnection({
  ...(url.protocol === "mysql:"
    ? {
        host: url.hostname,
        port: Number(url.port || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        ssl: url.searchParams.get("sslaccept") ? { rejectUnauthorized: false } : undefined,
      }
    : { uri: process.env.DATABASE_URL }),
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join("backups", "phase2");
fs.mkdirSync(dir, { recursive: true });
const dumpPath = path.join(dir, `pre-phase2-${stamp}.json`);
const manifestPath = path.join(dir, `pre-phase2-${stamp}.manifest.json`);

function quote(name) {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

function encodeValue(value) {
  if (Buffer.isBuffer(value)) {
    return { __bufferBase64: value.toString("base64") };
  }
  if (typeof value === "bigint") return { __bigint: value.toString() };
  return value;
}

function decodeValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.__bufferBase64 === "string") {
      return Buffer.from(value.__bufferBase64, "base64");
    }
    if (typeof value.__bigint === "string") return value.__bigint;
  }
  return value;
}

const [tableRows] = await connection.query(
  `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME`,
);
const tables = tableRows.map(row => String(row.name));
const dump = { createdAt: new Date().toISOString(), database: url.pathname.slice(1), tables: {} };
const manifest = { createdAt: dump.createdAt, tables: {}, fileSha256: null };

for (const table of tables) {
  const [createRows] = await connection.query(`SHOW CREATE TABLE ${quote(table)}`);
  const createSql = String(createRows[0]["Create Table"]);
  const [rows] = await connection.query(`SELECT * FROM ${quote(table)}`);
  const [checksumRows] = await connection.query(`CHECKSUM TABLE ${quote(table)}`);
  dump.tables[table] = {
    createSql,
    columns: rows.length ? Object.keys(rows[0]) : [],
    rows: rows.map(row =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encodeValue(value)])),
    ),
  };
  manifest.tables[table] = {
    rows: rows.length,
    checksum: String(checksumRows[0]?.Checksum ?? ""),
  };
}

const json = JSON.stringify(dump);
fs.writeFileSync(dumpPath, json, "utf8");
manifest.fileSha256 = createHash("sha256").update(json).digest("hex");
manifest.file = dumpPath;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`Backup written: ${dumpPath}`);
console.log(`Tables: ${tables.length} · rows: ${Object.values(manifest.tables).reduce((n, t) => n + t.rows, 0)}`);
console.log(`SHA-256: ${manifest.fileSha256}`);

// ── Verify by restoring into temporary tables ──────────────────────────────
const prefix = "_phase2_backup_test_";
const created = [];
let failures = 0;
try {
  for (const table of tables) {
    const temp = `${prefix}${table}`;
    const namePattern = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const createSql = dump.tables[table].createSql.replace(
      new RegExp(`^CREATE TABLE\\s+[\`"]${namePattern}[\`"]`),
      `CREATE TABLE \`${temp}\``,
    );
    if (!createSql.includes(`\`${temp}\``)) {
      throw new Error(`Could not rewrite CREATE TABLE for ${table}`);
    }
    await connection.query(`DROP TABLE IF EXISTS ${quote(temp)}`);
    await connection.query(createSql);
    created.push(temp);
    const rows = dump.tables[table].rows;
    if (rows.length) {
      const columns = dump.tables[table].columns;
      const chunkSize = table === "academy_assignment_files" ? 1 : 100;
      for (let offset = 0; offset < rows.length; offset += chunkSize) {
        const chunk = rows
          .slice(offset, offset + chunkSize)
          .map(row => columns.map(column => decodeValue(row[column])));
        await connection.query(
          `INSERT INTO ${quote(temp)} (${columns.map(quote).join(", ")}) VALUES ?`,
          [chunk],
        );
      }
    }
    const [checksumRows] = await connection.query(
      `CHECKSUM TABLE ${quote(table)}, ${quote(temp)}`,
    );
    const original = String(
      checksumRows.find(row => String(row.Table).split(".").pop() === table)?.Checksum ?? "",
    );
    const restored = String(
      checksumRows.find(row => String(row.Table).split(".").pop() === temp)?.Checksum ?? "",
    );
    const match = original === restored && original === manifest.tables[table].checksum;
    if (!match) {
      failures += 1;
      console.error(`CHECKSUM MISMATCH ${table}: original=${original} restored=${restored}`);
    }
  }
  if (failures) throw new Error(`${failures} tables failed backup verification`);
  console.log(`Restore verification passed for all ${tables.length} tables (temporary tables only).`);
} finally {
  for (const temp of created.reverse()) {
    await connection.query(`DROP TABLE IF EXISTS ${quote(temp)}`).catch(() => undefined);
  }
  await connection.end();
}
