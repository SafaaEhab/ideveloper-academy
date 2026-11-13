import { normalizeEgyptianPhone } from "./validation";

/**
 * One vocabulary for the messaging UI, the tRPC validation layer and the
 * background worker. Exclusions are decided on the server; the client only
 * displays the reasons returned by the preview endpoint.
 */

export const MESSAGE_VARIABLES = [
  "student_name",
  "course_name",
  "class_schedule",
  "amount_due",
] as const;
export type MessageVariable = (typeof MESSAGE_VARIABLES)[number];

export const MESSAGE_VARIABLE_LABELS: Record<MessageVariable, string> = {
  student_name: "اسم الطالب",
  course_name: "اسم الكورس",
  class_schedule: "موعد الحصة",
  amount_due: "المبلغ المستحق",
};

export const TEMPLATE_CATEGORIES = [
  "welcome",
  "class_reminder",
  "payment_reminder",
  "lead_follow_up",
  "custom",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  welcome: "ترحيب",
  class_reminder: "تذكير بالحصة",
  payment_reminder: "تذكير بالدفع",
  lead_follow_up: "متابعة عميل",
  custom: "مخصص",
};

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "queued",
  "sending",
  "completed",
  "cancelled",
  "failed",
] as const;
export type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatusValue, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  queued: "في الانتظار",
  sending: "جاري الإرسال",
  completed: "مكتملة",
  cancelled: "ملغاة",
  failed: "فشلت",
};

export const RECIPIENT_STATUSES = [
  "queued",
  "excluded",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
  "cancelled",
] as const;
export type RecipientStatusValue = (typeof RECIPIENT_STATUSES)[number];

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatusValue, string> = {
  queued: "في الانتظار",
  excluded: "مستبعد",
  sending: "جاري الإرسال",
  sent: "تم الإرسال",
  delivered: "تم التوصيل",
  read: "تمت القراءة",
  failed: "فشل",
  cancelled: "ملغي",
};

export const EXCLUSION_REASONS = [
  "not_interested",
  "opted_out",
  "missing_phone",
  "invalid_phone",
  "no_consent",
  "template_ineligible",
  "duplicate",
  "subscription_inactive",
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

export const EXCLUSION_REASON_LABELS: Record<ExclusionReason, string> = {
  not_interested: "غير راغب في الإكمال",
  opted_out: "أوقف الرسائل",
  missing_phone: "لا يوجد رقم هاتف",
  invalid_phone: "رقم هاتف غير صالح",
  no_consent: "لا توجد موافقة على الرسائل التسويقية",
  template_ineligible: "لا يمكنه استلام القالب المختار",
  duplicate: "مكرر في الاختيار",
  subscription_inactive: "لا يوجد اشتراك نشط",
};

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of String(body ?? "").matchAll(VARIABLE_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}

export function validateKnownVariables(body: string): {
  ok: boolean;
  unknown: string[];
  known: string[];
} {
  const found = extractVariables(body);
  const known = found.filter((name): name is MessageVariable =>
    (MESSAGE_VARIABLES as readonly string[]).includes(name),
  );
  const unknown = found.filter(
    name => !(MESSAGE_VARIABLES as readonly string[]).includes(name),
  );
  return { ok: unknown.length === 0, unknown, known };
}

export type RenderResult = {
  text: string;
  missing: string[];
  used: string[];
};

/**
 * Replaces the four supported variables. Missing values are visibly rendered
 * as `—` and listed, so a confirmation can never hide a missing name or amount.
 */
export function renderMessage(
  body: string,
  values: Partial<Record<MessageVariable | string, string | null | undefined>>,
): RenderResult {
  const missing = new Set<string>();
  const used = new Set<string>();
  const text = String(body ?? "").replace(VARIABLE_PATTERN, (_match, rawName) => {
    const name = String(rawName);
    if (!(MESSAGE_VARIABLES as readonly string[]).includes(name)) {
      missing.add(name);
      return "—";
    }
    used.add(name);
    const raw = values[name];
    const value = raw == null ? "" : String(raw).trim();
    if (!value) {
      missing.add(name);
      return "—";
    }
    return value;
  });
  return { text, missing: [...missing], used: [...used] };
}

export function isValidWhatsAppPhone(value: string | null | undefined): boolean {
  const result = normalizeEgyptianPhone(value);
  return result.ok;
}

export function normalizeRecipientPhone(
  value: string | null | undefined,
): string | null {
  const result = normalizeEgyptianPhone(value);
  return result.ok ? result.value : null;
}

/** Meta template parameter order follows the declared variable order. */
export function templateParameters(
  declared: string[],
  values: Partial<Record<string, string | null | undefined>>,
): { parameters: string[]; missing: string[] } {
  const missing: string[] = [];
  const parameters = declared.map(name => {
    const value = values[name];
    const text = value == null ? "" : String(value).trim();
    if (!text) {
      missing.push(name);
      return "—";
    }
    return text;
  });
  return { parameters, missing };
}

export function isCampaignCancellable(status: string): boolean {
  return status === "scheduled" || status === "queued";
}

export function campaignProgress(input: {
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
}): number {
  const total = Math.max(0, input.totalRecipients);
  if (total === 0) return 0;
  const done = Math.max(0, input.sentCount) + Math.max(0, input.failedCount);
  return Math.min(100, Math.round((done / total) * 100));
}
