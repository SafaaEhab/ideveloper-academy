/**
 * Restores a database from one of the Excel safety copies.
 *
 * The workbook carries data only, not the schema. Create the empty schema first
 * (run `pnpm db:push` against the new database, or use the SQL dump), then:
 *
 *   $env:TARGET_DATABASE_URL="mysql://user:pass@host:3306/db"
 *   node scripts/restore-from-excel.mjs App_Data/excel-backups/ideveloper-data-latest.xlsx --replace
 *
 * `--replace` truncates each target table before inserting. Without it rows are
 * upserted, so the script can resume after a partial run.
 */
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const workbookPath = process.argv[2];
const replace = process.argv.includes("--replace");
const rawUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!workbookPath) {
  console.error("Usage: node scripts/restore-from-excel.mjs <file.xlsx> [--replace]");
  process.exit(1);
}
if (!rawUrl) {
  console.error("TARGET_DATABASE_URL (or DATABASE_URL) is required");
  process.exit(1);
}

function parseUrl(raw) {
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
    supportBigNumbers: true,
    bigNumberStrings: true,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function quote(name) {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

function cellValue(value, column) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return value.result ?? null;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map(part => part.text ?? "").join("");
    }
    if ("hyperlink" in value && typeof value.text === "string") return value.text;
    return JSON.stringify(value);
  }
  if (typeof value === "string" && value.startsWith("[embedded file:")) {
    console.warn(`  ! ${column} in the workbook is a summary, not the original file bytes`);
    return "";
  }
  return value;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const config = parseUrl(rawUrl);
  const connection = await mysql.createConnection(config);
  let total = 0;

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    for (const sheet of workbook.worksheets) {
      if (sheet.name === "Backup info") continue;
      const table = sheet.name;

      const [exists] = await connection.query(
        `SELECT TABLE_NAME AS name FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [table],
      );
      if (exists.length === 0) {
        console.warn(`  ! skipping ${table}: table does not exist in the target schema`);
        continue;
      }

      const headerRow = sheet.getRow(1);
      const columns = [];
      for (let index = 1; index <= headerRow.cellCount; index += 1) {
        const value = headerRow.getCell(index).value;
        if (typeof value === "string" && value.trim()) columns.push(value.trim());
      }
      if (columns.length === 0) {
        console.warn(`  ! skipping ${table}: no header row`);
        continue;
      }

      const rows = [];
      for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
        const row = sheet.getRow(rowIndex);
        const values = columns.map((column, index) =>
          cellValue(row.getCell(index + 1).value, column),
        );
        // A blank trailing row is common in Excel; ignore it.
        if (values.every(value => value === null || value === "")) continue;
        rows.push(values);
      }

      if (replace) await connection.query(`TRUNCATE TABLE ${quote(table)}`);
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows`);
        continue;
      }

      const updateColumns = columns.filter(column => column !== "id");
      const updateClause = updateColumns.length
        ? ` ON DUPLICATE KEY UPDATE ${updateColumns.map(column => `${quote(column)}=VALUES(${quote(column)})`).join(", ")}`
        : "";
      const chunkSize = table === "academy_assignment_files" ? 1 : 100;
      for (let offset = 0; offset < rows.length; offset += chunkSize) {
        await connection.query(
          `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES ?${updateClause}`,
          [rows.slice(offset, offset + chunkSize)],
        );
      }
      total += rows.length;
      console.log(`  ${table}: ${rows.length} rows`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
    console.log(`\nRestored ${total.toLocaleString()} rows from ${workbookPath}`);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

main().catch(error => {
  console.error("\nRestore failed:", error.message);
  process.exitCode = 1;
});
