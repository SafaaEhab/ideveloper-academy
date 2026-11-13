import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [migrations] = await connection.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 3",
);
console.log("migrations", migrations);
const [tables] = await connection.query(
  `SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('academy_subscriptions','academy_payments','academy_campaigns','academy_settings','academy_payment_reminders','academy_expenses','academy_message_templates','academy_audit_logs','academy_counters')
    ORDER BY TABLE_NAME`,
);
console.log("tables", tables);
const [columns] = await connection.query(
  `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND ((TABLE_NAME = 'academy_students' AND COLUMN_NAME LIKE 'whatsApp%')
        OR (TABLE_NAME = 'academy_lead_staff' AND COLUMN_NAME LIKE 'can%'))
    ORDER BY TABLE_NAME, COLUMN_NAME`,
);
console.log("columns", columns);
const [counts] = await connection.query(
  `SELECT 'academy_leads' AS name, COUNT(*) AS n FROM academy_leads
   UNION ALL SELECT 'academy_students', COUNT(*) FROM academy_students
   UNION ALL SELECT 'academy_registration_requests', COUNT(*) FROM academy_registration_requests
   UNION ALL SELECT 'users', COUNT(*) FROM users`,
);
console.log("phase1 counts", counts);
await connection.end();
