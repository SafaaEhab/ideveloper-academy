import "dotenv/config";
import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});
const [leadRows] = await connection.query(
  "SELECT id, fullName, studentPhone, status, googleSheetSyncStatus, createdAt FROM academy_leads ORDER BY id",
);
console.log("leads:", leadRows);
const [usersRows] = await connection.query(
  "SELECT id, email, role FROM users WHERE email LIKE 'phase1-%' OR email LIKE 'phase1@%' OR email LIKE 'phase1-ui-%'",
);
console.log("test users:", usersRows);
const [staffRows] = await connection.query(
  "SELECT * FROM academy_lead_staff",
);
console.log("staff:", staffRows.map(row => ({ id: row.id, email: row.email, userId: row.userId })));
const [jobRows] = await connection.query(
  "SELECT id, leadId, status, attempts, lastError FROM academy_lead_sync_jobs",
);
console.log("jobs:", jobRows);
const [activityRows] = await connection.query(
  "SELECT id, leadId, type FROM academy_lead_activities",
);
console.log("activities:", activityRows);
await connection.end();
