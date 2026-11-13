import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  campaignRecipients,
  campaigns,
  leads,
  messageTemplates,
  students,
  type Campaign,
  type CampaignRecipient,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSettings } from "./settings";
import {
  getWhatsAppProvider,
  WhatsAppError,
  type WhatsAppProvider,
} from "./whatsappCloud";
import { processDueReminders } from "./reminderScheduler";
import { writeAudit } from "./audit";
import { extractVariables } from "../shared/messaging";
import { campaignRecipientVariables } from "./messaging";

/**
 * Durable Phase 2 background worker.
 *
 * Campaign state and reminder state live in MySQL. The worker claims work with
 * conditional updates, so a restart (or a second process) cannot double-send a
 * claimed message. A crash after the provider accepted a message but before the
 * database update is deliberately NOT retried automatically: the row is marked
 * failed with an explicit note so an operator can inspect it before retrying.
 */

const STALE_CAMPAIGN_LOCK_MS = 15 * 60 * 1000;
const STALE_RECIPIENT_LOCK_MS = 15 * 60 * 1000;
const TEMPLATE_APPROVAL_CACHE_MS = 5 * 60 * 1000;

type ApprovalCacheEntry = {
  at: number;
  status: string;
  parameterCount: number | null;
};
const approvalCache = new Map<string, ApprovalCacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function providerFailure(error: unknown): {
  message: string;
  retryable: boolean;
  rateLimited: boolean;
} {
  if (error instanceof WhatsAppError) {
    return {
      message: error.message,
      retryable: error.retryable,
      rateLimited: error.code === "rate_limited",
    };
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
    rateLimited: false,
  };
}

function templateParameterCountFromComponents(components: unknown): number | null {
  if (!Array.isArray(components)) return null;
  const body = components.find(
    (component): component is { type?: string; text?: string } =>
      Boolean(component) &&
      typeof component === "object" &&
      (component as { type?: string }).type === "BODY",
  );
  if (typeof body?.text !== "string") return null;
  const matches = [...body.text.matchAll(/\{\{\s*\d+\s*\}\}/g)];
  return matches.length || null;
}

async function verifyCampaignTemplate(input: {
  provider: WhatsAppProvider;
  templateId: number | null;
}): Promise<{ name: string; language: string; variables: string[]; parameterCount: number | null } | null> {
  if (!input.templateId) return null;
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const rows = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, input.templateId))
    .limit(1);
  const template = rows[0];
  if (!template) throw new Error("القالب المختار غير موجود");
  if (!template.active) throw new Error("القالب المؤرشف لا يمكن استخدامه");
  if (!template.metaTemplateName) {
    throw new Error("القالب غير مرتبط بقالب Meta معتمد");
  }

  const cacheKey = `${template.metaTemplateName}:${template.language}`;
  const cached = approvalCache.get(cacheKey);
  let parameterCount: number | null;
  if (cached && Date.now() - cached.at < TEMPLATE_APPROVAL_CACHE_MS) {
    if (cached.status.toUpperCase() !== "APPROVED") {
      throw new Error(
        `القالب "${template.metaTemplateName}" غير معتمد في Meta (الحالة: ${cached.status}).`,
      );
    }
    parameterCount = cached.parameterCount;
  } else {
    const meta = await input.provider.getTemplate(
      template.metaTemplateName,
      template.language,
    );
    parameterCount = templateParameterCountFromComponents(meta.components);
    approvalCache.set(cacheKey, {
      at: Date.now(),
      status: meta.status,
      parameterCount,
    });
    if (String(meta.status).toUpperCase() !== "APPROVED") {
      throw new Error(
        `القالب "${template.metaTemplateName}" غير معتمد في Meta (الحالة: ${meta.status}). لم تُرسل أي رسالة.`,
      );
    }
  }

  let declared: string[] = [];
  try {
    const parsed = JSON.parse(template.variables ?? "[]") as unknown;
    if (Array.isArray(parsed)) declared = parsed.map(String);
  } catch {
    declared = [];
  }
  if (!declared.length) declared = extractVariables(template.body);
  if (
    parameterCount != null &&
    declared.length !== parameterCount
  ) {
    throw new Error(
      `القالب المعتمد يتوقع ${parameterCount} متغيرات لكن القالب المحلي يعرّف ${declared.length}. عدّل القالب المحلي ليطابق Meta.`,
    );
  }
  return {
    name: template.metaTemplateName,
    language: template.language,
    variables: declared,
    parameterCount,
  };
}

/**
 * Re-checks the live recipient row immediately before sending. A campaign
 * snapshot is not proof of consent: an opt-out, a not-interested status or a
 * removed consent after campaign creation must stop the message.
 */
async function recipientStillEligible(input: {
  recipient: CampaignRecipient;
  campaign: Campaign;
  requireMarketingConsent: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string; message: string }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "missing_recipient", message: "قاعدة البيانات غير متاحة" };
  if (input.recipient.recipientType === "lead") {
    const rows = await db
      .select({
        status: leads.status,
        optOut: leads.whatsAppOptOut,
        consent: leads.whatsAppConsent,
      })
      .from(leads)
      .where(eq(leads.id, input.recipient.recipientId))
      .limit(1);
    const lead = rows[0];
    if (!lead) return { ok: false, reason: "missing_recipient", message: "العميل لم يعد موجوداً" };
    if (lead.optOut) return { ok: false, reason: "opted_out", message: "أوقف المستلم الرسائل" };
    if (lead.status === "not_interested") {
      return { ok: false, reason: "not_interested", message: "العميل غير راغب في الإكمال" };
    }
    if (
      input.campaign.messageType === "marketing" &&
      input.requireMarketingConsent &&
      !lead.consent
    ) {
      return { ok: false, reason: "no_consent", message: "لا توجد موافقة تسويقية" };
    }
    return { ok: true };
  }
  const rows = await db
    .select({
      optOut: students.whatsAppOptOut,
      consent: students.whatsAppConsent,
    })
    .from(students)
    .where(eq(students.id, input.recipient.recipientId))
    .limit(1);
  const student = rows[0];
  if (!student) return { ok: false, reason: "missing_recipient", message: "الطالب لم يعد موجوداً" };
  if (student.optOut) return { ok: false, reason: "opted_out", message: "أوقف المستلم الرسائل" };
  if (
    input.campaign.messageType === "marketing" &&
    input.requireMarketingConsent &&
    !student.consent
  ) {
    return { ok: false, reason: "no_consent", message: "لا توجد موافقة تسويقية" };
  }
  return { ok: true };
}

async function markCampaignFailed(
  campaignId: number,
  error: string,
  now: Date,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(campaignRecipients)
    .set({
      status: "failed",
      error: error.slice(0, 1000),
      failedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        inArray(campaignRecipients.status, ["queued", "sending"]),
      ),
    );
  const counts = await db
    .select({
      status: campaignRecipients.status,
      count: sql<number>`count(*)`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .groupBy(campaignRecipients.status);
  const byStatus = Object.fromEntries(
    counts.map(row => [row.status, Number(row.count)]),
  );
  await db
    .update(campaigns)
    .set({
      status: "failed",
      failedCount: byStatus.failed ?? 0,
      sentCount: byStatus.sent ?? 0,
      completedAt: now,
      lastError: error.slice(0, 1000),
      lockedAt: null,
      lockOwner: null,
      updatedAt: now,
    })
    .where(eq(campaigns.id, campaignId));
}

async function refreshCampaignCounts(campaignId: number, now: Date): Promise<{
  sent: number;
  failed: number;
  remaining: number;
  counts: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0, remaining: 0, counts: {} };
  const rows = await db
    .select({
      status: campaignRecipients.status,
      count: sql<number>`count(*)`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .groupBy(campaignRecipients.status);
  const counts = Object.fromEntries(
    rows.map(row => [row.status, Number(row.count)]),
  );
  const sent = counts.sent ?? 0;
  const failed = counts.failed ?? 0;
  const remaining =
    (counts.queued ?? 0) + (counts.sending ?? 0);
  await db
    .update(campaigns)
    .set({
      sentCount: sent,
      failedCount: failed,
      updatedAt: now,
    })
    .where(eq(campaigns.id, campaignId));
  return { sent, failed, remaining, counts };
}

/**
 * Processes one batch of one campaign. Exported with an injectable provider and
 * sleep function so integration tests can run without real Meta calls.
 */
export async function processCampaignBatch(
  campaignId: number,
  options: {
    provider?: WhatsAppProvider;
    now?: Date;
    sleepImpl?: (ms: number) => Promise<void>;
    batchSizeOverride?: number;
    ignoreCampaignLock?: boolean;
  } = {},
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  remaining: number;
  status: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "failed", error: "قاعدة البيانات غير متاحة" };
  }
  const now = options.now ?? new Date();
  const provider = options.provider ?? getWhatsAppProvider();
  const wait = options.sleepImpl ?? sleep;
  const settings = await getSettings();

  const campaignRows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  const campaign = campaignRows[0];
  if (!campaign) {
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "failed", error: "الحملة غير موجودة" };
  }
  if (campaign.status === "cancelled") {
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "cancelled" };
  }

  // Recover rows that were left `sending` by a dead worker. They are failed,
  // not queued: a provider may have accepted the message already.
  await db
    .update(campaignRecipients)
    .set({
      status: "failed",
      error:
        "توقفت العملية قبل تسجيل تأكيد المزود. لم تُعد المحاولة تلقائياً لتجنب إرسال مزدوج؛ راجع السجل ثم أعد المحاولة يدوياً.",
      failedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "sending"),
        lte(
          campaignRecipients.lastAttemptAt,
          new Date(now.getTime() - STALE_RECIPIENT_LOCK_MS),
        ),
      ),
    );

  if (!provider.configured) {
    const message =
      "واتساب غير مهيأ على السيرفر. لم تُرسل أي رسالة. أضف متغيرات WhatsApp في إعدادات السيرفر أولاً.";
    await markCampaignFailed(campaignId, message, now);
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "failed", error: message };
  }

  let template: Awaited<ReturnType<typeof verifyCampaignTemplate>> = null;
  try {
    template = await verifyCampaignTemplate({
      provider,
      templateId: campaign.templateId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markCampaignFailed(campaignId, message, now);
    await writeAudit(db, {
      actorUserId: campaign.createdByUserId,
      action: "campaign.template_verification_failed",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { error: message.slice(0, 500) },
    });
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "failed", error: message };
  }

  if (!campaign.templateId && campaign.messageType === "marketing") {
    const message = "لا يمكن إرسال حملة تسويقية بدون قالب Meta معتمد.";
    await markCampaignFailed(campaignId, message, now);
    return { processed: 0, sent: 0, failed: 0, remaining: 0, status: "failed", error: message };
  }

  const batchSize = Math.max(
    1,
    options.batchSizeOverride ?? campaign.batchSize ?? settings.batchSize,
  );
  const queue = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "queued"),
        or(
          sql`${campaignRecipients.nextAttemptAt} is null`,
          lte(campaignRecipients.nextAttemptAt, now),
        ),
      ),
    )
    .orderBy(asc(campaignRecipients.id))
    .limit(batchSize);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let rateLimited = false;

  for (const recipient of queue) {
    // A cancellation must win even if a batch is already in progress.
    const freshCampaign = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    if (freshCampaign[0]?.status === "cancelled") break;

    const eligible = await recipientStillEligible({
      recipient,
      campaign,
      requireMarketingConsent: settings.requireMarketingConsent,
    });
    if (!eligible.ok) {
      await db
        .update(campaignRecipients)
        .set({
          status: "excluded",
          exclusionReason: eligible.reason,
          error: eligible.message,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(campaignRecipients.id, recipient.id),
            eq(campaignRecipients.status, "queued"),
          ),
        );
      await db
        .update(campaigns)
        .set({ excludedCount: sql`${campaigns.excludedCount} + 1`, updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));
      continue;
    }

    const claimed = await db
      .update(campaignRecipients)
      .set({
        status: "sending",
        lastAttemptAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaignRecipients.id, recipient.id),
          eq(campaignRecipients.status, "queued"),
        ),
      );
    if (Number(claimed[0]?.affectedRows ?? 0) !== 1) continue;
    processed += 1;

    try {
      if (!recipient.phone) throw new Error("رقم المستلم غير صالح");
      const variables = campaignRecipientVariables(recipient);
      if (template) {
        const parameters = template.variables.map(name => variables[name] ?? "—");
        const result = await provider.sendTemplate({
          to: recipient.phone,
          templateName: template.name,
          language: template.language,
          parameters,
        });
        await db
          .update(campaignRecipients)
          .set({
            status: "sent",
            providerMessageId: result.providerMessageId,
            sentAt: result.acceptedAt,
            attempts: recipient.attempts + 1,
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(campaignRecipients.id, recipient.id));
      } else {
        const result = await provider.sendText({
          to: recipient.phone,
          body: recipient.messageBody ?? campaign.body,
        });
        await db
          .update(campaignRecipients)
          .set({
            status: "sent",
            providerMessageId: result.providerMessageId,
            sentAt: result.acceptedAt,
            attempts: recipient.attempts + 1,
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(campaignRecipients.id, recipient.id));
      }
      sent += 1;
    } catch (error) {
      const failure = providerFailure(error);
      const attempts = recipient.attempts + 1;
      if (failure.rateLimited) rateLimited = true;
      const canRetry =
        failure.retryable && recipient.retryCount < settings.retryLimit;
      if (canRetry) {
        const backoff = Math.min(
          60 * 60 * 1000,
          30_000 * 2 ** Math.max(0, recipient.retryCount),
        );
        await db
          .update(campaignRecipients)
          .set({
            status: "queued",
            attempts,
            retryCount: recipient.retryCount + 1,
            nextAttemptAt: new Date(now.getTime() + backoff),
            error: failure.message.slice(0, 1000),
            updatedAt: new Date(),
          })
          .where(eq(campaignRecipients.id, recipient.id));
      } else {
        await db
          .update(campaignRecipients)
          .set({
            status: "failed",
            attempts,
            error: failure.message.slice(0, 1000),
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(campaignRecipients.id, recipient.id));
        failed += 1;
      }
    }

    if (rateLimited) {
      await db
        .update(campaigns)
        .set({
          status: "queued",
          lastError:
            "تم تجاوز حد إرسال WhatsApp مؤقتاً. أُعيدت الرسالة إلى قائمة الانتظار مع تأخير.",
          lockedAt: null,
          lockOwner: null,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));
      break;
    }

    if (campaign.delayMs > 0) await wait(campaign.delayMs);
  }

  const counts = await refreshCampaignCounts(campaignId, now);
  let status: string = campaign.status;
  if (rateLimited) {
    status = "queued";
  } else if (counts.remaining === 0) {
    status = "completed";
    await db
      .update(campaigns)
      .set({
        status: "completed",
        completedAt: now,
        lockedAt: null,
        lockOwner: null,
        updatedAt: now,
      })
      .where(eq(campaigns.id, campaignId));
    if (counts.sent > 0) {
      await writeAudit(db, {
        actorUserId: campaign.createdByUserId,
        action: "campaign.completed",
        entityType: "campaign",
        entityId: campaignId,
        metadata: { sent: counts.sent, failed: counts.failed },
      });
    }
  } else {
    status = "queued";
    await db
      .update(campaigns)
      .set({
        status: "queued",
        lockedAt: null,
        lockOwner: null,
        updatedAt: now,
      })
      .where(eq(campaigns.id, campaignId));
  }

  return {
    processed,
    sent,
    failed,
    remaining: counts.remaining,
    status,
  };
}

async function claimCampaign(
  campaign: Campaign,
  now: Date,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const owner = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await db
    .update(campaigns)
    .set({
      status: "sending",
      lockedAt: now,
      lockOwner: owner,
      startedAt: campaign.startedAt ?? now,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaigns.id, campaign.id),
        or(
          eq(campaigns.status, "queued"),
          and(
            eq(campaigns.status, "scheduled"),
            lte(campaigns.scheduledAt, now),
          ),
          and(
            eq(campaigns.status, "sending"),
            lte(
              campaigns.lockedAt,
              new Date(now.getTime() - STALE_CAMPAIGN_LOCK_MS),
            ),
          ),
        ),
      ),
    );
  return Number(result[0]?.affectedRows ?? 0) === 1;
}

let processing = false;

export async function processPhase2Queue(options?: {
  provider?: WhatsAppProvider;
  now?: Date;
  limit?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}): Promise<{
  campaigns: number;
  reminders: { processed: number; sent: number; failed: number; skipped: number };
  skipped: boolean;
}> {
  if (processing) {
    return {
      campaigns: 0,
      reminders: { processed: 0, sent: 0, failed: 0, skipped: 0 },
      skipped: true,
    };
  }
  processing = true;
  const now = options?.now ?? new Date();
  let campaignCount = 0;
  try {
    const db = await getDb();
    if (!db) {
      return {
        campaigns: 0,
        reminders: { processed: 0, sent: 0, failed: 0, skipped: 0 },
        skipped: false,
      };
    }
    const due = await db
      .select()
      .from(campaigns)
      .where(
        or(
          eq(campaigns.status, "queued"),
          and(
            eq(campaigns.status, "scheduled"),
            lte(campaigns.scheduledAt, now),
          ),
          and(
            eq(campaigns.status, "sending"),
            lte(
              campaigns.lockedAt,
              new Date(now.getTime() - STALE_CAMPAIGN_LOCK_MS),
            ),
          ),
        ),
      )
      .orderBy(asc(campaigns.scheduledAt), asc(campaigns.createdAt))
      .limit(Math.max(1, Math.min(options?.limit ?? 3, 10)));

    for (const campaign of due) {
      if (!(await claimCampaign(campaign, now))) continue;
      await processCampaignBatch(campaign.id, {
        provider: options?.provider,
        now,
        sleepImpl: options?.sleepImpl,
      });
      campaignCount += 1;
    }

    const reminders = await processDueReminders({
      provider: options?.provider,
      now,
      limit: 20,
    });
    return { campaigns: campaignCount, reminders, skipped: false };
  } catch (error) {
    console.error(
      "[Phase2Worker] queue failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      campaigns: campaignCount,
      reminders: { processed: 0, sent: 0, failed: 0, skipped: 0 },
      skipped: false,
    };
  } finally {
    processing = false;
  }
}

/** Fire-and-forget after a request; durable rows remain if the process dies. */
export function kickPhase2Worker(): void {
  setTimeout(() => {
    void processPhase2Queue();
  }, 0).unref();
}

let schedulerStarted = false;

export function startPhase2Worker(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const interval = Number(process.env.PHASE2_WORKER_INTERVAL_MS ?? "5000");
  const every =
    Number.isFinite(interval) && interval >= 2_000 ? interval : 5_000;
  const timer = setInterval(() => {
    void processPhase2Queue();
  }, every);
  timer.unref();
  const initial = setTimeout(() => {
    void processPhase2Queue();
  }, 2_500);
  initial.unref();
}

export const __testing = {
  clearApprovalCache() {
    approvalCache.clear();
  },
};
