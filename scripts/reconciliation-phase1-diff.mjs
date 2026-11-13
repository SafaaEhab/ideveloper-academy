/**
 * READ-ONLY comparison: pre-migration backup manifest vs current Aiven DB.
 * No writes.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const dir = "backups/phase2";
const manifests = fs
  .readdirSync(dir)
  .filter(name => name.endsWith(".manifest.json"))
  .sort();
const manifestPath = path.join(dir, manifests[manifests.length - 1]);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.query(
  `SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
);
const currentNames = new Set(rows.map(row => row.name));
const comparisons = [];
for (const [table, info] of Object.entries(manifest.tables)) {
  const [countRows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  const current = Number(countRows[0].n);
  comparisons.push({
    table,
    before: info.rows,
    after: current,
    delta: current - info.rows,
    tablePresent: currentNames.has(table),
  });
}
console.log(JSON.stringify({
  manifest: manifestPath,
  manifestSha256: manifest.fileSha256,
  originalTableCount: Object.keys(manifest.tables).length,
  currentTableCount: currentNames.size,
  comparisons: comparisons.filter(row => row.delta !== 0 || !row.tablePresent),
  unchanged: comparisons.filter(row => row.delta === 0 && row.tablePresent).length,
}, null, 2));
await connection.end();
