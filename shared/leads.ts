/**
 * The lead pipeline, shared by the server, the public registration form and the
 * Arabic dashboard. Keeping the status vocabulary in one place means a status
 * saved by the API can never render as a raw enum value in the table.
 */

export const LEAD_STATUSES = [
  "new",
  "needs_follow_up",
  "subscribed",
  "not_interested",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "جديد",
  needs_follow_up: "يحتاج اتصال / متابعة",
  subscribed: "تم التواصل والاشتراك",
  not_interested: "غير راغب في الإكمال",
};

/** Short labels for the inline status Select. */
export const LEAD_STATUS_SHORT_LABELS: Record<LeadStatus, string> = {
  new: "جديد",
  needs_follow_up: "يحتاج متابعة",
  subscribed: "اشترك",
  not_interested: "غير راغب",
};

export const LEAD_STATUS_DESCRIPTIONS: Record<LeadStatus, string> = {
  new: "تسجيل جديد لم يتم التواصل معه بعد.",
  needs_follow_up: "تم تسجيل الطلب ويحتاج اتصالاً أو متابعة.",
  subscribed: "تم التواصل وتم تحويل العميل إلى طالب.",
  not_interested: "تم التواصل والعميل غير راغب في الإكمال.",
};

export const LEAD_STATUS_TONES: Record<LeadStatus, string> = {
  new: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  needs_follow_up:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  subscribed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  not_interested:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const NOT_INTERESTED_REASONS = [
  "price",
  "schedule",
  "location",
  "other",
] as const;

export type NotInterestedReason = (typeof NOT_INTERESTED_REASONS)[number];

export const NOT_INTERESTED_REASON_LABELS: Record<NotInterestedReason, string> =
  {
    price: "السعر",
    schedule: "الموعد",
    location: "المكان",
    other: "غيره",
  };

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  website: "الموقع الإلكتروني",
  admin: "إضافة يدوية",
  legacy: "طلب تسجيل قديم",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "ذكر",
  female: "أنثى",
};

export const COURSE_LABELS: Record<string, string> = {
  Scratch: "Scratch",
  Robotics: "Robotics",
  Web: "Web",
  Python: "Python",
};

export const LEAD_ACTIVITY_LABELS: Record<string, string> = {
  created: "تم تسجيل العميل",
  status_changed: "تغيير الحالة",
  note_added: "إضافة ملاحظة",
  contact_logged: "تسجيل تواصل",
  follow_up_set: "تحديد موعد متابعة",
  employee_assigned: "تعيين موظف",
  converted: "تحويل إلى طالب",
  duplicate_attempt: "محاولة تسجيل مكررة",
  sheet_sync_failed: "فشل النسخ إلى Google Sheets",
  sheet_sync_succeeded: "تم النسخ إلى Google Sheets",
  updated: "تحديث بيانات العميل",
};

export function leadStatusLabel(value: string | null | undefined): string {
  if (value && value in LEAD_STATUS_LABELS) {
    return LEAD_STATUS_LABELS[value as LeadStatus];
  }
  return value ?? "";
}

export function genderLabel(value: string | null | undefined): string {
  return value ? (GENDER_LABELS[value] ?? value) : "";
}

export function notInterestedReasonLabel(
  value: string | null | undefined
): string {
  if (value && value in NOT_INTERESTED_REASON_LABELS) {
    return NOT_INTERESTED_REASON_LABELS[value as NotInterestedReason];
  }
  return value ?? "";
}
