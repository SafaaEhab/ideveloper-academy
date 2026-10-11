import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression cover for the signup-privilege-escalation hole.
 *
 * `ADMIN_EMAILS` is a list of addresses, and an address is not proof of identity:
 * anyone can type anyone else's email into a signup form. So a password account
 * must never inherit the admin allow-list, or a stranger could take the panel over
 * simply by guessing the owner's address.
 *
 * Each test names the attack it stops.
 */

const writtenRows: { table: unknown; values: Record<string, unknown> }[] = [];

/** Stand-in for the drizzle client, recording every row `upsertUser` would write. */
const fakeDb = {
  insert: (table: any) => {
    let pending: Record<string, unknown> = {};
    const builder: any = {
      values: (values: Record<string, unknown>) => {
        pending = values;
        return builder;
      },
      onDuplicateKeyUpdate: () => {
        writtenRows.push({ table, values: { ...pending } });
        return Promise.resolve();
      },
    };
    return builder;
  },
  select: () => ({
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
};

// Mock the driver, not `db.ts` itself — the module calls `getDb()` internally, so
// replacing the drizzle factory is what makes those internal calls land on the fake.
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fakeDb }));

import { getTableName } from "drizzle-orm";
import { upsertUser, createPendingAccount } from "./db";
import { ENV } from "./_core/env";

const OWNER_EMAIL = "owner@example.test";
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

function roleWrittenTo(tableName: string, email: string): unknown {
  return writtenRows.find(
    row => getTableName(row.table as any) === tableName && row.values?.email === email,
  )?.values?.role;
}

describe("self-asserted emails never earn the admin role", () => {
  const originalAdminEmails = ENV.adminEmails;
  const originalOwnerEmail = ENV.ownerEmail;

  beforeAll(() => {
    process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/test";
  });

  afterAll(() => {
    if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  });

  beforeEach(() => {
    writtenRows.length = 0;
    ENV.adminEmails = [OWNER_EMAIL, "teacher@example.test"];
    ENV.ownerEmail = OWNER_EMAIL;
  });

  it("does not promote a password account claiming an allow-listed address", async () => {
    // The attack: sign up using the owner's own email, which sits in ADMIN_EMAILS.
    await upsertUser(
      {
        openId: "email:owner@example.test",
        email: OWNER_EMAIL,
        name: "Impostor",
        loginMethod: "email",
      },
      { allowAdminPromotion: false },
    );

    expect(roleWrittenTo("users", OWNER_EMAIL)).toBeUndefined();
  });

  it("still promotes a provider-verified sign-in on an allow-listed address", async () => {
    // OAuth carries an address the provider vouched for, so the allow-list still
    // applies there — this is what keeps a real owner or invited teammate working.
    await upsertUser({
      openId: "oauth:owner",
      email: OWNER_EMAIL,
      name: "Owner",
      loginMethod: "manus",
    });

    expect(roleWrittenTo("users", OWNER_EMAIL)).toBe("admin");
  });

  it("files an access request as a plain user, never as an admin", async () => {
    await createPendingAccount({
      email: OWNER_EMAIL,
      name: "Impostor",
      password: "whatever-long",
    });

    expect(roleWrittenTo("users", OWNER_EMAIL)).toBe("user");
    // The credential is stored hashed — the plaintext never reaches the row.
    const credential = writtenRows.find(row => row.table === "user_credentials");
    expect(credential?.values?.passwordHash).not.toBe("whatever-long");
  });
});
