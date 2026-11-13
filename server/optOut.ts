import { and, eq, inArray } from "drizzle-orm";
import {
  campaignRecipients,
  paymentReminders,
  subscriptions,
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Opt-out side effects.
 *
 * The worker also re-checks every recipient immediately before sending, so this
 * is defence in depth: it stops already-queued campaign rows and pending
 * student reminders at the moment the preference changes.
 */
export async function applyOptOutSideEffects(input: {
  phone: string | null;
  studentId?: number | null;
  reason: string;
}): Promise<{ campaignsCancelled: number; remindersCancelled: number }> {
  const db = await getDb();
  if (!db) return { campaignsCancelled: 0, remindersCancelled: 0 };
  const now = new Date();
  let campaignsCancelled = 0;
  if (input.phone) {
    const result = await db
      .update(campaignRecipients)
      .set({
        status: "cancelled",
        exclusionReason: "opted_out",
        error: input.reason.slice(0, 1000),
        updatedAt: now,
      })
      .where(
        and(
          eq(campaignRecipients.phone, input.phone),
          inArray(campaignRecipients.status, ["queued", "sending"]),
        ),
      );
    campaignsCancelled = Number(result[0]?.affectedRows ?? 0);
  }

  let remindersCancelled = 0;
  if (input.studentId) {
    const subs = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.studentId, input.studentId),
          eq(subscriptions.status, "active"),
        ),
      );
    if (subs.length) {
      const result = await db
        .update(paymentReminders)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: input.reason.slice(0, 500),
          updatedAt: now,
        })
        .where(
          and(
            inArray(
              paymentReminders.subscriptionId,
              subs.map(row => row.id),
            ),
            inArray(paymentReminders.status, ["pending", "failed"]),
          ),
        );
      remindersCancelled = Number(result[0]?.affectedRows ?? 0);
    }
  }
  return { campaignsCancelled, remindersCancelled };
}
