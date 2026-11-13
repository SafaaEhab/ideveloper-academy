import { createHash } from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import { and, eq, or } from "drizzle-orm";
import {
  campaignRecipients,
  leads,
  messagingOptOuts,
  students,
  whatsappWebhookEvents,
  type CampaignRecipient,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  getWhatsAppConfig,
  isOptOutMessage,
  parseWebhookPayload,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from "./whatsappCloud";
import { normalizeRecipientPhone } from "../shared/messaging";
import { writeAudit } from "./audit";
import { applyOptOutSideEffects } from "./optOut";

/**
 * Meta webhook endpoint.
 *
 * The raw body is required for the HMAC. This router is registered before the
 * global JSON parser in app.ts. When WHATSAPP_APP_SECRET is missing the endpoint
 * rejects every POST — it never trusts an unsigned webhook.
 */

const STATUS_RANK: Record<string, number> = {
  queued: 0,
  excluded: 0,
  cancelled: 0,
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function eventKeyFor(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function applyStatus(input: {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  errorMessage: string | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.providerMessageId, input.providerMessageId))
    .limit(1);
  const row = rows[0];
  if (!row) return false;

  const currentRank = STATUS_RANK[row.status] ?? 0;
  const nextRank = STATUS_RANK[input.status] ?? 0;
  // Never downgrade a delivered/read message, and never turn a delivered
  // message into failed because a late duplicate failure event arrived.
  if (input.status === "failed") {
    if (row.status === "delivered" || row.status === "read") return false;
  } else if (nextRank < currentRank) {
    return false;
  }

  const patch: Partial<typeof campaignRecipients.$inferInsert> = {
    status: input.status,
    updatedAt: new Date(),
  };
  if (input.status === "sent") patch.sentAt = row.sentAt ?? input.timestamp;
  if (input.status === "delivered") {
    patch.deliveredAt = row.deliveredAt ?? input.timestamp;
    patch.sentAt = row.sentAt ?? input.timestamp;
  }
  if (input.status === "read") {
    patch.readAt = row.readAt ?? input.timestamp;
    patch.deliveredAt = row.deliveredAt ?? input.timestamp;
    patch.sentAt = row.sentAt ?? input.timestamp;
  }
  if (input.status === "failed") {
    patch.failedAt = input.timestamp;
    patch.error = (input.errorMessage ?? "فشل الإرسال من مزود واتساب").slice(
      0,
      1000,
    );
  }
  await db
    .update(campaignRecipients)
    .set(patch)
    .where(eq(campaignRecipients.id, row.id));
  return true;
}

async function optRecipientOutByPhone(input: {
  phone: string;
  text: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const normalized = normalizeRecipientPhone(input.phone) ?? input.phone;
  const now = new Date();
  let changed = 0;

  const leadRows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      or(
        eq(leads.studentPhone, normalized),
        eq(leads.parentPhone, normalized),
      ),
    );
  for (const lead of leadRows) {
    await db
      .update(leads)
      .set({
        whatsAppOptOut: true,
        whatsAppOptOutAt: now,
        whatsAppOptOutByUserId: null,
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id));
    await db.insert(messagingOptOuts).values({
      recipientType: "lead",
      recipientId: lead.id,
      optedOut: true,
      reason: `رسالة واردة من واتساب: ${String(input.text ?? "").slice(0, 200)}`,
      changedByUserId: null,
      createdAt: now,
    });
    await writeAudit(db, {
      actorUserId: null,
      action: "messaging.opt_out",
      entityType: "lead",
      entityId: lead.id,
      metadata: { source: "whatsapp_inbound", text: input.text },
    });
    changed += 1;
  }

  const studentRows = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.phone, normalized));
  for (const student of studentRows) {
    await db
      .update(students)
      .set({
        whatsAppOptOut: true,
        whatsAppOptOutAt: now,
        whatsAppOptOutByUserId: null,
        updatedAt: now,
      })
      .where(eq(students.id, student.id));
    await db.insert(messagingOptOuts).values({
      recipientType: "student",
      recipientId: student.id,
      optedOut: true,
      reason: `رسالة واردة من واتساب: ${String(input.text ?? "").slice(0, 200)}`,
      changedByUserId: null,
      createdAt: now,
    });
    await writeAudit(db, {
      actorUserId: null,
      action: "messaging.opt_out",
      entityType: "student",
      entityId: student.id,
      metadata: { source: "whatsapp_inbound", text: input.text },
    });
    changed += 1;
  }

  if (changed > 0) {
    for (const student of studentRows) {
      await applyOptOutSideEffects({
        phone: normalized,
        studentId: student.id,
        reason: "أوقف المستلم الرسائل عبر واتساب",
      });
    }
    if (!studentRows.length) {
      await applyOptOutSideEffects({
        phone: normalized,
        reason: "أوقف المستلم الرسائل عبر واتساب",
      });
    }
  }
  return changed;
}

async function processWebhook(raw: Buffer): Promise<{
  statuses: number;
  messages: number;
  optOuts: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const payload = JSON.parse(raw.toString("utf8")) as unknown;
  const parsed = parseWebhookPayload(payload);
  const key = eventKeyFor(raw);

  const existing = await db
    .select({ id: whatsappWebhookEvents.id, status: whatsappWebhookEvents.status })
    .from(whatsappWebhookEvents)
    .where(eq(whatsappWebhookEvents.eventKey, key))
    .limit(1);
  if (existing[0]?.status === "processed") {
    return { statuses: 0, messages: 0, optOuts: 0 };
  }

  const eventType =
    parsed.statuses.length && parsed.messages.length
      ? "mixed"
      : parsed.statuses.length
        ? "statuses"
        : parsed.messages.length
          ? "messages"
          : "unknown";

  let eventId = existing[0]?.id ?? 0;
  if (!eventId) {
    try {
      const inserted = await db.insert(whatsappWebhookEvents).values({
        eventKey: key,
        eventType,
        payload: raw.toString("utf8").slice(0, 2_000_000),
        status: "received",
        receivedAt: new Date(),
      });
      eventId = Number(inserted[0].insertId);
    } catch {
      // A concurrent delivery of the exact same payload won the unique key.
      const current = await db
        .select({ id: whatsappWebhookEvents.id })
        .from(whatsappWebhookEvents)
        .where(eq(whatsappWebhookEvents.eventKey, key))
        .limit(1);
      eventId = current[0]?.id ?? 0;
    }
  }

  try {
    let statuses = 0;
    for (const status of parsed.statuses) {
      if (
        await applyStatus({
          providerMessageId: status.providerMessageId,
          status: status.status,
          timestamp: status.timestamp,
          errorMessage: status.errorMessage,
        })
      ) {
        statuses += 1;
      }
    }
    let optOuts = 0;
    for (const message of parsed.messages) {
      if (message.type === "text" && isOptOutMessage(message.text)) {
        optOuts += await optRecipientOutByPhone({
          phone: message.from,
          text: message.text,
        });
      }
    }
    if (eventId) {
      await db
        .update(whatsappWebhookEvents)
        .set({
          status: eventType === "unknown" ? "ignored" : "processed",
          processedAt: new Date(),
          error: null,
        })
        .where(eq(whatsappWebhookEvents.id, eventId));
    }
    return { statuses, messages: parsed.messages.length, optOuts };
  } catch (error) {
    if (eventId) {
      await db
        .update(whatsappWebhookEvents)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 1000) : "webhook failed",
          processedAt: new Date(),
        })
        .where(eq(whatsappWebhookEvents.id, eventId));
    }
    throw error;
  }
}

export function registerWhatsAppWebhook(app: Express): void {
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const config = getWhatsAppConfig();
    const challenge = verifyWebhookChallenge({
      mode: req.query["hub.mode"] as string | undefined,
      token: req.query["hub.verify_token"] as string | undefined,
      challenge: req.query["hub.challenge"] as string | undefined,
      config,
    });
    if (!challenge) {
      res.status(403).json({ error: "Webhook verification failed" });
      return;
    }
    res.status(200).type("text/plain").send(challenge);
  });

  app.post(
    "/api/whatsapp/webhook",
    express.raw({ type: "application/json", limit: "2mb" }),
    async (req: Request, res: Response) => {
      const config = getWhatsAppConfig();
      if (!config.appSecret) {
        res.status(503).json({ error: "WhatsApp app secret is not configured" });
        return;
      }
      const raw = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === "string" ? req.body : "");
      const signature = req.header("x-hub-signature-256");
      if (!verifyWebhookSignature(raw, signature, config.appSecret)) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
      try {
        const result = await processWebhook(raw);
        res.status(200).json({ received: true, ...result });
      } catch (error) {
        console.error(
          "[WhatsAppWebhook] processing failed:",
          error instanceof Error ? error.message : String(error),
        );
        res.status(500).json({ error: "Webhook processing failed" });
      }
    },
  );
}

/** Exported for integration tests; bypasses HTTP but keeps idempotency. */
export const __testing = { processWebhook, applyStatus, optRecipientOutByPhone };
