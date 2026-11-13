import { and, eq } from "drizzle-orm";
import { leadStaff } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Phase 2 authorization actor.
 *
 * Admins always pass. Reception staff must have an active `academy_lead_staff`
 * row and the specific permission flag. Being able to open the leads workspace
 * is not the same as being allowed to read financial reports or salaries.
 */
export type Phase2Actor = {
  userId: number;
  displayName: string | null;
  isAdmin: boolean;
  staffId: number | null;
  messaging: boolean;
  payments: boolean;
  subscriptions: boolean;
  reports: boolean;
  expenses: boolean;
  salaries: boolean;
  financeSettings: boolean;
};

const ADMIN_ACTOR = (user: {
  id: number;
  name?: string | null;
  email?: string | null;
}): Phase2Actor => ({
  userId: user.id,
  displayName: user.name ?? user.email ?? null,
  isAdmin: true,
  staffId: null,
  messaging: true,
  payments: true,
  subscriptions: true,
  reports: true,
  expenses: true,
  salaries: true,
  financeSettings: true,
});

export async function resolvePhase2Actor(user: {
  id: number;
  role: string;
  name?: string | null;
  email?: string | null;
}): Promise<Phase2Actor> {
  if (user.role === "admin") return ADMIN_ACTOR(user);

  const fallback: Phase2Actor = {
    userId: user.id,
    displayName: user.name ?? user.email ?? null,
    isAdmin: false,
    staffId: null,
    messaging: false,
    payments: false,
    subscriptions: false,
    reports: false,
    expenses: false,
    salaries: false,
    financeSettings: false,
  };

  const db = await getDb();
  if (!db) return fallback;

  const rows = await db
    .select()
    .from(leadStaff)
    .where(and(eq(leadStaff.userId, user.id), eq(leadStaff.active, true)))
    .limit(1);
  const staff = rows[0];
  if (!staff) return fallback;

  return {
    ...fallback,
    displayName: staff.displayName ?? fallback.displayName,
    staffId: staff.id,
    messaging: Boolean(staff.canMessaging),
    payments: Boolean(staff.canRecordPayments),
    subscriptions: Boolean(staff.canManageSubscriptions),
    reports: Boolean(staff.canViewReports),
    expenses: Boolean(staff.canManageExpenses),
    salaries: Boolean(staff.canViewSalaries),
    financeSettings: Boolean(staff.canManageFinanceSettings),
  };
}

/** Permission flags exposed to the client; these are cosmetic only. */
export function publicPhase2Permissions(actor: Phase2Actor) {
  return {
    messaging: actor.messaging,
    payments: actor.payments,
    subscriptions: actor.subscriptions,
    reports: actor.reports,
    expenses: actor.expenses,
    salaries: actor.salaries,
    financeSettings: actor.financeSettings,
  };
}
