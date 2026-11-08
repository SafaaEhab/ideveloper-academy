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

const [testLeads] = await connection.query(
  "SELECT id FROM academy_leads WHERE fullName LIKE 'طالب اختبار%' OR fullName LIKE 'E2E عميل%' OR studentPhone IN ('+201070138826')",
);
const leadIds = testLeads.map(row => row.id);
if (leadIds.length > 0) {
  const marks = leadIds.map(() => "?").join(",");
  await connection.query(`DELETE FROM academy_lead_sync_jobs WHERE leadId IN (${marks})`, leadIds);
  await connection.query(`DELETE FROM academy_lead_activities WHERE leadId IN (${marks})`, leadIds);
  await connection.query(`DELETE FROM academy_leads WHERE id IN (${marks})`, leadIds);
}

const [testStudents] = await connection.query(
  "SELECT id FROM academy_students WHERE name LIKE 'طالب اختبار%' OR name LIKE 'E2E عميل%'",
);
const studentIds = testStudents.map(row => row.id);
if (studentIds.length > 0) {
  const marks = studentIds.map(() => "?").join(",");
  await connection.query(`DELETE FROM academy_student_courses WHERE studentId IN (${marks})`, studentIds);
  await connection.query(`DELETE FROM academy_students WHERE id IN (${marks})`, studentIds);
}

const [testStaff] = await connection.query(
  "SELECT id FROM academy_lead_staff WHERE email LIKE 'phase1-%'",
);
if (testStaff.length > 0) {
  await connection.query("DELETE FROM academy_lead_staff WHERE email LIKE 'phase1-%'");
}
await connection.query("DELETE FROM user_credentials WHERE email LIKE 'phase1-%'");
await connection.query("DELETE FROM users WHERE email LIKE 'phase1-%'");
await connection.query("DELETE FROM academy_leads WHERE fullName LIKE 'طالب اختبار%'");
await connection.query("DELETE FROM academy_leads WHERE fullName LIKE 'E2E عميل%'");

console.log({ deletedLeads: leadIds.length, deletedStudents: studentIds.length });
await connection.end();
process.exit(0);
