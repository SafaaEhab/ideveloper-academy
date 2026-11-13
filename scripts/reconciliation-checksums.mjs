/**
 * READ-ONLY checksum comparison against the pre-Phase-2 manifest.
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
const manifest = JSON.parse(
  fs.readFileSync(path.join(dir, manifests[manifests.length - 1]), "utf8"),
);
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const tables = Object.keys(manifest.tables);
const [rows] = await connection.query(
  `CHECKSUM TABLE ${tables.map(table => `\`${table}\``).join(", ")}`,
);
const byName = new Map(
  rows.map(row => [String(row.Table).split(".").pop(), String(row.Checksum)]),
);
const results = tables.map(table => ({
  table,
  before: manifest.tables[table].checksum,
  after: byName.get(table) ?? null,
  match: (byName.get(table) ?? null) === manifest.tables[table].checksum,
}));
console.log(JSON.stringify({
  manifest: manifests[manifests.length - 1],
  matched: results.filter(row => row.match).length,
  total: results.length,
  mismatches: results.filter(row => !row.match),
}, null, 2));
await connection.end();
