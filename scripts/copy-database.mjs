/**
 * Copies every table and row from the current Aiven MySQL database into the
 * new MonsterASP MySQL database, preserving ids, timestamps and the Drizzle
 * migration history.
 *
 * Usage (PowerShell):
 *   $env:SOURCE_DATABASE_URL="mysql://user:pass@host:port/db?ssl-mode=REQUIRED"
 *   $env:TARGET_DATABASE_URL="mysql://user:pass@monster-host:3306/db"
 *   node scripts/copy-database.mjs --replace
 *
 * `--replace` is required when the target already contains data; it drops the
 * target tables before recreating them from the source schema. Without it the
 * script refuses to touch a non-empty target.
 */
import mysql from "mysql2/promise";

function parseUrl(raw, label) {
  if (!raw) throw new Error(`${label} is required`);
  const url = new URL(raw);
  const sslMode = (
    url.searchParams.get("ssl-mode") ??
    url.searchParams.get("sslmode") ??
    url.searchParams.get("sslaccept") ??
    ""
  ).toUpperCase();
  const useSsl = sslMode !== "" && sslMode !== "DISABLED" && sslMode !== "OFF";
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\/+/, "")),
    charset: "utf8mb4",
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectTimeout: 20_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const replace = process.argv.includes("--replace");

const sourceConfig = parseUrl(sourceUrl, "SOURCE_DATABASE_URL");
const targetConfig = parseUrl(targetUrl, "TARGET_DATABASE_URL");

function quote(name) {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

/** MariaDB rejects MySQL 8 collations such as utf8mb4_0900_ai_ci. */
function portableCreateStatement(sql) {
  return (
    sql
      // Aiven runs with ANSI_QUOTES, so SHOW CREATE TABLE quotes identifiers
      // with `"..."`. MariaDB on Monster treats those as string literals.
      .replace(/"/g, "`")
      .replace(/\s+AUTO_INCREMENT=\d+/gi, "")
      .replace(/\s+COLLATE[= ]\w+/gi, "")
      .replace(/\s+CHARACTER SET \w+/gi, "")
      .replace(/\s+DEFAULT CHARSET=\w+/gi, "")
  );
}

function valueForInsert(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

async function main() {
  console.log(`Source: ${sourceConfig.host}/${sourceConfig.database}`);
  console.log(`Target: ${targetConfig.host}/${targetConfig.database}`);
  console.log(`Mode:   ${replace ? "replace target tables" : "create missing tables only"}`);

  const source = await mysql.createConnection(sourceConfig);
  const target = await mysql.createConnection(targetConfig);

  try {
    const [tableRows] = await source.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
    );
    const tables = tableRows.map(row => String(row.name));
    if (tables.length === 0) throw new Error("Source database has no tables");

    const [existingRows] = await target.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );
    const existing = new Set(existingRows.map(row => String(row.name)));

    if (!replace) {
      for (const table of tables) {
        if (!existing.has(table)) continue;
        const [countRows] = await target.query(`SELECT COUNT(*) AS count FROM ${quote(table)}`);
        if (Number(countRows[0].count) > 0) {
          throw new Error(
            `Target table ${table} already has ${countRows[0].count} rows. Re-run with --replace to overwrite it.`,
          );
        }
      }
    }

    await target.query("SET FOREIGN_KEY_CHECKS=0");
    let totalRows = 0;

    for (const table of tables) {
      const [createRows] = await source.query(`SHOW CREATE TABLE ${quote(table)}`);
      const createSql = portableCreateStatement(String(createRows[0]["Create Table"]));
      if (replace) await target.query(`DROP TABLE IF EXISTS ${quote(table)}`);
      await target.query(createSql);

      const [rows] = await source.query(`SELECT * FROM ${quote(table)}`);
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const updateColumns = columns.filter(column => column !== "id");
      const updateClause = updateColumns.length
        ? ` ON DUPLICATE KEY UPDATE ${updateColumns.map(column => `${quote(column)}=VALUES(${quote(column)})`).join(", ")}`
        : "";
      // Attachments can be multi-MB, so that table is inserted one row at a time.
      const chunkSize = table === "academy_assignment_files" ? 1 : 100;

      for (let offset = 0; offset < rows.length; offset += chunkSize) {
        const chunk = rows
          .slice(offset, offset + chunkSize)
          .map(row => columns.map(column => valueForInsert(row[column])));
        await target.query(
          `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES ?${updateClause}`,
          [chunk],
        );
      }

      totalRows += rows.length;
      console.log(`  ${table}: ${rows.length} rows`);
    }

    // Keep AUTO_INCREMENT above the highest id that was copied.
    for (const table of tables) {
      const [columns] = await source.query(
        `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND EXTRA LIKE '%auto_increment%' LIMIT 1`,
        [table],
      );
      if (columns.length === 0) continue;
      const column = String(columns[0].name);
      const [maxRows] = await source.query(`SELECT MAX(${quote(column)}) AS maxId FROM ${quote(table)}`);
      const maxId = Number(maxRows[0].maxId ?? 0);
      if (maxId > 0) {
        await target.query(`ALTER TABLE ${quote(table)} AUTO_INCREMENT = ${maxId + 1}`);
      }
    }

    await target.query("SET FOREIGN_KEY_CHECKS=1");

    console.log("\nVerification:");
    for (const table of tables) {
      const [countRows] = await target.query(`SELECT COUNT(*) AS count FROM ${quote(table)}`);
      console.log(`  ${table}: ${countRows[0].count}`);
    }
    console.log(`\nDone. Copied ${totalRows.toLocaleString()} rows across ${tables.length} tables.`);
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
}

main().catch(error => {
  console.error("\nCopy failed:", error.message);
  process.exitCode = 1;
});
