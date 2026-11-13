import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import {
  academyCounters,
  auditLogs,
  coursePlans,
  expenses,
  groups,
  leads,
  paymentReminders,
  payments,
  students,
  studentCourses,
  subscriptions,
  users,
  type Expense,
  type Payment,
  type PaymentReminder,
  type Subscription,
} from "../drizzle/schema";
import { getDb, type DbTransaction } from "./db";
import { getSettings, type AppSettings } from "./settings";
import { listLeadEmployees } from "./leads";
import { validateAttachment, AttachmentError } from "./attachments";
import { writeAudit } from "./audit";
import {
  cancelRemindersForSubscription,
  ensureRemindersForSubscription,
  queueThankYouForPayment,
} from "./reminderScheduler";
import {
  computeSubscriptionAmounts,
  computeSubscriptionBalance,
  expenseCategoryLabel,
  nextRenewalDateKey,
  PAYMENT_METHOD_LABELS,
  paymentMethodLabel,
  paymentStatusLabel,
  receiptNumberFor,
  subscriptionEndDateKey,
  subscriptionTypeLabel,
  validateDiscountReason,
  validateSubscriptionDates,
  type PaymentMethodValue,
  type PaymentStatusValue,
  type SubscriptionBalance,
  type SubscriptionTypeValue,
} from "../shared/finance";
import {
  currentMonthRange,
  dateKeyInTimeZone,
  dateKeyToUtcEnd,
  dateKeyToUtcStart,
  isValidDateKey,
} from "../shared/time";
import { formatMinorPlain, parseAmountToMinor } from "../shared/money";

/**
 * Subscriptions, payments, expenses and reporting.
 *
 * Every financial read derives its numbers from `academy_payments`. There is no
 * "paid" switch an operator can flip: recording a payment inserts an immutable
 * ledger row, and correcting it inserts a reversal. Balances are recalculated
 * from valid rows on every query.
 */

const MAX_SUBSCRIPTIONS_SCAN = 5_000;

export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceError";
  }
}

export type FinanceActor = {
  userId: number;
  isAdmin: boolean;
  salaries: boolean;
  displayName?: string | null;
};

function requireDb<T>(value: T | null): T {
  if (!value) throw new FinanceError("قاعدة البيانات غير متاحة");
  return value;
}

async function allocateCounter(
  tx: DbTransaction,
  key: string,
  now: Date,
): Promise<number> {
  await tx
    .insert(academyCounters)
    .values({ key, value: 1, updatedAt: now })
    .onDuplicateKeyUpdate({
      set: { value: sql`${academyCounters.value} + 1`, updatedAt: now },
    });
  const rows = await tx
    .select()
    .from(academyCounters)
    .where(eq(academyCounters.key, key))
    .for("update");
  return Number(rows[0]?.value ?? 1);
}

async function ledgerForSubscriptions(
  subscriptionIds: number[],
): Promise<Map<number, { type: "payment" | "reversal"; status: "posted" | "reversed"; amountMinor: number }[]>> {
  const map = new Map<
    number,
    { type: "payment" | "reversal"; status: "posted" | "reversed"; amountMinor: number }[]
  >();
  if (!subscriptionIds.length) return map;
  const db = requireDb(await getDb());
  const rows = await db
    .select({
      subscriptionId: payments.subscriptionId,
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(inArray(payments.subscriptionId, subscriptionIds));
  for (const row of rows) {
    const list = map.get(row.subscriptionId) ?? [];
    list.push(row);
    map.set(row.subscriptionId, list);
  }
  return map;
}

function balanceFor(
  subscription: Subscription,
  ledger: { type: "payment" | "reversal"; status: "posted" | "reversed"; amountMinor: number }[],
  todayKey: string,
): SubscriptionBalance {
  return computeSubscriptionBalance({
    finalAmountMinor: subscription.finalAmountMinor,
    dueDateKey: subscription.dueDateKey,
    entries: ledger,
    todayKey,
  });
}

async function parentPhonesFor(studentIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!studentIds.length) return map;
  const db = requireDb(await getDb());
  const rows = await db
    .select({
      studentId: leads.convertedStudentId,
      parentPhone: leads.parentPhone,
    })
    .from(leads)
    .where(inArray(leads.convertedStudentId, studentIds));
  for (const row of rows) {
    if (row.studentId && row.parentPhone && !map.has(row.studentId)) {
      map.set(row.studentId, row.parentPhone);
    }
  }
  return map;
}

export type SubscriptionFilters = {
  search?: string;
  course?: string;
  status?: string;
  paymentStatus?: string;
  studentId?: number;
  groupId?: number;
  method?: string;
  employeeId?: number;
  page?: number;
  pageSize?: number;
};

export type SubscriptionRow = Subscription & {
  studentName: string;
  studentPhone: string | null;
  parentPhone: string | null;
  groupName: string | null;
  balance: SubscriptionBalance;
  paymentStatusLabel: string;
};

export async function loadSubscriptionsWithBalances(
  filters: SubscriptionFilters = {},
): Promise<SubscriptionRow[]> {
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const conditions = [];
  if (filters.course && ["Scratch", "Robotics", "Web", "Python"].includes(filters.course)) {
    conditions.push(eq(subscriptions.course, filters.course as Subscription["course"]));
  }
  if (filters.status && ["active", "completed", "cancelled"].includes(filters.status)) {
    conditions.push(eq(subscriptions.status, filters.status as Subscription["status"]));
  }
  if (filters.studentId) conditions.push(eq(subscriptions.studentId, filters.studentId));
  if (filters.method && ["bank_transfer", "instapay", "cash", "wallet"].includes(filters.method)) {
    conditions.push(eq(subscriptions.paymentMethod, filters.method as Subscription["paymentMethod"]));
  }
  if (filters.employeeId) conditions.push(eq(subscriptions.createdByUserId, filters.employeeId));
  if (filters.groupId) conditions.push(eq(students.groupId, filters.groupId));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(sql`(${students.name} like ${term} or ${students.phone} like ${term})`);
  }

  const rows = await db
    .select({
      subscription: subscriptions,
      studentName: students.name,
      studentPhone: students.phone,
      groupName: groups.name,
    })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .leftJoin(groups, eq(groups.id, students.groupId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(subscriptions.createdAt), desc(subscriptions.id))
    .limit(MAX_SUBSCRIPTIONS_SCAN);

  const ledgers = await ledgerForSubscriptions(rows.map(row => row.subscription.id));
  const parentPhones = await parentPhonesFor(rows.map(row => row.subscription.studentId));
  const todayKey = dateKeyInTimeZone(new Date(), settings.timezone);
  const mapped: SubscriptionRow[] = rows.map(row => {
    const balance = balanceFor(
      row.subscription,
      ledgers.get(row.subscription.id) ?? [],
      todayKey,
    );
    return {
      ...row.subscription,
      studentName: row.studentName,
      studentPhone: row.studentPhone,
      parentPhone: parentPhones.get(row.subscription.studentId) ?? row.studentPhone,
      groupName: row.groupName ?? null,
      balance,
      paymentStatusLabel: paymentStatusLabel(balance.status),
    };
  });

  const filtered = filters.paymentStatus
    ? mapped.filter(row => row.balance.status === filters.paymentStatus)
    : mapped;
  return filtered;
}

export async function listSubscriptions(filters: SubscriptionFilters) {
  const rows = await loadSubscriptionsWithBalances(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

export async function getSubscriptionDetail(id: number) {
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const rows = await db
    .select({
      subscription: subscriptions,
      student: students,
      groupName: groups.name,
    })
    .from(subscriptions)
    .innerJoin(students, eq(students.id, subscriptions.studentId))
    .leftJoin(groups, eq(groups.id, students.groupId))
    .where(eq(subscriptions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const ledgerRows = await db
    .select({
      id: payments.id,
      subscriptionId: payments.subscriptionId,
      studentId: payments.studentId,
      receiptSequence: payments.receiptSequence,
      receiptNumber: payments.receiptNumber,
      type: payments.type,
      amountMinor: payments.amountMinor,
      method: payments.method,
      paymentDate: payments.paymentDate,
      recordedByUserId: payments.recordedByUserId,
      transactionReference: payments.transactionReference,
      reversesPaymentId: payments.reversesPaymentId,
      reversalReason: payments.reversalReason,
      status: payments.status,
      receiptImageMime: payments.receiptImageMime,
      receiptImageName: payments.receiptImageName,
      notes: payments.notes,
      createdAt: payments.createdAt,
      recorderName: users.name,
      hasReceiptImage: sql<number>`case when ${payments.receiptImageDataBase64} is null then 0 else 1 end`,
    })
    .from(payments)
    .leftJoin(users, eq(users.id, payments.recordedByUserId))
    .where(eq(payments.subscriptionId, id))
    .orderBy(desc(payments.paymentDate), desc(payments.id));
  const balance = computeSubscriptionBalance({
    finalAmountMinor: row.subscription.finalAmountMinor,
    dueDateKey: row.subscription.dueDateKey,
    entries: ledgerRows.map(item => ({
      type: item.type,
      status: item.status,
      amountMinor: item.amountMinor,
    })),
    todayKey: dateKeyInTimeZone(new Date(), settings.timezone),
  });
  const reminders = await db
    .select()
    .from(paymentReminders)
    .where(eq(paymentReminders.subscriptionId, id))
    .orderBy(desc(paymentReminders.scheduledFor));
  const parentPhones = await parentPhonesFor([row.student.id]);
  return {
    subscription: row.subscription,
    student: {
      ...row.student,
      parentPhone: parentPhones.get(row.student.id) ?? row.student.phone,
    },
    groupName: row.groupName ?? null,
    balance,
    payments: ledgerRows,
    reminders,
    instructions: paymentInstructions(settings, row.subscription.paymentMethod),
  };
}

export function paymentInstructions(
  settings: AppSettings,
  method: PaymentMethodValue,
): string {
  if (method === "cash") {
    const parts = ["الدفع في مقر الأكاديمية."];
    if (settings.cashHours) parts.push(`مواعيد العمل: ${settings.cashHours}.`);
    if (settings.cashInstructions) parts.push(settings.cashInstructions);
    if (!settings.cashHours && !settings.cashInstructions) {
      parts.push("مواعيد العمل غير مُكوّنة بعد — تواصل مع الأكاديمية.");
    }
    return parts.join(" ");
  }
  if (method === "instapay") {
    return settings.instapayNumber
      ? `حوّل على إنستاباي إلى ${settings.instapayNumber} وأرسل صورة التحويل.${settings.instapayInstructions ? ` ${settings.instapayInstructions}` : ""}`
      : "بيانات إنستاباي غير مُكوّنة بعد. تواصل مع الأكاديمية.";
  }
  if (method === "wallet") {
    return settings.walletNumber
      ? `حوّل على المحفظة الإلكترونية إلى ${settings.walletNumber} وأرسل صورة التحويل.${settings.walletInstructions ? ` ${settings.walletInstructions}` : ""}`
      : "بيانات المحفظة الإلكترونية غير مُكوّنة بعد. تواصل مع الأكاديمية.";
  }
  const parts = [
    settings.bankName ? `البنك: ${settings.bankName}` : "",
    settings.bankAccountName ? `اسم الحساب: ${settings.bankAccountName}` : "",
    settings.bankAccountNumber ? `رقم الحساب: ${settings.bankAccountNumber}` : "",
    settings.bankIban ? `IBAN: ${settings.bankIban}` : "",
    settings.bankInstructions,
  ].filter(Boolean);
  return parts.length
    ? parts.join(" — ")
    : "بيانات التحويل البنكي غير مُكوّنة بعد. تواصل مع الأكاديمية.";
}

export async function listFinanceStudents() {
  const db = requireDb(await getDb());
  const rows = await db
    .select({ student: students, groupName: groups.name })
    .from(students)
    .leftJoin(groups, eq(groups.id, students.groupId))
    .orderBy(asc(students.name));
  const courses = await db
    .select({ studentId: studentCourses.studentId, course: studentCourses.course })
    .from(studentCourses);
  const byStudent = new Map<number, string[]>();
  for (const row of courses) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row.course);
    byStudent.set(row.studentId, list);
  }
  return rows.map(row => ({
    ...row.student,
    groupName: row.groupName ?? null,
    courses: byStudent.get(row.student.id) ?? [],
  }));
}

export async function listFinanceEmployees() {
  return listLeadEmployees();
}

export async function listCoursePlans() {
  const db = requireDb(await getDb());
  return db.select().from(coursePlans).orderBy(asc(coursePlans.course));
}

export async function upsertCoursePlan(input: {
  course: "Scratch" | "Robotics" | "Web" | "Python";
  basePriceMinor: number | null;
  currency?: string;
  defaultSubscriptionType: SubscriptionTypeValue;
  active: boolean;
  actorUserId: number;
}) {
  const db = requireDb(await getDb());
  const now = new Date();
  await db
    .insert(coursePlans)
    .values({
      course: input.course,
      basePriceMinor: input.basePriceMinor,
      currency: input.currency || "EGP",
      defaultSubscriptionType: input.defaultSubscriptionType,
      active: input.active,
      updatedByUserId: input.actorUserId,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        basePriceMinor: input.basePriceMinor,
        currency: input.currency || "EGP",
        defaultSubscriptionType: input.defaultSubscriptionType,
        active: input.active,
        updatedByUserId: input.actorUserId,
        updatedAt: now,
      },
    });
  await writeAudit(db, {
    actorUserId: input.actorUserId,
    action: "course_plan.updated",
    entityType: "course_plan",
    entityId: null,
    metadata: { course: input.course, basePriceMinor: input.basePriceMinor },
  });
  return listCoursePlans();
}

export type CreateSubscriptionInput = {
  studentId: number;
  course: "Scratch" | "Robotics" | "Web" | "Python";
  type: SubscriptionTypeValue;
  baseAmountMinor?: number | null;
  siblingStudentId?: number | null;
  siblingDiscountPercent?: number | null;
  manualDiscountMinor?: number | null;
  discountReason?: string | null;
  paymentMethod: PaymentMethodValue;
  dueDateKey: string;
  recurringDueDay?: number | null;
  startDateKey: string;
  endDateKey?: string | null;
  reminderEnabled?: boolean;
  notes?: string | null;
};

export async function createSubscription(
  actor: FinanceActor,
  input: CreateSubscriptionInput,
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.id, input.studentId))
    .limit(1);
  const student = studentRows[0];
  if (!student) throw new FinanceError("الطالب غير موجود");

  const enrolment = await db
    .select()
    .from(studentCourses)
    .where(
      and(
        eq(studentCourses.studentId, input.studentId),
        eq(studentCourses.course, input.course),
      ),
    )
    .limit(1);
  if (!enrolment.length) {
    throw new FinanceError("الطالب غير مسجل في هذا الكورس");
  }

  let baseAmountMinor = input.baseAmountMinor ?? null;
  if (baseAmountMinor == null) {
    const planRows = await db
      .select()
      .from(coursePlans)
      .where(eq(coursePlans.course, input.course))
      .limit(1);
    baseAmountMinor = planRows[0]?.basePriceMinor ?? null;
  }
  if (baseAmountMinor == null) {
    throw new FinanceError(
      "سعر الكورس غير مُكوّن. أدخل المبلغ يدوياً أو اضبط سعر الكورس من الإعدادات.",
    );
  }
  if (baseAmountMinor <= 0) throw new FinanceError("المبلغ يجب أن يكون أكبر من صفر");

  let siblingStudentId: number | null = input.siblingStudentId ?? null;
  if (siblingStudentId != null) {
    if (siblingStudentId === input.studentId) {
      throw new FinanceError("لا يمكن أن يكون الطالب أخاً لنفسه");
    }
    const sibling = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, siblingStudentId))
      .limit(1);
    if (!sibling.length) throw new FinanceError("الطالب الأخ غير موجود");
  }
  const siblingPercent = siblingStudentId
    ? Math.min(100, Math.max(0, input.siblingDiscountPercent ?? settings.siblingDiscountPercent))
    : 0;
  const amounts = computeSubscriptionAmounts({
    baseAmountMinor,
    siblingDiscountPercent: siblingPercent,
    manualDiscountMinor: input.manualDiscountMinor ?? 0,
  });
  const reasonError = validateDiscountReason(
    amounts.manualDiscountMinor,
    input.discountReason,
  );
  if (reasonError) throw new FinanceError(reasonError);
  const datesError = validateSubscriptionDates({
    startDateKey: input.startDateKey,
    dueDateKey: input.dueDateKey,
    endDateKey: input.endDateKey,
    recurringDueDay: input.recurringDueDay,
  });
  if (datesError) throw new FinanceError(datesError);

  const now = new Date();
  const inserted = await db.insert(subscriptions).values({
    studentId: input.studentId,
    course: input.course,
    type: input.type,
    baseAmountMinor: amounts.baseAmountMinor,
    siblingStudentId,
    siblingDiscountPercent: siblingPercent,
    siblingDiscountMinor: amounts.siblingDiscountMinor,
    manualDiscountMinor: amounts.manualDiscountMinor,
    discountReason: input.discountReason?.trim() || null,
    finalAmountMinor: amounts.finalAmountMinor,
    paymentMethod: input.paymentMethod,
    dueDateKey: input.dueDateKey,
    recurringDueDay: input.recurringDueDay ?? null,
    startDateKey: input.startDateKey,
    endDateKey: input.endDateKey ?? subscriptionEndDateKey(input.startDateKey, input.type),
    status: "active",
    reminderEnabled: input.reminderEnabled ?? true,
    notes: input.notes?.trim() || null,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
  });
  const id = Number(inserted[0].insertId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "subscription.created",
    entityType: "subscription",
    entityId: id,
    metadata: {
      studentId: input.studentId,
      course: input.course,
      type: input.type,
      finalAmountMinor: amounts.finalAmountMinor,
      manualDiscountMinor: amounts.manualDiscountMinor,
    },
    ipAddress,
  });
  await ensureRemindersForSubscription({ subscriptionId: id, now });
  return getSubscriptionDetail(id);
}

export async function updateSubscription(
  actor: FinanceActor,
  input: {
    id: number;
    paymentMethod?: PaymentMethodValue;
    dueDateKey?: string;
    recurringDueDay?: number | null;
    reminderEnabled?: boolean;
    notes?: string | null;
    baseAmountMinor?: number | null;
    siblingStudentId?: number | null;
    siblingDiscountPercent?: number | null;
    manualDiscountMinor?: number | null;
    discountReason?: string | null;
  },
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, input.id))
    .limit(1);
  const current = rows[0];
  if (!current) throw new FinanceError("الاشتراك غير موجود");
  if (current.status === "cancelled") {
    throw new FinanceError("لا يمكن تعديل اشتراك ملغي");
  }

  const paymentRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(
      and(
        eq(payments.subscriptionId, current.id),
        eq(payments.status, "posted"),
      ),
    );
  const hasPayments = Number(paymentRows[0]?.count ?? 0) > 0;
  const changesAmounts =
    input.baseAmountMinor !== undefined ||
    input.manualDiscountMinor !== undefined ||
    input.siblingStudentId !== undefined ||
    input.siblingDiscountPercent !== undefined;
  if (hasPayments && changesAmounts) {
    throw new FinanceError(
      "لا يمكن تغيير المبلغ أو الخصومات بعد تسجيل دفعة. استخدم قيداً عكسياً لتصحيح مالي.",
    );
  }

  const nextDueDate = input.dueDateKey ?? current.dueDateKey;
  const dateError = validateSubscriptionDates({
    startDateKey: current.startDateKey,
    dueDateKey: nextDueDate,
    endDateKey: current.endDateKey,
    recurringDueDay:
      input.recurringDueDay !== undefined
        ? input.recurringDueDay
        : current.recurringDueDay,
  });
  if (dateError) throw new FinanceError(dateError);

  let amountPatch: Partial<typeof subscriptions.$inferInsert> = {};
  if (changesAmounts) {
    const siblingId =
      input.siblingStudentId !== undefined
        ? input.siblingStudentId
        : current.siblingStudentId;
    const siblingPercent = siblingId
      ? Math.min(
          100,
          Math.max(
            0,
            input.siblingDiscountPercent ?? current.siblingDiscountPercent,
          ),
        )
      : 0;
    const amounts = computeSubscriptionAmounts({
      baseAmountMinor: input.baseAmountMinor ?? current.baseAmountMinor,
      siblingDiscountPercent: siblingPercent,
      manualDiscountMinor:
        input.manualDiscountMinor ?? current.manualDiscountMinor,
    });
    const reasonError = validateDiscountReason(
      amounts.manualDiscountMinor,
      input.discountReason ?? current.discountReason,
    );
    if (reasonError) throw new FinanceError(reasonError);
    amountPatch = {
      baseAmountMinor: amounts.baseAmountMinor,
      siblingStudentId: siblingId,
      siblingDiscountPercent: siblingPercent,
      siblingDiscountMinor: amounts.siblingDiscountMinor,
      manualDiscountMinor: amounts.manualDiscountMinor,
      discountReason: input.discountReason ?? current.discountReason,
      finalAmountMinor: amounts.finalAmountMinor,
    };
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      ...amountPatch,
      paymentMethod: input.paymentMethod ?? current.paymentMethod,
      dueDateKey: nextDueDate,
      recurringDueDay:
        input.recurringDueDay !== undefined
          ? input.recurringDueDay
          : current.recurringDueDay,
      reminderEnabled:
        input.reminderEnabled !== undefined
          ? input.reminderEnabled
          : current.reminderEnabled,
      notes: input.notes !== undefined ? input.notes : current.notes,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, current.id));

  for (const [action, metadata] of [
    ["subscription.updated", { fields: Object.keys(input).filter(key => key !== "id") }],
  ] as const) {
    await writeAudit(db, {
      actorUserId: actor.userId,
      action,
      entityType: "subscription",
      entityId: current.id,
      metadata,
      ipAddress,
    });
  }

  if (nextDueDate !== current.dueDateKey) {
    await cancelRemindersForSubscription(
      current.id,
      "تم تغيير تاريخ الاستحقاق",
      now,
    );
  }
  if (input.reminderEnabled === false) {
    await cancelRemindersForSubscription(
      current.id,
      "تم إيقاف التذكيرات لهذا الاشتراك",
      now,
    );
  } else {
    await ensureRemindersForSubscription({ subscriptionId: current.id, now });
  }
  return getSubscriptionDetail(current.id);
}

export async function cancelSubscription(
  actor: FinanceActor,
  input: { id: number; reason: string },
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  const reason = input.reason.trim();
  if (reason.length < 3) throw new FinanceError("اكتب سبب إلغاء الاشتراك");
  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, input.id))
    .limit(1);
  if (!rows[0]) throw new FinanceError("الاشتراك غير موجود");
  if (rows[0].status === "cancelled") return getSubscriptionDetail(input.id);
  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancelledByUserId: actor.userId,
      cancelReason: reason,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, input.id));
  await cancelRemindersForSubscription(input.id, `إلغاء الاشتراك: ${reason}`, now);
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "subscription.cancelled",
    entityType: "subscription",
    entityId: input.id,
    metadata: { reason },
    ipAddress,
  });
  return getSubscriptionDetail(input.id);
}

export async function renewSubscription(
  actor: FinanceActor,
  id: number,
  ipAddress?: string | null,
) {
  const detail = await getSubscriptionDetail(id);
  if (!detail) throw new FinanceError("الاشتراك غير موجود");
  const nextDue = nextRenewalDateKey(
    detail.subscription.dueDateKey,
    detail.subscription.type,
  );
  if (!nextDue) {
    throw new FinanceError("الاشتراك لدفعة واحدة ولا يتجدد تلقائياً");
  }
  const nextStart = nextRenewalDateKey(
    detail.subscription.startDateKey,
    detail.subscription.type,
  ) ?? detail.subscription.startDateKey;
  return createSubscription(
    actor,
    {
      studentId: detail.subscription.studentId,
      course: detail.subscription.course,
      type: detail.subscription.type,
      baseAmountMinor: detail.subscription.baseAmountMinor,
      siblingStudentId: detail.subscription.siblingStudentId,
      siblingDiscountPercent: detail.subscription.siblingDiscountPercent,
      manualDiscountMinor: detail.subscription.manualDiscountMinor,
      discountReason: detail.subscription.discountReason,
      paymentMethod: detail.subscription.paymentMethod,
      dueDateKey: nextDue,
      recurringDueDay: detail.subscription.recurringDueDay,
      startDateKey: nextStart,
      reminderEnabled: detail.subscription.reminderEnabled,
      notes: detail.subscription.notes,
    },
    ipAddress,
  );
}

export type RecordPaymentInput = {
  subscriptionId: number;
  amountMinor: number;
  method: PaymentMethodValue;
  transactionReference: string;
  notes?: string | null;
  receiptImage?: {
    dataBase64: string;
    mime: string;
    name?: string | null;
  } | null;
};

/** Never return the stored receipt image bytes in an API response. */
function publicPayment(payment: Payment): Omit<Payment, "receiptImageDataBase64"> {
  const { receiptImageDataBase64: _bytes, ...safe } = payment;
  return safe;
}

function attachColumns(attachment: ReturnType<typeof validateAttachment>) {
  return attachment
    ? {
        receiptImageDataBase64: attachment.dataBase64,
        receiptImageMime: attachment.mime,
        receiptImageName: attachment.name,
      }
    : {};
}

export async function recordPayment(
  actor: FinanceActor,
  input: RecordPaymentInput,
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new FinanceError("المبلغ يجب أن يكون أكبر من صفر");
  }
  if (input.amountMinor > 1_000_000_000) {
    throw new FinanceError("المبلغ أكبر من الحد المسموح");
  }
  if (!input.transactionReference || input.transactionReference.length < 8) {
    throw new FinanceError("مرجع العملية غير صالح");
  }
  let attachment;
  try {
    attachment = validateAttachment(input.receiptImage);
  } catch (error) {
    throw new FinanceError(
      error instanceof AttachmentError ? error.message : "المرفق غير صالح",
    );
  }

  const existingRows = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionReference, input.transactionReference))
    .limit(1);
  if (existingRows[0]) {
    const existing = existingRows[0];
    if (
      existing.subscriptionId === input.subscriptionId &&
      existing.amountMinor === input.amountMinor &&
      existing.type === "payment"
    ) {
      const ledger = await ledgerForSubscriptions([input.subscriptionId]);
      const subRows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, input.subscriptionId))
        .limit(1);
      const settings = await getSettings();
      return {
        payment: publicPayment(existing),
        duplicate: true,
        balance: subRows[0]
          ? balanceFor(
              subRows[0],
              ledger.get(input.subscriptionId) ?? [],
              dateKeyInTimeZone(new Date(), settings.timezone),
            )
          : null,
      };
    }
    throw new FinanceError(
      "مرجع العملية مستخدم بالفعل في دفعة أخرى. أعد تحميل النموذج وحاول مرة أخرى.",
    );
  }

  const settings = await getSettings();
  const now = new Date();
  let payment!: Payment;
  let balance!: SubscriptionBalance;

  await db.transaction(async tx => {
    const subRows = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, input.subscriptionId))
      .for("update");
    const subscription = subRows[0];
    if (!subscription) throw new FinanceError("الاشتراك غير موجود");
    if (subscription.status === "cancelled") {
      throw new FinanceError("لا يمكن تسجيل دفعة على اشتراك ملغي");
    }

    const financialSequence = await allocateCounter(tx, "financial_sequence", now);
    const paymentSequence = await allocateCounter(tx, "receipt_payment", now);
    const year = Number(dateKeyInTimeZone(now, settings.timezone).slice(0, 4));
    const receiptNumber = receiptNumberFor(paymentSequence, year);

    const inserted = await tx.insert(payments).values({
      receiptSequence: financialSequence,
      receiptNumber,
      subscriptionId: subscription.id,
      studentId: subscription.studentId,
      type: "payment",
      amountMinor: input.amountMinor,
      method: input.method,
      paymentDate: now,
      recordedByUserId: actor.userId,
      transactionReference: input.transactionReference,
      status: "posted",
      ...attachColumns(attachment),
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
    const paymentId = Number(inserted[0].insertId);

    const ledgerRows = await tx
      .select({
        type: payments.type,
        status: payments.status,
        amountMinor: payments.amountMinor,
      })
      .from(payments)
      .where(eq(payments.subscriptionId, subscription.id));
    balance = computeSubscriptionBalance({
      finalAmountMinor: subscription.finalAmountMinor,
      dueDateKey: subscription.dueDateKey,
      entries: ledgerRows,
      todayKey: dateKeyInTimeZone(now, settings.timezone),
    });

    const created = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    payment = created[0]!;

    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: "payment.recorded",
      entityType: "payment",
      entityId: paymentId,
      metadata: {
        subscriptionId: subscription.id,
        studentId: subscription.studentId,
        amountMinor: input.amountMinor,
        method: input.method,
        receiptNumber,
        remainingMinor: balance.remainingMinor,
        overpaidMinor: balance.overpaidMinor,
      },
      ipAddress,
    });
  });

  if (balance.fullyPaid) {
    await cancelRemindersForSubscription(
      input.subscriptionId,
      "تم سداد الاشتراك بالكامل",
      now,
    );
    await queueThankYouForPayment({ payment, now });
  } else {
    await ensureRemindersForSubscription({
      subscriptionId: input.subscriptionId,
      now,
    });
  }

  return { payment: publicPayment(payment), duplicate: false, balance };
}

export async function reversePayment(
  actor: FinanceActor,
  input: { paymentId: number; reason: string },
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  const reason = input.reason.trim();
  if (reason.length < 5) {
    throw new FinanceError("سبب الإلغاء/العكس مطلوب (5 أحرف على الأقل)");
  }
  const settings = await getSettings();
  const now = new Date();
  let reversal!: Payment;
  let balance!: SubscriptionBalance;
  let subscriptionId = 0;

  await db.transaction(async tx => {
    const rows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .for("update");
    const original = rows[0];
    if (!original) throw new FinanceError("الدفعة غير موجودة");
    if (original.type !== "payment") {
      throw new FinanceError("لا يمكن عكس قيد عكسي");
    }
    if (original.status === "reversed") {
      throw new FinanceError("هذه الدفعة تم عكسها بالفعل");
    }
    subscriptionId = original.subscriptionId;

    const financialSequence = await allocateCounter(tx, "financial_sequence", now);
    const reversalSequence = await allocateCounter(tx, "receipt_reversal", now);
    const year = Number(dateKeyInTimeZone(now, settings.timezone).slice(0, 4));
    const receiptNumber = `REV-${year}-${String(reversalSequence).padStart(6, "0")}`;

    await tx
      .update(payments)
      .set({ status: "reversed", updatedAt: now })
      .where(eq(payments.id, original.id));

    const inserted = await tx.insert(payments).values({
      receiptSequence: financialSequence,
      receiptNumber,
      subscriptionId: original.subscriptionId,
      studentId: original.studentId,
      type: "reversal",
      amountMinor: original.amountMinor,
      method: original.method,
      paymentDate: now,
      recordedByUserId: actor.userId,
      transactionReference: `reversal:${original.transactionReference}`,
      reversesPaymentId: original.id,
      reversalReason: reason,
      status: "posted",
      notes: `عكس الدفعة ${original.receiptNumber}. السبب: ${reason}`,
      createdAt: now,
      updatedAt: now,
    });
    const reversalId = Number(inserted[0].insertId);

    const subRows = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, original.subscriptionId))
      .limit(1);
    const sub = subRows[0];
    if (!sub) throw new FinanceError("الاشتراك غير موجود");
    const ledgerRows = await tx
      .select({
        type: payments.type,
        status: payments.status,
        amountMinor: payments.amountMinor,
      })
      .from(payments)
      .where(eq(payments.subscriptionId, original.subscriptionId));
    balance = computeSubscriptionBalance({
      finalAmountMinor: sub.finalAmountMinor,
      dueDateKey: sub.dueDateKey,
      entries: ledgerRows,
      todayKey: dateKeyInTimeZone(now, settings.timezone),
    });
    const created = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, reversalId))
      .limit(1);
    reversal = created[0]!;

    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: "payment.reversed",
      entityType: "payment",
      entityId: original.id,
      metadata: {
        reversalId,
        originalReceipt: original.receiptNumber,
        reversalReceipt: receiptNumber,
        reason,
        amountMinor: original.amountMinor,
        remainingMinor: balance.remainingMinor,
      },
      ipAddress,
    });
  });

  if (balance.fullyPaid) {
    await cancelRemindersForSubscription(subscriptionId, "مدفوع بالكامل بعد العكس", now);
  } else {
    await ensureRemindersForSubscription({ subscriptionId, now });
  }
  return { reversal, balance };
}

export async function listPayments(filters: {
  fromKey?: string;
  toKey?: string;
  studentId?: number;
  subscriptionId?: number;
  method?: string;
  recordedByUserId?: number;
  status?: string;
  includeReversals?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const db = requireDb(await getDb());
  const conditions = [];
  if (filters.fromKey) conditions.push(gte(payments.paymentDate, dateKeyToUtcStart(filters.fromKey)));
  if (filters.toKey) conditions.push(lte(payments.paymentDate, dateKeyToUtcEnd(filters.toKey)));
  if (filters.studentId) conditions.push(eq(payments.studentId, filters.studentId));
  if (filters.subscriptionId) conditions.push(eq(payments.subscriptionId, filters.subscriptionId));
  if (filters.method && ["bank_transfer", "instapay", "cash", "wallet"].includes(filters.method)) {
    conditions.push(eq(payments.method, filters.method as Payment["method"]));
  }
  if (filters.recordedByUserId) conditions.push(eq(payments.recordedByUserId, filters.recordedByUserId));
  if (filters.status === "reversed") conditions.push(eq(payments.status, "reversed"));
  if (filters.status === "posted") conditions.push(eq(payments.status, "posted"));
  if (!filters.includeReversals) conditions.push(eq(payments.type, "payment"));

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: payments.id,
        subscriptionId: payments.subscriptionId,
        studentId: payments.studentId,
        receiptSequence: payments.receiptSequence,
        receiptNumber: payments.receiptNumber,
        type: payments.type,
        amountMinor: payments.amountMinor,
        method: payments.method,
        paymentDate: payments.paymentDate,
        recordedByUserId: payments.recordedByUserId,
        transactionReference: payments.transactionReference,
        reversesPaymentId: payments.reversesPaymentId,
        reversalReason: payments.reversalReason,
        status: payments.status,
        receiptImageMime: payments.receiptImageMime,
        receiptImageName: payments.receiptImageName,
        notes: payments.notes,
        createdAt: payments.createdAt,
        hasReceiptImage: sql<number>`case when ${payments.receiptImageDataBase64} is null then 0 else 1 end`,
        studentName: students.name,
        course: subscriptions.course,
        recorderName: users.name,
      })
      .from(payments)
      .innerJoin(students, eq(students.id, payments.studentId))
      .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
      .leftJoin(users, eq(users.id, payments.recordedByUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(payments.paymentDate), desc(payments.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  return {
    items: rows,
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function getPaymentForReceipt(paymentId: number) {
  const db = requireDb(await getDb());
  const rows = await db
    .select({
      payment: payments,
      subscription: subscriptions,
      studentName: students.name,
      recorderName: users.name,
      groupName: groups.name,
    })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .innerJoin(students, eq(students.id, payments.studentId))
    .leftJoin(users, eq(users.id, payments.recordedByUserId))
    .leftJoin(groups, eq(groups.id, students.groupId))
    .where(eq(payments.id, paymentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStudentFinance(studentId: number) {
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const rows = await db
    .select({ subscription: subscriptions })
    .from(subscriptions)
    .where(eq(subscriptions.studentId, studentId))
    .orderBy(desc(subscriptions.createdAt));
  const ids = rows.map(row => row.subscription.id);
  const ledgers = await ledgerForSubscriptions(ids);
  const todayKey = dateKeyInTimeZone(new Date(), settings.timezone);
  const paymentRows = ids.length
    ? await db
        .select({
          id: payments.id,
          subscriptionId: payments.subscriptionId,
          receiptNumber: payments.receiptNumber,
          type: payments.type,
          amountMinor: payments.amountMinor,
          method: payments.method,
          paymentDate: payments.paymentDate,
          status: payments.status,
          reversalReason: payments.reversalReason,
        })
        .from(payments)
        .where(inArray(payments.subscriptionId, ids))
        .orderBy(desc(payments.paymentDate))
    : [];
  return {
    subscriptions: rows.map(row => ({
      ...row.subscription,
      balance: balanceFor(row.subscription, ledgers.get(row.subscription.id) ?? [], todayKey),
    })),
    payments: paymentRows,
  };
}

export async function accountsDashboard(input: {
  course?: string;
  method?: string;
  employeeId?: number;
  paymentStatus?: string;
  fromKey?: string;
  toKey?: string;
}) {
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const now = new Date();
  const todayKey = dateKeyInTimeZone(now, settings.timezone);
  const monthRange = currentMonthRange(now, settings.timezone);

  const paymentConditions = [
    eq(payments.type, "payment"),
    eq(payments.status, "posted"),
    gte(payments.paymentDate, dateKeyToUtcStart(monthRange.fromKey)),
    lte(payments.paymentDate, dateKeyToUtcEnd(monthRange.toKey)),
  ];
  if (input.course && ["Scratch", "Robotics", "Web", "Python"].includes(input.course)) {
    paymentConditions.push(eq(subscriptions.course, input.course as Subscription["course"]));
  }
  if (input.method && ["bank_transfer", "instapay", "cash", "wallet"].includes(input.method)) {
    paymentConditions.push(eq(payments.method, input.method as Payment["method"]));
  }
  if (input.employeeId) paymentConditions.push(eq(payments.recordedByUserId, input.employeeId));
  const collectedRows = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountMinor}), 0)` })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .where(and(...paymentConditions));

  let rangeCollected: number | null = null;
  if (input.fromKey && input.toKey) {
    const rangeConditions = [
      eq(payments.type, "payment"),
      eq(payments.status, "posted"),
      gte(payments.paymentDate, dateKeyToUtcStart(input.fromKey)),
      lte(payments.paymentDate, dateKeyToUtcEnd(input.toKey)),
    ];
    if (input.method && ["bank_transfer", "instapay", "cash", "wallet"].includes(input.method)) {
      rangeConditions.push(eq(payments.method, input.method as Payment["method"]));
    }
    if (input.employeeId) rangeConditions.push(eq(payments.recordedByUserId, input.employeeId));
    const rangeRows = await db
      .select({ total: sql<number>`coalesce(sum(${payments.amountMinor}), 0)` })
      .from(payments)
      .where(and(...rangeConditions));
    rangeCollected = Number(rangeRows[0]?.total ?? 0);
  }

  let rows = await loadSubscriptionsWithBalances({
    course: input.course,
    method: input.method,
    employeeId: input.employeeId,
  });
  rows = rows.filter(row => row.status === "active");
  if (input.paymentStatus) {
    rows = rows.filter(row => row.balance.status === input.paymentStatus);
  }
  const outstandingMinor = rows.reduce(
    (total, row) => total + row.balance.remainingMinor,
    0,
  );
  const overdueRows = rows
    .filter(row => row.balance.isOverdue)
    .sort((a, b) => a.dueDateKey.localeCompare(b.dueDateKey));
  const overdueMinor = overdueRows.reduce(
    (total, row) => total + row.balance.remainingMinor,
    0,
  );
  const overdueStudents = new Set(overdueRows.map(row => row.studentId)).size;

  return {
    collectedThisMonthMinor: Number(collectedRows[0]?.total ?? 0),
    collectedInSelectedRangeMinor: rangeCollected,
    outstandingMinor,
    overdueMinor,
    overdueStudentCount: overdueStudents,
    overdue: overdueRows.slice(0, 500),
    asOfKey: todayKey,
    month: monthRange,
  };
}

export type ReportFilters = {
  fromKey: string;
  toKey: string;
  course?: string;
  method?: string;
  employeeId?: number;
  includeSalaries?: boolean;
};

export async function monthlyReport(filters: ReportFilters) {
  const db = requireDb(await getDb());
  if (!isValidDateKey(filters.fromKey) || !isValidDateKey(filters.toKey)) {
    throw new FinanceError("حدد فترة تقرير صحيحة");
  }
  if (filters.fromKey > filters.toKey) {
    throw new FinanceError("بداية الفترة يجب أن تكون قبل نهايتها");
  }
  const conditions = [
    eq(payments.type, "payment"),
    eq(payments.status, "posted"),
    gte(payments.paymentDate, dateKeyToUtcStart(filters.fromKey)),
    lte(payments.paymentDate, dateKeyToUtcEnd(filters.toKey)),
  ];
  if (filters.course && ["Scratch", "Robotics", "Web", "Python"].includes(filters.course)) {
    conditions.push(eq(subscriptions.course, filters.course as Subscription["course"]));
  }
  if (filters.method && ["bank_transfer", "instapay", "cash", "wallet"].includes(filters.method)) {
    conditions.push(eq(payments.method, filters.method as Payment["method"]));
  }
  if (filters.employeeId) conditions.push(eq(payments.recordedByUserId, filters.employeeId));

  const paymentRows = await db
    .select({
      payment: payments,
      subscription: subscriptions,
      studentName: students.name,
      employeeName: users.name,
    })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .innerJoin(students, eq(students.id, payments.studentId))
    .leftJoin(users, eq(users.id, payments.recordedByUserId))
    .where(and(...conditions))
    .orderBy(desc(payments.paymentDate), desc(payments.id));

  const expenseConditions = [
    gte(expenses.expenseDateKey, filters.fromKey),
    lte(expenses.expenseDateKey, filters.toKey),
    eq(expenses.status, "active"),
  ];
  if (filters.employeeId) {
    expenseConditions.push(eq(expenses.recordedByUserId, filters.employeeId));
  }
  if (!filters.includeSalaries) {
    expenseConditions.push(ne(expenses.category, "trainer_salaries"));
  }
  const expenseRows = await db
    .select({
      expense: expenses,
      employeeName: users.name,
    })
    .from(expenses)
    .leftJoin(users, eq(users.id, expenses.recordedByUserId))
    .where(and(...expenseConditions))
    .orderBy(desc(expenses.expenseDateKey), desc(expenses.id));

  const revenueMinor = paymentRows.reduce(
    (total, row) => total + row.payment.amountMinor,
    0,
  );
  const expenseMinor = expenseRows.reduce(
    (total, row) => total + row.expense.amountMinor,
    0,
  );

  const group = <T extends string>(
    rows: typeof paymentRows,
    key: (row: (typeof paymentRows)[number]) => T,
    label: (key: T) => string,
  ) => {
    const map = new Map<T, { key: T; label: string; collectedMinor: number; count: number }>();
    for (const row of rows) {
      const value = key(row);
      const entry = map.get(value) ?? {
        key: value,
        label: label(value),
        collectedMinor: 0,
        count: 0,
      };
      entry.collectedMinor += row.payment.amountMinor;
      entry.count += 1;
      map.set(value, entry);
    }
    return [...map.values()].sort((a, b) => b.collectedMinor - a.collectedMinor);
  };

  return {
    fromKey: filters.fromKey,
    toKey: filters.toKey,
    revenueMinor,
    expenseMinor,
    netProfitMinor: revenueMinor - expenseMinor,
    paymentCount: paymentRows.length,
    payments: paymentRows.map(row => ({
      ...row.payment,
      studentName: row.studentName,
      course: row.subscription.course,
      employeeName: row.employeeName,
      methodLabel: paymentMethodLabel(row.payment.method),
    })),
    expenses: expenseRows.map(row => ({
      ...row.expense,
      employeeName: row.employeeName,
      categoryLabel: expenseCategoryLabel(row.expense.category),
    })),
    byCourse: group(
      paymentRows,
      row => row.subscription.course,
      key => key,
    ),
    byMethod: group(
      paymentRows,
      row => row.payment.method,
      key => paymentMethodLabel(key),
    ),
    byEmployee: group(
      paymentRows,
      row => String(row.employeeName ?? "غير معروف"),
      key => key,
    ),
  };
}

export async function exportMonthlyReport(filters: ReportFilters) {
  const report = await monthlyReport(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "iDeveloper Academy";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("الملخص", {
    views: [{ rightToLeft: true }],
  });
  summary.columns = [
    { header: "البند", key: "label", width: 32 },
    { header: "القيمة", key: "value", width: 24 },
  ];
  summary.addRows([
    { label: "من تاريخ", value: report.fromKey },
    { label: "إلى تاريخ", value: report.toKey },
    { label: "إجمالي المحصل", value: formatMinorPlain(report.revenueMinor) },
    { label: "إجمالي المصروفات", value: formatMinorPlain(report.expenseMinor) },
    { label: "صافي الربح", value: formatMinorPlain(report.netProfitMinor) },
    { label: "عدد الدفعات", value: report.paymentCount },
  ]);
  summary.getRow(1).font = { bold: true };

  const paymentSheet = workbook.addWorksheet("المدفوعات", {
    views: [{ rightToLeft: true }],
  });
  paymentSheet.columns = [
    { header: "التاريخ", key: "date", width: 18 },
    { header: "رقم الإيصال", key: "receipt", width: 18 },
    { header: "الطالب", key: "student", width: 26 },
    { header: "الكورس", key: "course", width: 14 },
    { header: "المبلغ", key: "amount", width: 14 },
    { header: "طريقة الدفع", key: "method", width: 20 },
    { header: "الموظف", key: "employee", width: 22 },
    { header: "مرجع العملية", key: "reference", width: 30 },
  ];
  for (const row of report.payments) {
    paymentSheet.addRow({
      date: row.paymentDate.toISOString().slice(0, 10),
      receipt: row.receiptNumber,
      student: row.studentName,
      course: row.course,
      amount: formatMinorPlain(row.amountMinor),
      method: row.methodLabel,
      employee: row.employeeName ?? "",
      reference: row.transactionReference,
    });
  }
  paymentSheet.getRow(1).font = { bold: true };

  const expenseSheet = workbook.addWorksheet("المصروفات", {
    views: [{ rightToLeft: true }],
  });
  expenseSheet.columns = [
    { header: "التاريخ", key: "date", width: 18 },
    { header: "التصنيف", key: "category", width: 20 },
    { header: "الوصف", key: "description", width: 40 },
    { header: "المبلغ", key: "amount", width: 14 },
    { header: "الموظف", key: "employee", width: 22 },
  ];
  for (const row of report.expenses) {
    expenseSheet.addRow({
      date: row.expenseDateKey,
      category: row.categoryLabel,
      description: row.description,
      amount: formatMinorPlain(row.amountMinor),
      employee: row.employeeName ?? "",
    });
  }
  expenseSheet.getRow(1).font = { bold: true };

  for (const [name, rows, keyHeader] of [
    ["حسب الكورس", report.byCourse, "الكورس"],
    ["حسب طريقة الدفع", report.byMethod, "طريقة الدفع"],
    ["حسب الموظف", report.byEmployee, "الموظف"],
  ] as const) {
    const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true }] });
    sheet.columns = [
      { header: keyHeader, key: "label", width: 28 },
      { header: "عدد الدفعات", key: "count", width: 16 },
      { header: "المحصل", key: "total", width: 18 },
    ];
    for (const row of rows) {
      sheet.addRow({
        label: row.label,
        count: row.count,
        total: formatMinorPlain(row.collectedMinor),
      });
    }
    sheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return {
    fileName: `financial-report-${report.fromKey}-to-${report.toKey}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64,
    report,
  };
}

export async function listExpenses(
  actor: FinanceActor,
  filters: { fromKey?: string; toKey?: string; category?: string; page?: number; pageSize?: number } = {},
) {
  const db = requireDb(await getDb());
  const conditions = [];
  if (filters.fromKey) conditions.push(gte(expenses.expenseDateKey, filters.fromKey));
  if (filters.toKey) conditions.push(lte(expenses.expenseDateKey, filters.toKey));
  if (filters.category && ["rent", "trainer_salaries", "equipment", "other"].includes(filters.category)) {
    conditions.push(eq(expenses.category, filters.category as Expense["category"]));
  }
  // Salaries are confidential. Even an employee with expense access must not
  // see them unless the separate salary permission was granted.
  if (!actor.salaries) {
    conditions.push(ne(expenses.category, "trainer_salaries"));
  }
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, totalRows] = await Promise.all([
    db
      .select({ expense: expenses, employeeName: users.name })
      .from(expenses)
      .leftJoin(users, eq(users.id, expenses.recordedByUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(expenses.expenseDateKey), desc(expenses.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  return {
    items: rows.map(row => ({
      ...row.expense,
      employeeName: row.employeeName,
      categoryLabel: expenseCategoryLabel(row.expense.category),
      attachmentDataBase64: undefined,
      hasAttachment: Boolean(row.expense.attachmentDataBase64),
    })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function createExpense(
  actor: FinanceActor,
  input: {
    amountMinor: number;
    category: Expense["category"];
    expenseDateKey: string;
    description: string;
    attachment?: { dataBase64: string; mime: string; name?: string | null } | null;
  },
  ipAddress?: string | null,
) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new FinanceError("مبلغ المصروف يجب أن يكون أكبر من صفر");
  }
  if (!isValidDateKey(input.expenseDateKey)) {
    throw new FinanceError("تاريخ المصروف غير صحيح");
  }
  if (!input.description.trim()) throw new FinanceError("وصف المصروف مطلوب");
  if (input.category === "trainer_salaries" && !actor.salaries) {
    throw new FinanceError("لا تملك صلاحية تسجيل رواتب المدربين");
  }
  let attachment;
  try {
    attachment = validateAttachment(input.attachment);
  } catch (error) {
    throw new FinanceError(
      error instanceof AttachmentError ? error.message : "المرفق غير صالح",
    );
  }
  const db = requireDb(await getDb());
  const now = new Date();
  const inserted = await db.insert(expenses).values({
    amountMinor: input.amountMinor,
    category: input.category,
    expenseDateKey: input.expenseDateKey,
    description: input.description.trim().slice(0, 1000),
    recordedByUserId: actor.userId,
    attachmentDataBase64: attachment?.dataBase64 ?? null,
    attachmentMime: attachment?.mime ?? null,
    attachmentName: attachment?.name ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  const id = Number(inserted[0].insertId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "expense.created",
    entityType: "expense",
    entityId: id,
    metadata: {
      amountMinor: input.amountMinor,
      category: input.category,
      date: input.expenseDateKey,
    },
    ipAddress,
  });
  return { id };
}

export async function updateExpense(
  actor: FinanceActor,
  input: {
    id: number;
    amountMinor?: number;
    category?: Expense["category"];
    expenseDateKey?: string;
    description?: string;
    status?: "active" | "archived";
  },
  ipAddress?: string | null,
) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(expenses).where(eq(expenses.id, input.id)).limit(1);
  const current = rows[0];
  if (!current) throw new FinanceError("المصروف غير موجود");
  if (
    (current.category === "trainer_salaries" ||
      input.category === "trainer_salaries") &&
    !actor.salaries
  ) {
    throw new FinanceError("لا تملك صلاحية تعديل رواتب المدربين");
  }
  if (input.amountMinor !== undefined && input.amountMinor <= 0) {
    throw new FinanceError("مبلغ المصروف يجب أن يكون أكبر من صفر");
  }
  if (input.expenseDateKey && !isValidDateKey(input.expenseDateKey)) {
    throw new FinanceError("تاريخ المصروف غير صحيح");
  }
  await db
    .update(expenses)
    .set({
      amountMinor: input.amountMinor ?? current.amountMinor,
      category: input.category ?? current.category,
      expenseDateKey: input.expenseDateKey ?? current.expenseDateKey,
      description: input.description?.trim() ?? current.description,
      status: input.status ?? current.status,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, input.id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "expense.updated",
    entityType: "expense",
    entityId: input.id,
    metadata: {
      fields: Object.keys(input).filter(key => key !== "id"),
      status: input.status ?? current.status,
    },
    ipAddress,
  });
  return { id: input.id };
}

export async function getExpenseAttachment(
  actor: FinanceActor,
  id: number,
): Promise<{ fileName: string; mime: string; base64: string } | null> {
  const db = requireDb(await getDb());
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  const expense = rows[0];
  if (!expense) throw new FinanceError("المصروف غير موجود");
  if (expense.category === "trainer_salaries" && !actor.salaries) {
    throw new FinanceError("لا تملك صلاحية الوصول إلى مرفقات الرواتب");
  }
  if (!expense.attachmentDataBase64) return null;
  return {
    fileName: expense.attachmentName || `expense-${expense.id}`,
    mime: expense.attachmentMime || "application/octet-stream",
    base64: expense.attachmentDataBase64,
  };
}

export async function listFinanceAudit(limit = 100) {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(500, Math.max(1, limit)));
}

export async function listReminders(filters: {
  subscriptionId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const db = requireDb(await getDb());
  const conditions = [];
  if (filters.subscriptionId) {
    conditions.push(eq(paymentReminders.subscriptionId, filters.subscriptionId));
  }
  if (
    filters.status &&
    ["pending", "sending", "sent", "failed", "cancelled", "skipped"].includes(
      filters.status,
    )
  ) {
    conditions.push(
      eq(paymentReminders.status, filters.status as PaymentReminder["status"]),
    );
  }
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        reminder: paymentReminders,
        studentName: students.name,
        course: subscriptions.course,
        method: subscriptions.paymentMethod,
        dueDateKey: subscriptions.dueDateKey,
        finalAmountMinor: subscriptions.finalAmountMinor,
      })
      .from(paymentReminders)
      .innerJoin(subscriptions, eq(subscriptions.id, paymentReminders.subscriptionId))
      .innerJoin(students, eq(students.id, subscriptions.studentId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(paymentReminders.scheduledFor), desc(paymentReminders.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(paymentReminders)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  return {
    items: rows.map(row => ({
      ...row.reminder,
      studentName: row.studentName,
      course: row.course,
      method: row.method,
      subscriptionDueDateKey: row.dueDateKey,
    })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

/**
 * Everything the PDF renderer needs. The remaining balance is the balance
 * immediately after THIS ledger entry, not today's balance, so a historical
 * receipt stays truthful after later payments or reversals.
 */
export async function buildReceiptData(paymentId: number) {
  const row = await getPaymentForReceipt(paymentId);
  if (!row) return null;
  const db = requireDb(await getDb());
  const settings = await getSettings();
  const ledger = await db
    .select({
      id: payments.id,
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(eq(payments.subscriptionId, row.payment.subscriptionId))
    .orderBy(asc(payments.id));
  let netPaid = 0;
  for (const entry of ledger) {
    if (entry.id > row.payment.id) break;
    if (entry.status !== "posted") continue;
    if (entry.type === "payment") netPaid += entry.amountMinor;
    else netPaid -= entry.amountMinor;
  }
  const remainingMinor = Math.max(
    0,
    row.subscription.finalAmountMinor - Math.max(0, netPaid),
  );
  return {
    academyName: settings.academyName,
    academyPhone: settings.academyPhone,
    academyAddress: settings.academyAddress,
    timeZone: settings.timezone,
    receiptNumber: row.payment.receiptNumber,
    paymentDate: row.payment.paymentDate,
    studentName: row.studentName,
    course: row.subscription.course,
    subscriptionType: subscriptionTypeLabel(row.subscription.type),
    amountMinor: row.payment.amountMinor,
    methodLabel: paymentMethodLabel(row.payment.method),
    dueDateKey: row.subscription.dueDateKey,
    remainingMinor,
    employeeName: row.recorderName ?? "—",
    transactionReference: row.payment.transactionReference,
    isReversal: row.payment.type === "reversal",
    reversalReason: row.payment.reversalReason,
  };
}

export function parseAmountOrThrow(value: string | number): number {
  const parsed = parseAmountToMinor(value);
  if (!parsed.ok) throw new FinanceError(parsed.error);
  return parsed.minor;
}

export function financeUserLabels() {
  return {
    methods: PAYMENT_METHOD_LABELS,
    statuses: {
      paid: "مدفوع",
      due: "مستحق",
      overdue: "متأخر",
      partially_paid: "مدفوع جزئياً",
    },
    subscriptionTypes: {
      monthly: subscriptionTypeLabel("monthly"),
      two_months: subscriptionTypeLabel("two_months"),
      one_time: subscriptionTypeLabel("one_time"),
    },
  };
}
