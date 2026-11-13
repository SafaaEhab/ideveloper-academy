import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
for (const table of [
  "academy_subscriptions",
  "academy_payments",
  "academy_payment_reminders",
  "academy_campaigns",
  "academy_campaign_recipients",
  "academy_expenses",
  "academy_message_templates",
  "academy_audit_logs",
  "academy_whatsapp_webhook_events",
  "academy_leads",
  "academy_students",
]) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM ${table}`);
  console.log(table, rows[0].n);
}
await connection.end();
