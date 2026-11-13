import { formatMinorAmount } from "@shared/money";

export function money(minor: number | null | undefined): string {
  return formatMinorAmount(Number(minor ?? 0), { withCurrency: true });
}

export function moneyPlain(minor: number | null | undefined): string {
  return (Number(minor ?? 0) / 100).toFixed(2);
}

export function downloadBase64File(fileName: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function todayDateKey(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dateTimeLocalValue(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function statusTone(status: string): string {
  switch (status) {
    case "paid":
    case "sent":
    case "delivered":
    case "read":
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "due":
    case "queued":
    case "scheduled":
    case "partially_paid":
    case "pending":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "overdue":
    case "failed":
    case "rejected":
    case "disabled":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "sending":
      return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: "مدفوع",
    due: "مستحق",
    overdue: "متأخر",
    partially_paid: "مدفوع جزئياً",
  };
  return labels[status] ?? status;
}

export function campaignStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "مسودة",
    scheduled: "مجدولة",
    queued: "في الانتظار",
    sending: "جاري الإرسال",
    completed: "مكتملة",
    cancelled: "ملغاة",
    failed: "فشلت",
  };
  return labels[status] ?? status;
}

export function recipientStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: "في الانتظار",
    excluded: "مستبعد",
    sending: "جاري الإرسال",
    sent: "تم الإرسال",
    delivered: "تم التوصيل",
    read: "تمت القراءة",
    failed: "فشل",
    cancelled: "ملغي",
  };
  return labels[status] ?? status;
}

export function reminderKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    before_due_3: "قبل الاستحقاق 3 أيام",
    due: "يوم الاستحقاق",
    overdue_2: "متأخر يومان",
    overdue_7: "متأخر 7 أيام",
    manual: "تذكير يدوي",
    thank_you: "رسالة شكر",
  };
  return labels[kind] ?? kind;
}

export function reminderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "في الانتظار",
    sending: "جاري الإرسال",
    sent: "تم الإرسال",
    failed: "فشل",
    cancelled: "ملغي",
    skipped: "تم التجاوز",
  };
  return labels[status] ?? status;
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: "تحويل بنكي",
    instapay: "إنستاباي",
    cash: "نقداً في الأكاديمية",
    wallet: "محفظة إلكترونية",
  };
  return labels[method] ?? method;
}

export function subscriptionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    monthly: "شهري",
    two_months: "كل شهرين",
    one_time: "دفعة واحدة",
  };
  return labels[type] ?? type;
}

export function expenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    rent: "إيجار",
    trainer_salaries: "رواتب المدربين",
    equipment: "أجهزة ومعدات",
    other: "أخرى",
  };
  return labels[category] ?? category;
}
