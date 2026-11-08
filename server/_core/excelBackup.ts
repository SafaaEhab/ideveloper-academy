/**
 * Excel safety net for the academy database.
 *
 * Every successful write schedules a fresh `.xlsx` snapshot of every table.
 * The file lives outside the database on purpose: if MySQL is unavailable,
 * corrupted, or its hosting account is suspended, the academy still has a
 * readable copy of the data. The admin can download the latest workbook at any
 * time from `/api/admin/backups/latest` (the "Data backup" tab in the panel),
 * and the first snapshot of each day is emailed to the owner when Gmail SMTP is
 * configured.
 *
 * Two things are deliberately different from a raw SQL dump:
 *  - Long `longtext` values are capped at Excel's 32,767-character cell limit.
 *    Assignment attachments (`academy_assignment_files.dataBase64`) are replaced
 *    with a short description because a single cell cannot hold a multi-MB
 *    base64 payload. The row itself stays in MySQL and in the SQL dump.
 *  - The workbook is written atomically (temporary file + rename) so a crash in
 *    the middle of a snapshot never leaves a half-written file in place.
 */
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "./env";
import { isMailConfigured, notificationRecipients, sendMail } from "./mailer";

const EXCEL_CELL_LIMIT = 32_000;
const LARGE_TEXT_TABLE = "academy_assignment_files";
const LARGE_TEXT_COLUMN = "dataBase64";

export type BackupResult = {
  name: string;
  path: string;
  bytes: number;
  createdAt: string;
  reason: string;
  tables: number;
  rows: number;
};

type BackupRow = Record<string, unknown>;

let currentRun: Promise<BackupResult | null> | null = null;
let rerunReason: string | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let schedulerStarted = false;

function log(message: string, error?: unknown) {
  if (error) console.error(`[ExcelBackup] ${message}`, error);
  else console.log(`[ExcelBackup] ${message}`);
}

/** Directory that survives redeploys on MonsterASP (`App_Data`). */
export function backupDirectory(): string {
  const configured = process.env.EXCEL_BACKUP_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), "App_Data", "excel-backups");
}

function retentionLimit(): number {
  const parsed = Number(process.env.EXCEL_BACKUP_KEEP ?? "120");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 120;
}

function debounceMs(): number {
  const parsed = Number(process.env.EXCEL_BACKUP_DEBOUNCE_MS ?? "4000");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 4000;
}

function parseDatabaseUrl(raw: string): mysql.ConnectionOptions {
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
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
    database,
    charset: "utf8mb4",
    // `dateStrings` keeps exactly what MySQL stores instead of shifting values
    // through the Node process's local timezone on the way to Excel.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectTimeout: 20_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function safeSheetName(raw: string, used: Set<string>): string {
  const base = (raw || "sheet").replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || "sheet";
  let name = base;
  let counter = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = `_${counter++}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

function toCellValue(value: unknown, column: string): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    if (value.length > EXCEL_CELL_LIMIT) {
      return `${value.slice(0, EXCEL_CELL_LIMIT)}\n… [truncated ${value.length - EXCEL_CELL_LIMIT} characters — Excel's cell limit]`;
    }
    return value;
  }
  if (typeof value === "object") {
    try {
      const encoded = JSON.stringify(value);
      return encoded.length > EXCEL_CELL_LIMIT
        ? `${encoded.slice(0, EXCEL_CELL_LIMIT)}… [truncated]`
        : encoded;
    } catch {
      return String(value);
    }
  }
  return value as ExcelJS.CellValue;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFBFDBFE" } } };
  });
}

function estimatedWidth(value: unknown): number {
  if (value === null || value === undefined) return 10;
  if (value instanceof Date) return 20;
  const text = String(value);
  if (!text) return 10;
  const longestLine = text.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);
  return Math.min(60, Math.max(10, longestLine + 2));
}

async function addTableSheet(
  workbook: ExcelJS.Workbook,
  connection: mysql.Connection,
  table: string,
  usedNames: Set<string>,
): Promise<{ rows: number }> {
  const quotedTable = `\`${table.replace(/`/g, "``")}\``;
  const tableColumnNames = await tableColumns(connection, table);

  // Never pull multi-MB attachment bytes into the Node heap just to write a
  // one-line summary. MySQL computes the description and sends only that.
  const selectList = tableColumnNames
    .map(column => {
      const quoted = `\`${column.replace(/`/g, "``")}\``;
      return column === LARGE_TEXT_COLUMN
        ? `CONCAT('[embedded file: ', CHAR_LENGTH(${quoted}), ' base64 chars — stored in MySQL, not copied into Excel]') AS ${quoted}`
        : quoted;
    })
    .join(", ");
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    selectList ? `SELECT ${selectList} FROM ${quotedTable}` : `SELECT * FROM ${quotedTable}`,
  );
  const sheet = workbook.addWorksheet(safeSheetName(table, usedNames), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // An empty table still gets its columns so the workbook documents the schema.
  const columns =
    rows.length > 0 ? Object.keys(rows[0]) : tableColumnNames;
  if (columns.length === 0) {
    sheet.addRow(["No columns found"]);
    return { rows: 0 };
  }

  const header = sheet.addRow(columns);
  styleHeader(header);

  const widths = new Map<string, number>();
  for (const column of columns) widths.set(column, column.length + 2);

  for (const row of rows) {
    const values = columns.map(column => toCellValue(row[column], column));
    sheet.addRow(values);
    columns.forEach((column, index) => {
      const width = estimatedWidth(values[index]);
      if (width > (widths.get(column) ?? 0)) widths.set(column, width);
    });
  }

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = widths.get(column) ?? 14;
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  return { rows: rows.length };
}

async function tableColumns(connection: mysql.Connection, table: string): Promise<string[]> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [table],
  );
  return rows.map(row => String(row.name));
}

async function writeSnapshot(reason: string): Promise<BackupResult | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log("DATABASE_URL is not set — skipping Excel backup.");
    return null;
  }

  const startedAt = new Date();
  const dir = backupDirectory();
  await fs.mkdir(dir, { recursive: true });

  const connection = await mysql.createConnection(parseDatabaseUrl(databaseUrl));
  try {
    const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
    );
    const tables = tableRows.map(row => String(row.name));
    if (tables.length === 0) {
      log("No tables found — skipping Excel backup.");
      return null;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "iDeveloper Academy";
    workbook.lastModifiedBy = "iDeveloper Academy server";
    workbook.created = startedAt;
    workbook.modified = startedAt;
    workbook.subject = "iDeveloper Academy database snapshot";
    workbook.title = `Academy data backup — ${startedAt.toISOString()}`;

    const info = workbook.addWorksheet("Backup info");
    info.columns = [
      { header: "Field", key: "field", width: 28 },
      { header: "Value", key: "value", width: 80 },
    ];
    styleHeader(info.getRow(1));
    const db = parseDatabaseUrl(databaseUrl);
    const infoRows: Array<[string, string]> = [
      ["Generated at (UTC)", startedAt.toISOString()],
      ["Reason", reason],
      ["Database host", String(db.host ?? "")],
      ["Database name", String(db.database ?? "")],
      ["Tables", String(tables.length)],
      ["Sheets", "One per database table"],
      ["Long text", "Cells above Excel's 32,767-character limit are truncated and marked."],
      ["Attachments", "Assignment files are copied to the sibling files/ folder; Excel holds only a summary."],
    ];
    let totalRows = 0;
    const counts: Array<[string, number]> = [];

    const usedNames = new Set<string>(["backup info"]);
    for (const table of tables) {
      const { rows } = await addTableSheet(workbook, connection, table, usedNames);
      totalRows += rows;
      counts.push([table, rows]);
    }

    const attachments = await backupAssignmentFiles(connection, dir);
    infoRows.push([
      "Assignment files",
      `${attachments.total} file(s) in files/index.json — ${attachments.copied} new byte copy(ies) this run`,
    ]);

    for (const [field, value] of infoRows) info.addRow({ field, value });
    info.addRow({ field: "", value: "" });
    info.addRow({ field: "Table", value: "Rows" });
    styleHeader(info.getRow(info.rowCount));
    for (const [table, count] of counts) info.addRow({ field: table, value: String(count) });
    info.addRow({ field: "Total", value: String(totalRows) });

    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = Buffer.from(buffer as ArrayBuffer);
    const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
    const name = `ideveloper-data-${stamp}.xlsx`;
    const target = path.join(dir, name);
    const temp = `${target}.tmp`;
    const latest = path.join(dir, "ideveloper-data-latest.xlsx");

    await fs.writeFile(temp, bytes);
    await fs.rename(temp, target);
    await fs.copyFile(target, latest);

    const result: BackupResult = {
      name,
      path: target,
      bytes: bytes.length,
      createdAt: startedAt.toISOString(),
      reason,
      tables: tables.length,
      rows: totalRows,
    };
    log(`Saved ${name} (${bytes.length.toLocaleString("en-US")} bytes, ${tables.length} tables, ${totalRows} rows).`);

    await pruneOldBackups(dir);
    await maybeEmailDailyBackup(result);
    return result;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

/**
 * Copies assignment attachments out of `dataBase64` into a sibling `files/`
 * folder. They cannot live in Excel (a cell caps at 32,767 characters), so the
 * workbook links to this folder through `files/index.json`. Existing files are
 * skipped, which makes the cost proportional to new uploads rather than to the
 * whole archive.
 */
async function backupAssignmentFiles(
  connection: mysql.Connection,
  dir: string,
): Promise<{ total: number; copied: number }> {
  // Read metadata first — never the whole base64 archive at once. A 256 MB
  // free-plan process must be able to back up files larger than its heap.
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT storageKey, originalName, mimeType, size FROM academy_assignment_files ORDER BY id",
  );
  const filesDir = path.join(dir, "files");
  await fs.mkdir(filesDir, { recursive: true });

  const manifest: Array<{
    storageKey: string;
    originalName: string;
    mimeType: string;
    size: number;
  }> = [];
  let copied = 0;
  for (const row of rows) {
    const storageKey = String(row.storageKey ?? "");
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(storageKey)) continue;
    const target = path.join(filesDir, storageKey);
    manifest.push({
      storageKey,
      originalName: String(row.originalName ?? storageKey),
      mimeType: String(row.mimeType ?? "application/octet-stream"),
      size: Number(row.size ?? 0),
    });
    try {
      await fs.access(target);
      continue;
    } catch {
      /* not copied yet */
    }
    const [dataRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT dataBase64 FROM academy_assignment_files WHERE storageKey = ? LIMIT 1",
      [storageKey],
    );
    const encoded = String(dataRows[0]?.dataBase64 ?? "");
    if (!encoded) continue;
    await fs.writeFile(target, Buffer.from(encoded, "base64"));
    copied += 1;
  }

  await fs.writeFile(
    path.join(filesDir, "index.json"),
    JSON.stringify(
      {
        note: "Assignment attachments from academy_assignment_files. The file name is the storageKey used by the download route.",
        generatedAt: new Date().toISOString(),
        files: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  return { total: manifest.length, copied };
}

async function pruneOldBackups(dir: string): Promise<void> {
  try {
    const keep = retentionLimit();
    const entries = (await fs.readdir(dir))
      .filter(name => name.startsWith("ideveloper-data-") && name.endsWith(".xlsx"))
      .filter(name => name !== "ideveloper-data-latest.xlsx")
      .sort()
      .reverse();
    for (const name of entries.slice(keep)) {
      await fs.rm(path.join(dir, name), { force: true });
    }
  } catch (error) {
    log("Could not prune old backups.", error);
  }
}

async function emailMarkerPath(): Promise<string> {
  return path.join(backupDirectory(), ".last-email-date");
}

async function maybeEmailDailyBackup(result: BackupResult): Promise<void> {
  if (!isMailConfigured()) return;
  const recipients = notificationRecipients();
  if (recipients.length === 0) return;

  const today = result.createdAt.slice(0, 10);
  const marker = await emailMarkerPath();
  try {
    const last = await fs.readFile(marker, "utf8").catch(() => "");
    if (last.trim() === today) return;
    const bytes = await fs.readFile(result.path);
    const maxAttachment = 20 * 1024 * 1024;
    const attachment =
      bytes.length <= maxAttachment
        ? [{ filename: result.name, content: bytes }]
        : undefined;
    const sent = await sendMail({
      to: recipients.join(","),
      subject: `iDeveloper Academy data backup — ${today}`,
      text: [
        "The daily Excel snapshot of the academy database is attached.",
        "",
        `File: ${result.name}`,
        `Tables: ${result.tables}`,
        `Rows: ${result.rows}`,
        `Generated: ${result.createdAt}`,
        "",
        bytes.length > maxAttachment
          ? "The workbook is larger than 20 MB, so it was not attached. Download it from the admin panel → Data backup."
          : "You can also download it any time from the admin panel → Data backup.",
      ].join("\n"),
      ...(attachment ? { attachments: attachment } : {}),
    });
    if (sent) await fs.writeFile(marker, today, "utf8");
  } catch (error) {
    log("Daily backup email failed.", error);
  }
}

/** Creates a snapshot now. Concurrent callers share the running snapshot. */
export function runExcelBackup(reason = "manual"): Promise<BackupResult | null> {
  if (currentRun) {
    rerunReason = reason;
    return currentRun;
  }
  currentRun = (async () => {
    try {
      return await writeSnapshot(reason);
    } catch (error) {
      log(`Snapshot failed (${reason}).`, error);
      return null;
    } finally {
      currentRun = null;
      if (rerunReason) {
        const next = rerunReason;
        rerunReason = null;
        setTimeout(() => void runExcelBackup(next), 250).unref?.();
      }
    }
  })();
  return currentRun;
}

/** Debounced trigger used after writes; many rapid edits produce one snapshot. */
export function scheduleExcelBackup(reason = "database write"): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runExcelBackup(reason);
  }, debounceMs());
  debounceTimer.unref?.();
}

export async function listExcelBackups(): Promise<Array<{ name: string; bytes: number; createdAt: string }>> {
  const dir = backupDirectory();
  try {
    const names = (await fs.readdir(dir))
      .filter(name => name.startsWith("ideveloper-data-") && name.endsWith(".xlsx"))
      // `latest` is a convenience copy of the newest timestamped file, not a
      // separate snapshot; showing both makes the list look like it has a
      // duplicate.
      .filter(name => name !== "ideveloper-data-latest.xlsx")
      .sort()
      .reverse();
    const result = [];
    for (const name of names) {
      const stat = await fs.stat(path.join(dir, name));
      result.push({ name, bytes: stat.size, createdAt: stat.mtime.toISOString() });
    }
    return result;
  } catch {
    return [];
  }
}

export async function latestExcelBackup(): Promise<{ name: string; path: string; bytes: number; createdAt: string } | null> {
  const dir = backupDirectory();
  const candidate = path.join(dir, "ideveloper-data-latest.xlsx");
  try {
    const stat = await fs.stat(candidate);
    return { name: "ideveloper-data-latest.xlsx", path: candidate, bytes: stat.size, createdAt: stat.mtime.toISOString() };
  } catch {
    const backups = await listExcelBackups();
    if (backups.length === 0) return null;
    const first = backups[0];
    return { name: first.name, path: path.join(dir, first.name), bytes: first.bytes, createdAt: first.createdAt };
  }
}

/** A safe lookup for the download route: only files we created can be served. */
export async function findExcelBackup(name: string): Promise<string | null> {
  if (!/^ideveloper-data-[A-Za-z0-9._-]+\.xlsx$/.test(name)) return null;
  const dir = backupDirectory();
  const full = path.resolve(dir, name);
  if (path.dirname(full) !== path.resolve(dir)) return null;
  try {
    await fs.access(full);
    return full;
  } catch {
    return null;
  }
}

/**
 * Starts the periodic safety snapshot and the first-run snapshot. Safe to call
 * more than once; a hot reload does not stack intervals.
 */
export function startExcelBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const minutes = Math.max(5, Number(process.env.EXCEL_BACKUP_INTERVAL_MINUTES ?? "30") || 30);
  const interval = setInterval(() => void runExcelBackup("scheduled"), minutes * 60_000);
  interval.unref?.();

  if (process.env.EXCEL_BACKUP_ON_START !== "false") {
    const initial = setTimeout(() => void runExcelBackup("startup"), 8_000);
    initial.unref?.();
  }

  log(`Scheduler active: every ${minutes} minutes, folder ${backupDirectory()}`);
}

/**
 * Registers the write trigger on the Express app. A snapshot is scheduled only
 * after a successful non-GET `/api/` request; reads never cause disk writes.
 */
export function registerExcelBackupTriggers(app: import("express").Express): void {
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }
    if (!req.path.startsWith("/api/")) {
      next();
      return;
    }
    // The backup download/creation endpoints must not trigger themselves.
    if (req.path.startsWith("/api/admin/backups")) {
      next();
      return;
    }
    res.on("finish", () => {
      if (res.statusCode < 400) scheduleExcelBackup(`${req.method} ${req.path}`);
    });
    next();
  });
}
