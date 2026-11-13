import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [events] = await connection.query(
  "DELETE FROM academy_whatsapp_webhook_events WHERE payload LIKE ?",
  ["%waba-test%"],
);
const [audit] = await connection.query(
  "DELETE FROM academy_audit_logs WHERE action = ? AND metadata LIKE ?",
  ["messaging.opt_out", "%whatsapp_inbound%"],
);
console.log("deleted events", events.affectedRows, "audit", audit.affectedRows);
await connection.end();
