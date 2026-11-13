import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  paymentReminders,
  payments,
  students,
  subscriptions,
  type Payment,
  type PaymentReminder,
  type Subscription,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSettings, type AppSettings } from "./settings";
import {
  computeSubscriptionBalance,
  REMINDER_KIND_BY_OFFSET,
  type PaymentMethodValue,
} from "../shared/finance";
import {
  addDaysToDateKey,
  dateKeyInTimeZone,
  formatDateKeyArabic,
  zonedDateTimeToUtc,
} from "../shared/time";
import { formatMinorAmount } from "../shared/money";
import {
  getWhatsAppProvider,
  WhatsAppError,
  type WhatsAppProvider,
} from "./whatsappCloud";

/**
 * Durable payment-reminder queue.
 *
 * Reminder rows live in MySQL. The worker never depends on a browser tab and
 * survives a restart. It refuses to send when WhatsApp/template configuration
 * is missing and records the failure instead of pretending success.
 */

const STALE_SENDING_MS = 10 * 60 * 1000;

export type ReminderPlanItem = {
  kind: string;
  dueDateKey: string;
  scheduledFor: Date;
  status: "pending" | "skipped";
  skipReason?: string;
};

function kindForOffset(offset: number): string {
  return REMINDER_KIND_BY_OFFSET[offset] ?? `offset_${offset}`;
}

/**
 * Builds the four default reminders. A backdated subscription must not fire a
 * burst of old reminders: only the latest overdue step that is already due is
 * queued, while older steps are recorded as skipped.
 */
export function buildReminderPlan(input: {
  dueDateKey: string;
  offsets: number[];
  reminderHour: string;
  timeZone: string;
  now?: Date;
}): ReminderPlanItem[] {
  const now = input.now ?? new Date();
  const todayKey = dateKeyInTimeZone(now, input.timeZone);
  const offsets = [...new Set(input.offsets)].sort((a, b) => a - b);
  const overdueOffsets = offsets.filter(offset => offset > 0);
  const latestPastOverdue = [...overdueOffsets]
    .reverse()
    .find(offset => addDaysToDateKey(input.dueDateKey, offset) <= todayKey);

  return offsets.map(offset => {
    const scheduledDateKey = addDaysToDateKey(input.dueDateKey, offset);
    const scheduledFor = zonedDateTimeToUtc(
      scheduledDateKey,
      input.reminderHour,
      input.timeZone,
    );
    const kind = kindForOffset(offset);
    let status: "pending" | "skipped" = "pending";
    let skipReason: string | undefined;

    if (scheduledDateKey < todayKey) {
      if (offset < 0) {
        status = "skipped";
        skipReason = "موعد التذكير قبل الاستحقاق مضى قبل إنشاء الاشتراك";
      } else if (offset === 0) {
        status = "skipped";
        skipReason = "يوم الاستحقاق مضى قبل إنشاء الاشتراك";
      } else if (offset !== latestPastOverdue) {
        status = "skipped";
        skipReason = "تجاوزه تذكير تأخر أحدث";
      }
    } else if (scheduledDateKey === todayKey && offset < 0) {
      // The pre-due reminder's day is today; it is still useful if its hour has
      // not passed, otherwise the worker will send it late once.
      status = "pending";
    }

    return { kind, dueDateKey: input.dueDateKey, scheduledFor, status, skipReason };
  });
}

function reminderInstructions(
  settings: AppSettings,
  method: PaymentMethodValue,
): string {
  if (method === "cash") {
    return settings.cashInstructions || settings.cashHours
      ? `الدفع في مقر الأكاديمية.${settings.cashHours ? ` مواعيد العمل: ${settings.cashHours}.` : ""}${
          settings.cashInstructions ? ` ${settings.cashInstructions}` : ""
        }`
      : "الدفع في مقر الأكاديمية. مواعيد العمل غير مُكوّنة بعد — تواصل مع الأكاديمية قبل الحضور.";
  }
  if (method === "instapay") {
    return settings.instapayNumber
      ? `حوّل على إنستاباي إلى الرقم: ${settings.instapayNumber}. أرسل صورة التحويل بعد الدفع.${
          settings.instapayInstructions ? ` ${settings.instapayInstructions}` : ""
        }`
      : "بيانات إنستاباي غير مُكوّنة بعد. تواصل مع الأكاديمية لمعرفة طريقة التحويل.";
  }
  if (method === "wallet") {
    return settings.walletNumber
      ? `حوّل على المحفظة الإلكترونية إلى الرقم: ${settings.walletNumber}. أرسل صورة التحويل بعد الدفع.${
          settings.walletInstructions ? ` ${settings.walletInstructions}` : ""
        }`
      : "بيانات المحفظة الإلكترونية غير مُكوّنة بعد. تواصل مع الأكاديمية لمعرفة طريقة التحويل.";
  }
  const bankParts = [
    settings.bankName ? `البنك: ${settings.bankName}` : "",
    settings.bankAccountName ? `اسم الحساب: ${settings.bankAccountName}` : "",
    settings.bankAccountNumber ? `رقم الحساب: ${settings.bankAccountNumber}` : "",
    settings.bankIban ? `IBAN: ${settings.bankIban}` : "",
  ].filter(Boolean);
  if (!bankParts.length && !settings.bankInstructions) {
    return "بيانات التحويل البنكي غير مُكوّنة بعد. تواصل مع الأكاديمية لمعرفة طريقة التحويل.";
  }
  return `${bankParts.join(" — ")}${settings.bankInstructions ? ` ${settings.bankInstructions}` : ""}`;
}

export function buildReminderBody(input: {
  studentName: string;
  course: string;
  amountDue: string;
  dueDateKey: string;
  method: PaymentMethodValue;
  settings: AppSettings;
  kind: string;
}): string {
  if (input.kind === "thank_you") {
    return `شكراً ${input.studentName}، تم تسجيل دفعتك بالكامل لاشتراك ${input.course}. شكراً لثقتك بأكاديمية ${input.settings.academyName}.`;
  }
  return [
    `مرحباً ${input.studentName}،`,
    `تذكير ودّي بخصوص اشتراك ${input.course}.`,
    `المبلغ المتبقي: ${input.amountDue}.`,
    `تاريخ الاستحقاق: ${formatDateKeyArabic(input.dueDateKey)}.`,
    reminderInstructions(input.settings, input.method),
    "",
    input.settings.academyName,
  ].join("\n");
}

type ReminderContext = {
  reminder: PaymentReminder;
  subscription: Subscription;
  student: { id: number; name: string; phone: string | null; whatsAppOptOut: boolean };
  balance: ReturnType<typeof computeSubscriptionBalance>;
};

async function loadReminderContext(
  reminderId: number,
): Promise<ReminderContext | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      reminder: paymentReminders,
      subscription: subscriptions,
      student: {
        id: students.id,
        name: students.name,
        phone: students.phone,
        whatsAppOptOut: students.whatsAppOptOut,
      },
    })
    .from(paymentReminders)
    .innerJoin(subscriptions, eq(subscriptions.id, paymentReminders.subscriptionId))
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .where(eq(paymentReminders.id, reminderId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const ledger = await db
    .select({
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(eq(payments.subscriptionId, row.subscription.id));
  const balance = computeSubscriptionBalance({
    finalAmountMinor: row.subscription.finalAmountMinor,
    dueDateKey: row.subscription.dueDateKey,
    entries: ledger,
  });
  return { ...row, balance };
}

async function templateParameterCount(
  provider: WhatsAppProvider,
  name: string,
  language: string,
): Promise<number | null> {
  const template = await provider.getTemplate(name, language);
  if (String(template.status).toUpperCase() !== "APPROVED") {
    throw new WhatsAppError({
      code: "template_not_approved",
      message: `القالب "${name}" غير معتمد في Meta (الحالة: ${template.status}). لم تُرسل أي رسالة.`,
    });
  }
  const components = template.components;
  if (!Array.isArray(components)) return null;
  const body = components.find(
    (component): component is { type?: string; text?: string } =>
      Boolean(component) &&
      typeof component === "object" &&
      (component as { type?: string }).type === "BODY",
  );
  const text = body?.text;
  if (typeof text !== "string") return null;
  const matches = [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)];
  return matches.length ? matches.length : null;
}

function isRetryable(error: unknown): { retryable: boolean; message: string } {
  if (error instanceof WhatsAppError) {
    return { retryable: error.retryable, message: error.message };
  }
  return {
    retryable: true,
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function sendReminderById(input: {
  reminderId: number;
  provider?: WhatsAppProvider;
  now?: Date;
}): Promise<{ ok: boolean; status: string; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, status: "failed", error: "قاعدة البيانات غير متاحة" };
  const now = input.now ?? new Date();
  const provider = input.provider ?? getWhatsAppProvider();
  const context = await loadReminderContext(input.reminderId);
  if (!context) {
    return { ok: false, status: "failed", error: "التذكير غير موجود" };
  }
  const { reminder, subscription, student, balance } = context;

  if (reminder.status === "sent") {
    return { ok: true, status: "sent" };
  }
  if (reminder.status === "cancelled" || reminder.status === "skipped") {
    return { ok: false, status: reminder.status, error: reminder.error ?? undefined };
  }

  const mark = async (
    status: PaymentReminder["status"],
    patch: Partial<typeof paymentReminders.$inferInsert> = {},
  ) => {
    await db
      .update(paymentReminders)
      .set({ status, lastAttemptAt: now, updatedAt: now, ...patch })
      .where(eq(paymentReminders.id, reminder.id));
  };

  if (subscription.status === "cancelled") {
    await mark("cancelled", { cancellationReason: "الاشتراك ملغي" });
    return { ok: false, status: "cancelled", error: "الاشتراك ملغي" };
  }
  if (subscription.status === "completed") {
    await mark("cancelled", { cancellationReason: "الاشتراك مكتمل" });
    return { ok: false, status: "cancelled" };
  }
  if (reminder.kind !== "thank_you" && !subscription.reminderEnabled) {
    await mark("skipped", { error: "التذكيرات موقوفة لهذا الاشتراك" });
    return { ok: false, status: "skipped", error: "التذكيرات موقوفة" };
  }
  if (reminder.kind !== "thank_you" && balance.fullyPaid) {
    await mark("cancelled", { cancellationReason: "تم سداد الاشتراك بالكامل" });
    return { ok: false, status: "cancelled", error: "تم سداد الاشتراك بالكامل" };
  }
  if (student.whatsAppOptOut) {
    await mark("skipped", { error: "الطالب أوقف رسائل واتساب" });
    return { ok: false, status: "skipped", error: "الطالب أوقف رسائل واتساب" };
  }

  const settings = await getSettings();
  if (!settings.reminderEnabled && reminder.kind !== "thank_you" && reminder.kind !== "manual") {
    await mark("skipped", { error: "التذكيرات التلقائية موقوفة من إعدادات الأكاديمية" });
    return { ok: false, status: "skipped", error: "التذكيرات موقوفة" };
  }

  const isThankYou = reminder.kind === "thank_you";
  const templateName = isThankYou
    ? settings.thankYouTemplateName
    : settings.paymentReminderTemplateName;
  const templateLanguage = isThankYou
    ? settings.thankYouTemplateLanguage
    : settings.paymentReminderTemplateLanguage;

  const body = buildReminderBody({
    studentName: student.name,
    course: subscription.course,
    amountDue: formatMinorAmount(balance.remainingMinor, { withCurrency: true }),
    dueDateKey: subscription.dueDateKey,
    method: subscription.paymentMethod,
    settings,
    kind: reminder.kind,
  });

  await mark("sending", {
    messageBody: body,
    templateName: templateName || null,
    templateLanguage: templateLanguage || null,
  });

  try {
    if (!provider.configured) {
      throw new WhatsAppError({
        code: "not_configured",
        message:
          "واتساب غير مهيأ على السيرفر. لم تُرسل الرسالة. أضف متغيرات WhatsApp في إعدادات السيرفر أولاً.",
      });
    }
    if (!templateName) {
      throw new WhatsAppError({
        code: "template_missing",
        message: isThankYou
          ? "لم يتم تكوين قالب رسالة الشكر المعتمد في إعدادات الرسائل."
          : "لم يتم تكوين قالب تذكير الدفع المعتمد في إعدادات الرسائل.",
      });
    }

    const expectedCount = await templateParameterCount(
      provider,
      templateName,
      templateLanguage,
    );
    const parameters = isThankYou
      ? [student.name, subscription.course, settings.academyName]
      : [
          student.name,
          subscription.course,
          formatMinorAmount(balance.remainingMinor, { withCurrency: true }),
          subscription.dueDateKey,
          reminderInstructions(settings, subscription.paymentMethod),
        ];
    if (expectedCount != null && expectedCount !== parameters.length) {
      throw new WhatsAppError({
        code: "template_missing",
        message: `القالب "${templateName}" يتوقع ${expectedCount} متغيرات لكن النظام يرسل ${parameters.length}. عدّل القالب أو إعدادات التذكير.`,
      });
    }

    const result = await provider.sendTemplate({
      to: student.phone ?? "",
      templateName,
      language: templateLanguage,
      parameters,
    });

    await mark("sent", {
      sentAt: now,
      providerMessageId: result.providerMessageId,
      error: null,
      attempts: reminder.attempts + 1,
    });
    return { ok: true, status: "sent" };
  } catch (error) {
    const { retryable, message } = isRetryable(error);
    const attempts = reminder.attempts + 1;
    const canRetry = retryable && attempts <= settings.retryLimit;
    if (canRetry) {
      const backoff = Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempts - 1));
      await mark("pending", {
        attempts,
        error: message.slice(0, 1000),
        scheduledFor: new Date(now.getTime() + backoff),
      });
      return { ok: false, status: "pending", error: message };
    }
    await mark("failed", {
      attempts,
      error: message.slice(0, 1000),
    });
    return { ok: false, status: "failed", error: message };
  }
}

/** Creates the pending reminder rows for one subscription, idempotently. */
export async function ensureRemindersForSubscription(input: {
  subscriptionId: number;
  now?: Date;
}): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0 };
  const now = input.now ?? new Date();
  const settings = await getSettings();
  const rows = await db
    .select({ subscription: subscriptions, student: students })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .where(eq(subscriptions.id, input.subscriptionId))
    .limit(1);
  const row = rows[0];
  if (!row) return { created: 0, skipped: 0 };
  if (row.subscription.status !== "active" || !row.subscription.reminderEnabled) {
    return { created: 0, skipped: 0 };
  }
  if (row.student.whatsAppOptOut) {
    await cancelRemindersForSubscription(
      row.subscription.id,
      "الطالب أوقف رسائل واتساب",
    );
    return { created: 0, skipped: 0 };
  }

  const ledger = await db
    .select({
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(eq(payments.subscriptionId, row.subscription.id));
  const balance = computeSubscriptionBalance({
    finalAmountMinor: row.subscription.finalAmountMinor,
    dueDateKey: row.subscription.dueDateKey,
    entries: ledger,
    todayKey: dateKeyInTimeZone(now, settings.timezone),
  });
  if (balance.fullyPaid) {
    await cancelRemindersForSubscription(
      row.subscription.id,
      "تم سداد الاشتراك بالكامل",
    );
    return { created: 0, skipped: 0 };
  }

  const plan = buildReminderPlan({
    dueDateKey: row.subscription.dueDateKey,
    offsets: settings.reminderOffsets,
    reminderHour: settings.reminderHour,
    timeZone: settings.timezone,
    now,
  });
  const existing = await db
    .select()
    .from(paymentReminders)
    .where(eq(paymentReminders.subscriptionId, row.subscription.id));
  const byKey = new Map(existing.map(item => [item.dedupeKey, item]));
  let created = 0;
  let skipped = 0;

  for (const item of plan) {
    const dedupeKey = `${row.subscription.id}:${item.kind}:${row.subscription.dueDateKey}`;
    const found = byKey.get(dedupeKey);
    if (found) {
      // A reminder cancelled by a paid balance becomes relevant again only
      // after a reversal, and only while its scheduled time is still ahead.
      if (
        found.status === "cancelled" &&
        item.status === "pending" &&
        item.scheduledFor.getTime() > now.getTime()
      ) {
        await db
          .update(paymentReminders)
          .set({
            status: "pending",
            scheduledFor: item.scheduledFor,
            error: null,
            cancellationReason: null,
            updatedAt: now,
          })
          .where(eq(paymentReminders.id, found.id));
        created += 1;
      }
      continue;
    }
    await db
      .insert(paymentReminders)
      .values({
        subscriptionId: row.subscription.id,
        kind: item.kind as PaymentReminder["kind"],
        dueDateKey: item.dueDateKey,
        scheduledFor: item.scheduledFor,
        status: item.status,
        error: item.skipReason ?? null,
        dedupeKey,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });
    if (item.status === "pending") created += 1;
    else skipped += 1;
    byKey.set(dedupeKey, {
      ...(byKey.get(dedupeKey) ?? ({} as PaymentReminder)),
      id: 0,
      dedupeKey,
      status: item.status,
    } as PaymentReminder);
  }
  return { created, skipped };
}

export async function cancelRemindersForSubscription(
  subscriptionId: number,
  reason: string,
  now: Date = new Date(),
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .update(paymentReminders)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: reason.slice(0, 500),
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentReminders.subscriptionId, subscriptionId),
        inArray(paymentReminders.status, ["pending", "failed"]),
      ),
    );
  return Number(result[0]?.affectedRows ?? 0);
}

export async function queueThankYouForPayment(input: {
  payment: Payment;
  now?: Date;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const settings = await getSettings();
  if (!settings.thankYouEnabled) return false;
  const rows = await db
    .select({ subscription: subscriptions, student: students })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .where(eq(subscriptions.id, input.payment.subscriptionId))
    .limit(1);
  const row = rows[0];
  if (!row || row.student.whatsAppOptOut) return false;
  const now = input.now ?? new Date();
  const dedupeKey = `${input.payment.subscriptionId}:thank_you:payment:${input.payment.id}`;
  await db
    .insert(paymentReminders)
    .values({
      subscriptionId: input.payment.subscriptionId,
      paymentId: input.payment.id,
      kind: "thank_you",
      dueDateKey: row.subscription.dueDateKey,
      scheduledFor: now,
      status: "pending",
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: now } });
  return true;
}

export async function createManualReminder(input: {
  subscriptionId: number;
  actorUserId: number | null;
  now?: Date;
}): Promise<{ reminderId: number; status: string; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const now = input.now ?? new Date();
  const rows = await db
    .select({ subscription: subscriptions, student: students })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .where(eq(subscriptions.id, input.subscriptionId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("الاشتراك غير موجود");
  if (row.subscription.status !== "active") {
    throw new Error("لا يمكن إرسال تذكير لاشتراك غير نشط");
  }
  if (row.student.whatsAppOptOut) {
    throw new Error("الطالب أوقف رسائل واتساب. لا يمكن إرسال تذكير.");
  }
  const ledger = await db
    .select({
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(eq(payments.subscriptionId, input.subscriptionId));
  const balance = computeSubscriptionBalance({
    finalAmountMinor: row.subscription.finalAmountMinor,
    dueDateKey: row.subscription.dueDateKey,
    entries: ledger,
  });
  if (balance.fullyPaid) {
    throw new Error("الاشتراك مدفوع بالكامل؛ لا حاجة لتذكير.");
  }

  const dedupeKey = `${input.subscriptionId}:manual:${now.getTime()}`;
  const inserted = await db.insert(paymentReminders).values({
    subscriptionId: input.subscriptionId,
    kind: "manual",
    dueDateKey: row.subscription.dueDateKey,
    scheduledFor: now,
    status: "pending",
    createdByUserId: input.actorUserId,
    dedupeKey,
    createdAt: now,
    updatedAt: now,
  });
  const reminderId = Number(inserted[0].insertId);
  const result = await sendReminderById({ reminderId, now });
  return { reminderId, status: result.status, error: result.error };
}

/** Marks stale `sending` rows failed rather than risking a duplicate resend. */
async function recoverStaleSending(now: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(paymentReminders)
    .set({
      status: "failed",
      error:
        "توقفت العملية قبل تأكيد المزود. لم تُعد المحاولة تلقائياً لتجنب تكرار الرسالة؛ راجع السجل ثم أعد المحاولة يدوياً.",
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentReminders.status, "sending"),
        lte(paymentReminders.lastAttemptAt, new Date(now.getTime() - STALE_SENDING_MS)),
        sql`${paymentReminders.providerMessageId} is null`,
      ),
    );
}

export async function processDueReminders(options?: {
  provider?: WhatsAppProvider;
  now?: Date;
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const db = await getDb();
  const result = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  if (!db) return result;
  const now = options?.now ?? new Date();
  await recoverStaleSending(now);
  const due = await db
    .select({ id: paymentReminders.id })
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.status, "pending"),
        lte(paymentReminders.scheduledFor, now),
      ),
    )
    .orderBy(asc(paymentReminders.scheduledFor))
    .limit(Math.max(1, Math.min(options?.limit ?? 20, 50)));

  for (const row of due) {
    const claimed = await db
      .update(paymentReminders)
      .set({
        status: "sending",
        lastAttemptAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentReminders.id, row.id),
          eq(paymentReminders.status, "pending"),
          lte(paymentReminders.scheduledFor, now),
        ),
      );
    if (Number(claimed[0]?.affectedRows ?? 0) !== 1) continue;
    result.processed += 1;
    const sent = await sendReminderById({
      reminderId: row.id,
      provider: options?.provider,
      now,
    });
    if (sent.status === "sent") result.sent += 1;
    else if (sent.status === "pending") result.failed += 1;
    else result.skipped += 1;
  }
  return result;
}
