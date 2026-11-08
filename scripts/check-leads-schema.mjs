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
const [tables] = await connection.query(
  "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'academy_lead%'",
);
console.log("lead tables:", tables.map(row => row.name));
const [migrations] = await connection.query(
  "SELECT id, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 2",
);
console.log("migrations:", migrations);
const [counts] = await connection.query(
  "SELECT (SELECT COUNT(*) FROM academy_leads) AS leads, (SELECT COUNT(*) FROM academy_registration_requests) AS legacy",
);
console.log("counts:", counts[0]);
await connection.end();
