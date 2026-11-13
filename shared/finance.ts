import {
  addDaysToDateKey,
  addMonthsToDateKey,
  currentMonthRange,
  dateKeyInTimeZone,
  differenceInDateKeys,
  isValidDateKey,
  DEFAULT_ACADEMY_TIMEZONE,
} from "./time";
import { percentOfMinor } from "./money";

export const PAYMENT_METHODS = [
  "bank_transfer",
  "instapay",
  "cash",
  "wallet",
] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  bank_transfer: "تحويل بنكي",
  instapay: "إنستاباي",
  cash: "نقداً في الأكاديمية",
  wallet: "محفظة إلكترونية",
};

export const SUBSCRIPTION_TYPES = ["monthly", "two_months", "one_time"] as const;
export type SubscriptionTypeValue = (typeof SUBSCRIPTION_TYPES)[number];

export const SUBSCRIPTION_TYPE_LABELS: Record<SubscriptionTypeValue, string> = {
  monthly: "شهري",
  two_months: "كل شهرين",
  one_time: "دفعة واحدة للكورس",
};

export const PAYMENT_STATUSES = [
  "paid",
  "due",
  "overdue",
  "partially_paid",
] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  paid: "مدفوع",
  due: "مستحق",
  overdue: "متأخر",
  partially_paid: "مدفوع جزئياً",
};

export const EXPENSE_CATEGORIES = [
  "rent",
  "trainer_salaries",
  "equipment",
  "other",
] as const;
export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryValue, string> = {
  rent: "إيجار",
  trainer_salaries: "رواتب المدربين",
  equipment: "أجهزة ومعدات",
  other: "أخرى",
};

export const REMINDER_OFFSETS = [-3, 0, 2, 7] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

export const REMINDER_KIND_BY_OFFSET: Record<number, string> = {
  [-3]: "before_due_3",
  [0]: "due",
  [2]: "overdue_2",
  [7]: "overdue_7",
};

export const REMINDER_KIND_LABELS: Record<string, string> = {
  before_due_3: "قبل الاستحقاق بـ 3 أيام",
  due: "يوم الاستحقاق",
  overdue_2: "متأخر يومان",
  overdue_7: "متأخر 7 أيام",
  manual: "تذكير يدوي",
  thank_you: "رسالة شكر",
};

export const OVERPAYMENT_POLICIES = ["credit", "refund_required"] as const;
export type OverpaymentPolicy = (typeof OVERPAYMENT_POLICIES)[number];

export type LedgerEntry = {
  type: "payment" | "reversal";
  status: "posted" | "reversed";
  amountMinor: number;
};

export type SubscriptionBalance = {
  /** Valid payments minus posted reversals. */
  netPaidMinor: number;
  /** Never negative: the obligation's unpaid amount. */
  remainingMinor: number;
  /** Amount paid above the obligation; policy is documented, not auto-refunded. */
  overpaidMinor: number;
  fullyPaid: boolean;
  partiallyPaid: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  status: PaymentStatusValue;
};

/**
 * Balances are always derived from the immutable ledger, never from a cached
 * "paid" flag. A payment whose own status is `reversed` is excluded; its
 * reversal row is then subtracted.
 */
export function computeSubscriptionBalance(input: {
  finalAmountMinor: number;
  dueDateKey: string;
  entries: LedgerEntry[];
  todayKey?: string;
  timeZone?: string;
}): SubscriptionBalance {
  const finalAmount = Math.max(0, Math.trunc(input.finalAmountMinor || 0));
  let netPaid = 0;
  for (const entry of input.entries) {
    // A reversed payment and its reversal cancel each other. The payment row is
    // included even when its status is `reversed` so the pair nets to zero;
    // skipping the payment while subtracting the reversal would double-count
    // the correction and produce a negative balance.
    if (entry.type === "payment") {
      netPaid += Math.trunc(entry.amountMinor || 0);
    } else if (entry.type === "reversal" && entry.status === "posted") {
      netPaid -= Math.trunc(entry.amountMinor || 0);
    }
  }
  // A reversal larger than the original should not create a negative ledger;
  // it is capped at the original by the service layer, but clamp defensively.
  if (netPaid < 0) netPaid = 0;

  const remaining = Math.max(0, finalAmount - netPaid);
  const overpaid = Math.max(0, netPaid - finalAmount);
  const todayKey =
    input.todayKey ??
    dateKeyInTimeZone(new Date(), input.timeZone ?? DEFAULT_ACADEMY_TIMEZONE);
  const daysOverdue = input.dueDateKey
    ? Math.max(0, differenceInDateKeys(input.dueDateKey, todayKey))
    : 0;
  const isOverdue = remaining > 0 && Boolean(input.dueDateKey) && daysOverdue > 0;
  const fullyPaid = remaining === 0;
  const partiallyPaid = !fullyPaid && netPaid > 0;

  let status: PaymentStatusValue;
  if (fullyPaid) status = "paid";
  else if (isOverdue) status = "overdue";
  else if (partiallyPaid) status = "partially_paid";
  else status = "due";

  return {
    netPaidMinor: netPaid,
    remainingMinor: remaining,
    overpaidMinor: overpaid,
    fullyPaid,
    partiallyPaid,
    isOverdue,
    daysOverdue,
    status,
  };
}

export function computeSubscriptionAmounts(input: {
  baseAmountMinor: number;
  siblingDiscountPercent?: number;
  manualDiscountMinor?: number;
}): {
  baseAmountMinor: number;
  siblingDiscountMinor: number;
  manualDiscountMinor: number;
  finalAmountMinor: number;
} {
  const base = Math.max(0, Math.trunc(input.baseAmountMinor || 0));
  const sibling = Math.min(
    base,
    percentOfMinor(base, input.siblingDiscountPercent ?? 0),
  );
  const manualRaw = Math.max(0, Math.trunc(input.manualDiscountMinor || 0));
  const manual = Math.min(base - sibling, manualRaw);
  return {
    baseAmountMinor: base,
    siblingDiscountMinor: sibling,
    manualDiscountMinor: manual,
    finalAmountMinor: base - sibling - manual,
  };
}

export function subscriptionEndDateKey(
  startDateKey: string,
  type: SubscriptionTypeValue,
): string | null {
  if (type === "monthly") {
    return addDaysToDateKey(addMonthsToDateKey(startDateKey, 1), -1);
  }
  if (type === "two_months") {
    return addDaysToDateKey(addMonthsToDateKey(startDateKey, 2), -1);
  }
  return null;
}

export function nextRenewalDateKey(
  currentDueDateKey: string,
  type: SubscriptionTypeValue,
): string | null {
  if (type === "monthly") return addMonthsToDateKey(currentDueDateKey, 1);
  if (type === "two_months") return addMonthsToDateKey(currentDueDateKey, 2);
  return null;
}

export function receiptNumberFor(sequence: number, year: number): string {
  const safe = Math.max(0, Math.trunc(sequence));
  return `REC-${year}-${String(safe).padStart(6, "0")}`;
}

export function validateDiscountReason(
  manualDiscountMinor: number,
  reason: string | null | undefined,
): string | null {
  if (manualDiscountMinor > 0 && !String(reason ?? "").trim()) {
    return "سبب الخصم اليدوي مطلوب";
  }
  if (String(reason ?? "").length > 500) {
    return "سبب الخصم أطول من الحد المسموح";
  }
  return null;
}

export function validateSubscriptionDates(input: {
  startDateKey: string;
  dueDateKey: string;
  endDateKey?: string | null;
  recurringDueDay?: number | null;
}): string | null {
  if (!isValidDateKey(input.startDateKey)) return "تاريخ البداية غير صحيح";
  if (!isValidDateKey(input.dueDateKey)) return "تاريخ الاستحقاق غير صحيح";
  if (input.dueDateKey < input.startDateKey) {
    return "تاريخ الاستحقاق لا يمكن أن يسبق تاريخ البداية";
  }
  if (input.endDateKey && !isValidDateKey(input.endDateKey)) {
    return "تاريخ النهاية غير صحيح";
  }
  if (input.endDateKey && input.endDateKey < input.startDateKey) {
    return "تاريخ النهاية لا يمكن أن يسبق تاريخ البداية";
  }
  if (
    input.recurringDueDay != null &&
    (!Number.isInteger(input.recurringDueDay) ||
      input.recurringDueDay < 1 ||
      input.recurringDueDay > 28)
  ) {
    return "يوم الاستحقاق الشهري يجب أن يكون بين 1 و28";
  }
  return null;
}

export function monthRangeForDateKey(dateKey: string): {
  fromKey: string;
  toKey: string;
} {
  const [year, month] = dateKey.split("-").map(Number);
  const fromKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    fromKey,
    toKey: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function defaultReportRange(now: Date = new Date()): {
  fromKey: string;
  toKey: string;
} {
  const range = currentMonthRange(now);
  return { fromKey: range.fromKey, toKey: range.toKey };
}

export function expenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORY_LABELS[category as ExpenseCategoryValue] ?? category;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethodValue] ?? method;
}

export function subscriptionTypeLabel(type: string): string {
  return SUBSCRIPTION_TYPE_LABELS[type as SubscriptionTypeValue] ?? type;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status as PaymentStatusValue] ?? status;
}
