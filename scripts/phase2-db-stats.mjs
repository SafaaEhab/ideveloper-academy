import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.query(
  `SELECT TABLE_NAME AS name,
          TABLE_ROWS AS approxRows,
          ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1) AS kb
     FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME`,
);
console.table(rows);
const [counts] = await connection.query(
  `SELECT 'academy_leads' AS name, COUNT(*) AS n FROM academy_leads
   UNION ALL SELECT 'academy_students', COUNT(*) FROM academy_students
   UNION ALL SELECT 'academy_payments', COUNT(*) FROM academy_payments
   UNION ALL SELECT 'academy_subscriptions', COUNT(*) FROM academy_subscriptions`,
).catch(() => [[]]);
console.table(counts);
await connection.end();
