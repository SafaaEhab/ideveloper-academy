import "dotenv/config";
import fs from "node:fs";
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
const [rows] = await connection.query("SELECT * FROM academy_registration_requests");
fs.mkdirSync("backups/phase1", { recursive: true });
fs.writeFileSync(
  "backups/phase1/registration_requests.before-leads.json",
  JSON.stringify(rows, null, 2),
);
const [tables] = await connection.query(
  "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'academy_lead%'",
);
console.log(
  "backed up registration rows:",
  rows.length,
  "existing lead tables:",
  tables.map(row => row.name),
);
await connection.end();
