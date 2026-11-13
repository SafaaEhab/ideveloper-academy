/**
 * READ-ONLY production reconciliation. Never prints credentials.
 * It does not write, migrate, or alter any row/schema.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const raw = process.env.DATABASE_URL;
if (!raw) throw new Error("DATABASE_URL is not set");
const url = new URL(raw);
const databaseFromUrl = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
const sslMode =
  url.searchParams.get("ssl-mode") ??
  url.searchParams.get("sslmode") ??
  url.searchParams.get("sslaccept") ??
  "";
const useSsl = sslMode !== "" && !["DISABLED", "OFF", "NONE"].includes(sslMode.toUpperCase());

const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: databaseFromUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  dateStrings: true,
});

const [identity] = await connection.query(
  `SELECT DATABASE() AS databaseName, @@hostname AS serverHostname,
          @@port AS serverPort, VERSION() AS version, @@server_id AS serverId`,
);
const [tables] = await connection.query(
  `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRows
     FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME`,
);
const [migrations] = await connection.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id",
);
const [phase2Tables] = await connection.query(
  `SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'academy_settings','academy_course_plans','academy_subscriptions','academy_payments',
        'academy_payment_reminders','academy_expenses','academy_message_templates',
        'academy_campaigns','academy_campaign_recipients','academy_whatsapp_webhook_events',
        'academy_messaging_opt_outs','academy_audit_logs','academy_counters'
      ) ORDER BY TABLE_NAME`,
);
const [addedColumns] = await connection.query(
  `SELECT TABLE_NAME AS t, COLUMN_NAME AS c
     FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND ((TABLE_NAME='academy_students' AND COLUMN_NAME IN
        ('whatsAppConsent','whatsAppConsentAt','whatsAppConsentSource','whatsAppOptOut','whatsAppOptOutAt','whatsAppOptOutByUserId'))
        OR (TABLE_NAME='academy_leads' AND COLUMN_NAME IN
        ('whatsAppConsent','whatsAppConsentAt','whatsAppConsentSource','whatsAppOptOutAt','whatsAppOptOutByUserId'))
        OR (TABLE_NAME='academy_lead_staff' AND COLUMN_NAME IN
        ('canMessaging','canRecordPayments','canManageSubscriptions','canViewReports','canManageExpenses','canViewSalaries','canManageFinanceSettings')))
    ORDER BY TABLE_NAME, COLUMN_NAME`,
);
const [indexes] = await connection.query(
  `SELECT TABLE_NAME AS t, INDEX_NAME AS i
     FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'academy_settings','academy_course_plans','academy_subscriptions','academy_payments',
        'academy_payment_reminders','academy_expenses','academy_message_templates',
        'academy_campaigns','academy_campaign_recipients','academy_whatsapp_webhook_events',
        'academy_messaging_opt_outs','academy_audit_logs','academy_counters'
      )
    GROUP BY TABLE_NAME, INDEX_NAME
    ORDER BY TABLE_NAME, INDEX_NAME`,
);
const counts = {};
for (const table of [
  "academy_leads","academy_lead_activities","academy_lead_sync_jobs","academy_lead_dedupe_locks","academy_lead_staff",
  "academy_students","academy_student_courses","academy_groups","academy_group_sessions",
  "academy_instructors","academy_achievements","academy_announcements","academy_course_offerings",
  "academy_registration_requests","academy_quiz_attempts","academy_assignments",
  "academy_assignment_submissions","academy_assignment_files","students","users",
  "user_credentials","access_requests","admin_invites","curriculum_curricula","student_progress",
  "academy_subscriptions","academy_payments","academy_campaigns","academy_expenses",
  "academy_message_templates","academy_audit_logs",
]) {
  try {
    const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    counts[table] = Number(rows[0].n);
  } catch {
    counts[table] = null;
  }
}

console.log(JSON.stringify({
  databaseUrl: {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port || "3306",
    database: databaseFromUrl,
    sslMode: sslMode || "(none)",
  },
  identity: identity[0],
  tableCount: tables.length,
  tables: tables.map(row => row.name),
  phase2Tables: phase2Tables.map(row => row.name),
  phase2TableCount: phase2Tables.length,
  addedColumnCount: addedColumns.length,
  addedColumns,
  phase2IndexCount: indexes.length,
  indexes,
  migrations: migrations.map(row => ({
    id: Number(row.id),
    hash: row.hash,
    createdAt: row.created_at,
  })),
  counts,
}, null, 2));

await connection.end();
