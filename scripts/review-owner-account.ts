/**
 * Seeds or removes the temporary Owner account used by the final review.
 * It never touches the real owner account or any existing production row.
 *
 *   REVIEW_OWNER_EMAIL=... REVIEW_OWNER_PASSWORD=... pnpm exec tsx scripts/review-owner-account.ts seed
 *   REVIEW_OWNER_EMAIL=... pnpm exec tsx scripts/review-owner-account.ts cleanup
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { userCredentials, users } from "../drizzle/schema";
import { getDb, upsertCredential, upsertUser } from "../server/db";
import { hashPassword } from "../server/_core/password";

const action = process.argv[2];
const email = process.env.REVIEW_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.REVIEW_OWNER_PASSWORD;

if (!email) throw new Error("REVIEW_OWNER_EMAIL is required");
const db = await getDb();
if (!db) throw new Error("DATABASE_URL is required");

if (action === "seed") {
  if (!password || password.length < 12) {
    throw new Error("REVIEW_OWNER_PASSWORD must be at least 12 characters");
  }
  const hash = hashPassword(password);
  await upsertCredential({
    email,
    passwordHash: hash.hash,
    salt: hash.salt,
  });
  await upsertUser({
    openId: `email:${email}`,
    email,
    name: "مراجع المالك",
    loginMethod: "email",
    role: "admin",
    lastSignedIn: new Date(),
  });
  console.log("REVIEW_OWNER_SEEDED", email);
} else if (action === "cleanup") {
  await db.delete(users).where(eq(users.email, email));
  await db.delete(userCredentials).where(eq(userCredentials.email, email));
  console.log("REVIEW_OWNER_REMOVED", email);
} else {
  throw new Error("Use seed or cleanup");
}
process.exit(0);
