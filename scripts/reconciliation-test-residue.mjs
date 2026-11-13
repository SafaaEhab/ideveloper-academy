/**
 * READ-ONLY classification of test residue. Never prints passwords/hashes.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [credentialRows] = await connection.query(
  `SELECT email FROM user_credentials ORDER BY email`,
);
const classify = email => {
  if (email.startsWith("phase1-")) return "phase1-test";
  if (email.startsWith("phase2-")) return "phase2-test";
  if (email.includes("@example.com")) return "example-domain";
  return "other";
};
const counts = {};
for (const row of credentialRows) {
  const key = classify(String(row.email));
  counts[key] = (counts[key] ?? 0) + 1;
}
const [users] = await connection.query(
  `SELECT id, email, role, createdAt FROM users ORDER BY id`,
);
const [orphanCreds] = await connection.query(
  `SELECT c.email FROM user_credentials c
     LEFT JOIN users u ON u.email = c.email
    WHERE u.id IS NULL ORDER BY c.email`,
);
const [locks] = await connection.query(
  `SELECT dedupeKey FROM academy_lead_dedupe_locks ORDER BY dedupeKey`,
);
console.log(JSON.stringify({
  credentialCount: credentialRows.length,
  credentialClassification: counts,
  users: users.map(row => ({
    id: Number(row.id),
    emailPattern: String(row.email ?? "").replace(/^[^@]+/, "<local>"),
    role: row.role,
    createdAt: row.createdAt,
  })),
  orphanCredentials: orphanCreds.length,
  dedupeLocks: locks.length,
  dedupeLockSamplePrefixes: locks.slice(0, 5).map(row => String(row.dedupeKey).slice(0, 12)),
}, null, 2));
await connection.end();
