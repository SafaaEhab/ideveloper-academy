import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  campaignRecipients,
  campaigns,
  groups,
  leadStaff,
  leads,
  messageTemplates,
  messagingOptOuts,
  payments,
  students,
  studentCourses,
  subscriptions,
  users,
  type Campaign,
  type CampaignRecipient,
  type Lead,
  type MessageTemplate,
  type Student,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSettings } from "./settings";
import { writeAudit } from "./audit";
import { listLeadEmployees } from "./leads";
import {
  EXCLUSION_REASON_LABELS,
  isValidWhatsAppPhone,
  normalizeRecipientPhone,
  renderMessage,
  TEMPLATE_CATEGORY_LABELS,
  extractVariables,
  type ExclusionReason,
} from "../shared/messaging";
import {
  computeSubscriptionBalance,
  paymentStatusLabel,
} from "../shared/finance";
import { dateKeyInTimeZone } from "../shared/time";
import { formatMinorAmount } from "../shared/money";
import { getWhatsAppProvider, whatsappConfigStatus } from "./whatsappCloud";
import { applyOptOutSideEffects } from "./optOut";

/**
 * Recipient selection and campaign creation.
 *
 * The server always re-evaluates every exclusion at preview and again at
 * creation. A checkbox in the browser is never proof of eligibility, and the
 * confirmation screen receives the exact counts and reasons from this service.
 */

const MAX_RECIPIENT_SCAN = 5_000;
const MAX_CAMPAIGN_RECIPIENTS = 5_000;

export class MessagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagingError";
  }
}

export type MessagingActor = {
  userId: number;
  isAdmin: boolean;
  displayName?: string | null;
};

export type RecipientFilters = {
  source: "leads" | "students";
  status?: string;
  course?: string;
  groupId?: number;
  paymentStatus?: string;
  assignedEmployeeId?: number;
  search?: string;
  ids?: number[];
  page?: number;
  pageSize?: number;
};

export type RecipientCandidate = {
  recipientType: "lead" | "student";
  recipientId: number;
  name: string;
  phone: string | null;
  rawPhone: string | null;
  courseName: string;
  status: string;
  statusLabel: string;
  groupId: number | null;
  groupName: string | null;
  classSchedule: string | null;
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
  whatsAppConsent: boolean;
  whatsAppOptOut: boolean;
  paymentStatus: string | null;
  paymentStatusLabel: string | null;
  amountDueMinor: number;
  variables: Record<string, string>;
};

export type EvaluatedRecipient = RecipientCandidate & {
  eligible: boolean;
  exclusionReason: ExclusionReason | null;
  exclusionLabel: string | null;
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  needs_follow_up: "يحتاج متابعة",
  subscribed: "تم الاشتراك",
  not_interested: "غير راغب في الإكمال",
};

const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  paused: "موقوف",
};

function leadDisplayPhone(lead: Lead): { raw: string | null; normalized: string | null } {
  const primary = normalizeRecipientPhone(lead.studentPhone);
  if (primary) return { raw: lead.studentPhone, normalized: primary };
  const parent = normalizeRecipientPhone(lead.parentPhone);
  return { raw: lead.parentPhone, normalized: parent };
}

function classScheduleFor(group: {
  scheduleDays: string | null;
  scheduleTime: string | null;
} | null): string | null {
  if (!group) return null;
  const parts = [group.scheduleDays, group.scheduleTime].filter(Boolean);
  return parts.length ? parts.join(" — ") : null;
}

function aggregatePaymentState(
  items: { status: string; remainingMinor: number }[],
): { status: string | null; label: string | null; amountDueMinor: number } {
  const amountDueMinor = items.reduce((total, item) => total + item.remainingMinor, 0);
  if (!items.length) return { status: null, label: null, amountDueMinor: 0 };
  if (items.some(item => item.status === "overdue")) {
    return {
      status: "overdue",
      label: paymentStatusLabel("overdue"),
      amountDueMinor,
    };
  }
  if (items.some(item => item.status === "partially_paid")) {
    return {
      status: "partially_paid",
      label: paymentStatusLabel("partially_paid"),
      amountDueMinor,
    };
  }
  if (items.some(item => item.status === "due")) {
    return { status: "due", label: paymentStatusLabel("due"), amountDueMinor };
  }
  return { status: "paid", label: paymentStatusLabel("paid"), amountDueMinor };
}

async function leadCandidates(filters: RecipientFilters): Promise<RecipientCandidate[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.ids?.length) conditions.push(inArray(leads.id, filters.ids));
  if (filters.status && ["new", "needs_follow_up", "subscribed", "not_interested"].includes(filters.status)) {
    conditions.push(eq(leads.status, filters.status as Lead["status"]));
  }
  if (filters.course && ["Scratch", "Robotics", "Web", "Python"].includes(filters.course)) {
    conditions.push(eq(leads.course, filters.course as Lead["course"]));
  }
  if (filters.assignedEmployeeId) {
    conditions.push(eq(leads.assignedEmployeeId, filters.assignedEmployeeId));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        sql`${leads.fullName} like ${term}`,
        sql`${leads.studentPhone} like ${term}`,
        sql`${leads.parentPhone} like ${term}`,
      )!,
    );
  }
  const assigned = alias(users, "recipient_assigned_employee");
  const assignedStaff = alias(leadStaff, "recipient_assigned_staff");
  const rows = await db
    .select({
      lead: leads,
      assignedEmployeeName: sql<
        string | null
      >`coalesce(${assignedStaff.displayName}, ${assigned.name}, ${assigned.email})`,
    })
    .from(leads)
    .leftJoin(assigned, eq(assigned.id, leads.assignedEmployeeId))
    .leftJoin(assignedStaff, eq(assignedStaff.userId, leads.assignedEmployeeId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.registrationDate), desc(leads.id))
    .limit(MAX_RECIPIENT_SCAN);

  return rows.map(row => {
    const lead = row.lead;
    const phone = leadDisplayPhone(lead);
    const variables = {
      student_name: lead.fullName,
      course_name: lead.course,
      class_schedule: "",
      amount_due: "",
    };
    return {
      recipientType: "lead" as const,
      recipientId: lead.id,
      name: lead.fullName,
      phone: phone.normalized,
      rawPhone: phone.raw,
      courseName: lead.course,
      status: lead.status,
      statusLabel: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
      groupId: null,
      groupName: null,
      classSchedule: null,
      assignedEmployeeId: lead.assignedEmployeeId,
      assignedEmployeeName: row.assignedEmployeeName ?? null,
      whatsAppConsent: Boolean(lead.whatsAppConsent),
      whatsAppOptOut: Boolean(lead.whatsAppOptOut),
      paymentStatus: null,
      paymentStatusLabel: null,
      amountDueMinor: 0,
      variables,
    };
  });
}

async function studentCandidates(filters: RecipientFilters): Promise<RecipientCandidate[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.ids?.length) conditions.push(inArray(students.id, filters.ids));
  if (filters.status && ["active", "paused"].includes(filters.status)) {
    conditions.push(eq(students.status, filters.status as Student["status"]));
  }
  if (filters.groupId) conditions.push(eq(students.groupId, filters.groupId));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        sql`${students.name} like ${term}`,
        sql`${students.phone} like ${term}`,
      )!,
    );
  }

  const courseFilter =
    filters.course && ["Scratch", "Robotics", "Web", "Python"].includes(filters.course)
      ? (filters.course as "Scratch" | "Robotics" | "Web" | "Python")
      : null;
  if (courseFilter) {
    const enrolled = await db
      .select({ studentId: studentCourses.studentId })
      .from(studentCourses)
      .where(eq(studentCourses.course, courseFilter));
    const ids = enrolled.map(row => row.studentId);
    if (!ids.length) return [];
    conditions.push(inArray(students.id, ids));
  }

  const rows = await db
    .select({ student: students, group: groups })
    .from(students)
    .leftJoin(groups, eq(groups.id, students.groupId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(students.createdAt), desc(students.id))
    .limit(MAX_RECIPIENT_SCAN);
  if (!rows.length) return [];

  const studentIds = rows.map(row => row.student.id);
  const [courseRows, subscriptionRows, assignmentRows] = await Promise.all([
    db
      .select({ studentId: studentCourses.studentId, course: studentCourses.course })
      .from(studentCourses)
      .where(inArray(studentCourses.studentId, studentIds)),
    db
      .select()
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.studentId, studentIds),
          eq(subscriptions.status, "active"),
          courseFilter ? eq(subscriptions.course, courseFilter) : undefined,
        ),
      ),
    db
      .select({
        studentId: leads.convertedStudentId,
        assignedEmployeeId: leads.assignedEmployeeId,
      })
      .from(leads)
      .where(inArray(leads.convertedStudentId, studentIds)),
  ]);
  const subIds = subscriptionRows.map(row => row.id);
  const paymentRows = subIds.length
    ? await db
        .select({
          subscriptionId: payments.subscriptionId,
          type: payments.type,
          status: payments.status,
          amountMinor: payments.amountMinor,
        })
        .from(payments)
        .where(inArray(payments.subscriptionId, subIds))
    : [];
  const ledgerBySub = new Map<number, typeof paymentRows>();
  for (const row of paymentRows) {
    const list = ledgerBySub.get(row.subscriptionId) ?? [];
    list.push(row);
    ledgerBySub.set(row.subscriptionId, list);
  }
  const coursesByStudent = new Map<number, string[]>();
  for (const row of courseRows) {
    const list = coursesByStudent.get(row.studentId) ?? [];
    list.push(row.course);
    coursesByStudent.set(row.studentId, list);
  }
  const employeeByStudent = new Map<number, number>();
  for (const row of assignmentRows) {
    if (row.studentId && row.assignedEmployeeId) {
      employeeByStudent.set(row.studentId, row.assignedEmployeeId);
    }
  }
  const settings = await getSettings();
  const todayKey = dateKeyInTimeZone(new Date(), settings.timezone);
  const employeeRows = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
  const employeeName = new Map(
    employeeRows.map(row => [row.id, row.name || row.email || `#${row.id}`]),
  );

  const mapped: RecipientCandidate[] = rows.map(row => {
    const student = row.student;
    const studentSubs = subscriptionRows.filter(
      sub => sub.studentId === student.id,
    );
    const states = studentSubs.map(sub => {
      const balance = computeSubscriptionBalance({
        finalAmountMinor: sub.finalAmountMinor,
        dueDateKey: sub.dueDateKey,
        entries: (ledgerBySub.get(sub.id) ?? []) as {
          type: "payment" | "reversal";
          status: "posted" | "reversed";
          amountMinor: number;
        }[],
        todayKey,
      });
      return { status: balance.status, remainingMinor: balance.remainingMinor };
    });
    const aggregate = aggregatePaymentState(states);
    const courses = coursesByStudent.get(student.id) ?? [];
    const courseName = courseFilter ?? courses.join(" / ");
    const schedule = classScheduleFor(row.group);
    const phone = normalizeRecipientPhone(student.phone);
    const amountLabel =
      aggregate.amountDueMinor > 0
        ? formatMinorAmount(aggregate.amountDueMinor, { withCurrency: true })
        : "";
    return {
      recipientType: "student" as const,
      recipientId: student.id,
      name: student.name,
      phone,
      rawPhone: student.phone,
      courseName,
      status: student.status,
      statusLabel: STUDENT_STATUS_LABELS[student.status] ?? student.status,
      groupId: student.groupId,
      groupName: row.group?.name ?? null,
      classSchedule: schedule,
      assignedEmployeeId: employeeByStudent.get(student.id) ?? null,
      assignedEmployeeName: employeeName.get(employeeByStudent.get(student.id) ?? -1) ?? null,
      whatsAppConsent: Boolean(student.whatsAppConsent),
      whatsAppOptOut: Boolean(student.whatsAppOptOut),
      paymentStatus: aggregate.status,
      paymentStatusLabel: aggregate.label,
      amountDueMinor: aggregate.amountDueMinor,
      variables: {
        student_name: student.name,
        course_name: courseName,
        class_schedule: schedule ?? "",
        amount_due: amountLabel,
      },
    };
  });
  return mapped;
}

export async function getRecipientCandidates(
  filters: RecipientFilters,
): Promise<RecipientCandidate[]> {
  const rows =
    filters.source === "leads"
      ? await leadCandidates(filters)
      : await studentCandidates(filters);
  if (!filters.paymentStatus || filters.source === "leads") return rows;
  return rows.filter(row => row.paymentStatus === filters.paymentStatus);
}

export function evaluateRecipient(
  candidate: RecipientCandidate,
  options: {
    messageType: "marketing" | "transactional";
    requireMarketingConsent: boolean;
    seenPhones: Set<string>;
  },
): EvaluatedRecipient {
  let reason: ExclusionReason | null = null;
  if (!candidate.rawPhone || !candidate.rawPhone.trim()) {
    reason = "missing_phone";
  } else if (!candidate.phone || !isValidWhatsAppPhone(candidate.rawPhone)) {
    reason = "invalid_phone";
  } else if (options.seenPhones.has(candidate.phone)) {
    // Dedupe by normalized phone across both lists. This also prevents a
    // second sibling/parent row from receiving the same message twice.
    reason = "duplicate";
  } else {
    options.seenPhones.add(candidate.phone);
    if (candidate.whatsAppOptOut) reason = "opted_out";
    else if (
      candidate.recipientType === "lead" &&
      candidate.status === "not_interested"
    ) {
      reason = "not_interested";
    } else if (
      options.messageType === "marketing" &&
      options.requireMarketingConsent &&
      !candidate.whatsAppConsent
    ) {
      reason = "no_consent";
    }
  }
  return {
    ...candidate,
    eligible: reason === null,
    exclusionReason: reason,
    exclusionLabel: reason ? EXCLUSION_REASON_LABELS[reason] : null,
  };
}

export type PreviewInput = {
  source: "leads" | "students";
  filters?: Omit<RecipientFilters, "source" | "page" | "pageSize">;
  body: string;
  messageType: "marketing" | "transactional";
  templateId?: number | null;
};

export async function previewCampaign(input: PreviewInput) {
  const settings = await getSettings();
  const candidates = await getRecipientCandidates({
    source: input.source,
    ...input.filters,
  });
  const seenPhones = new Set<string>();
  const evaluated = candidates.map(candidate =>
    evaluateRecipient(candidate, {
      messageType: input.messageType,
      requireMarketingConsent: settings.requireMarketingConsent,
      seenPhones,
    }),
  );
  const eligible = evaluated.filter(row => row.eligible);
  const excluded = evaluated.filter(row => !row.eligible);
  const db = await getDb();
  const resolvedTemplate =
    input.templateId && db
      ? (
          await db
            .select()
            .from(messageTemplates)
            .where(eq(messageTemplates.id, input.templateId))
            .limit(1)
        )[0] ?? null
      : null;

  let templateProblem: string | null = null;
  if (resolvedTemplate) {
    if (!resolvedTemplate.active) templateProblem = "القالب المؤرشف لا يمكن استخدامه";
    else if (!resolvedTemplate.metaTemplateName) {
      templateProblem = "القالب المحلي لا يحمل اسم قالب Meta معتمد";
    } else if (
      ["rejected", "disabled"].includes(resolvedTemplate.metaStatus)
    ) {
      templateProblem = `حالة القالب في Meta: ${resolvedTemplate.metaStatus}. لا يمكن الإرسال.`;
    }
  }

  const previewRecipient = eligible[0] ?? evaluated[0] ?? null;
  const rendered = previewRecipient
    ? renderMessage(input.body, previewRecipient.variables)
    : { text: "", missing: extractVariables(input.body), used: [] };

  const grouped = new Map<string, { reason: string; label: string; count: number }>();
  for (const row of excluded) {
    const reason = row.exclusionReason ?? "duplicate";
    const entry = grouped.get(reason) ?? {
      reason,
      label: EXCLUSION_REASON_LABELS[reason as ExclusionReason] ?? reason,
      count: 0,
    };
    entry.count += 1;
    grouped.set(reason, entry);
  }

  return {
    source: input.source,
    messageType: input.messageType,
    totalCandidates: evaluated.length,
    eligibleCount: eligible.length,
    excludedCount: excluded.length,
    eligible: eligible.slice(0, 200).map(row => ({
      recipientType: row.recipientType,
      recipientId: row.recipientId,
      name: row.name,
      phone: row.phone,
      courseName: row.courseName,
      statusLabel: row.statusLabel,
      groupName: row.groupName,
      paymentStatusLabel: row.paymentStatusLabel,
      amountDueMinor: row.amountDueMinor,
    })),
    excluded: excluded.slice(0, 500).map(row => ({
      recipientType: row.recipientType,
      recipientId: row.recipientId,
      name: row.name,
      phone: row.phone ?? row.rawPhone,
      reason: row.exclusionReason,
      reasonLabel: row.exclusionLabel,
    })),
    exclusionGroups: [...grouped.values()],
    invalidPhoneCount: excluded.filter(row => row.exclusionReason === "invalid_phone")
      .length,
    missingPhoneCount: excluded.filter(row => row.exclusionReason === "missing_phone")
      .length,
    optedOutCount: excluded.filter(row => row.exclusionReason === "opted_out").length,
    notInterestedCount: excluded.filter(row => row.exclusionReason === "not_interested")
      .length,
    noConsentCount: excluded.filter(row => row.exclusionReason === "no_consent").length,
    duplicateCount: excluded.filter(row => row.exclusionReason === "duplicate").length,
    preview: previewRecipient
      ? {
          recipientType: previewRecipient.recipientType,
          recipientId: previewRecipient.recipientId,
          recipientName: previewRecipient.name,
          phone: previewRecipient.phone,
          text: rendered.text,
          missing: rendered.missing,
          used: rendered.used,
        }
      : null,
    template: resolvedTemplate
      ? {
          id: resolvedTemplate.id,
          name: resolvedTemplate.name,
          metaTemplateName: resolvedTemplate.metaTemplateName,
          language: resolvedTemplate.language,
          metaStatus: resolvedTemplate.metaStatus,
          category: resolvedTemplate.category,
        }
      : null,
    templateProblem,
    consentPolicyRequired: settings.requireMarketingConsent,
  };
}

export type CreateCampaignInput = {
  name: string;
  source: "leads" | "students";
  filters?: Omit<RecipientFilters, "source" | "page" | "pageSize">;
  body: string;
  messageType: "marketing" | "transactional";
  templateId?: number | null;
  scheduledAt?: string | null;
  timezone?: string;
  batchSize?: number;
  delayMs?: number;
  freeFormWindowConfirmed?: boolean;
  confirm: boolean;
  expectedEligibleCount: number;
};

export async function createCampaign(
  actor: MessagingActor,
  input: CreateCampaignInput,
  ipAddress?: string | null,
) {
  if (!input.confirm) {
    throw new MessagingError("يجب تأكيد الحملة قبل إنشائها");
  }
  if (!input.name.trim()) throw new MessagingError("اسم الحملة مطلوب");
  if (!input.body.trim()) throw new MessagingError("نص الرسالة مطلوب");
  if (!input.templateId && input.body.length > 4096) {
    throw new MessagingError(
      "نص رسالة WhatsApp لا يمكن أن يتجاوز 4096 حرفاً بدون قالب.",
    );
  }

  const settings = await getSettings();
  const campaignDb = await getDb();
  const resolvedTemplate =
    input.templateId && campaignDb
      ? (
          await campaignDb
            .select()
            .from(messageTemplates)
            .where(eq(messageTemplates.id, input.templateId))
            .limit(1)
        )[0] ?? null
      : null;
  if (input.templateId && !resolvedTemplate) {
    throw new MessagingError("القالب المختار غير موجود");
  }
  if (resolvedTemplate) {
    if (!resolvedTemplate.active) throw new MessagingError("القالب المؤرشف لا يمكن استخدامه");
    if (!resolvedTemplate.metaTemplateName) {
      throw new MessagingError(
        "القالب المختار غير مرتبط بقالب Meta معتمد. لا يمكن إرسال حملة جماعية برسالة حرة خارج نافذة الخدمة.",
      );
    }
    if (["rejected", "disabled"].includes(resolvedTemplate.metaStatus)) {
      throw new MessagingError(
        `حالة القالب في Meta هي ${resolvedTemplate.metaStatus}. لا يمكن اعتباره معتمداً.`,
      );
    }
  } else if (!input.freeFormWindowConfirmed) {
    throw new MessagingError(
      "الرسائل الجماعية خارج نافذة خدمة العميل تحتاج قالب Meta معتمداً. اختر قالباً أو أكد أن كل المستلمين داخل نافذة 24 ساعة.",
    );
  }
  if (!input.templateId && input.messageType === "marketing") {
    throw new MessagingError("لا يمكن إرسال حملة تسويقية برسالة حرة. اختر قالب Meta معتمداً.");
  }

  const preview = await previewCampaign({
    source: input.source,
    filters: input.filters,
    body: input.body,
    messageType: input.messageType,
    templateId: input.templateId,
  });
  if (preview.templateProblem) throw new MessagingError(preview.templateProblem);
  if (preview.eligibleCount === 0) {
    throw new MessagingError("لا يوجد مستلمون مؤهلون بعد تطبيق قواعد الاستبعاد");
  }
  if (preview.eligibleCount !== input.expectedEligibleCount) {
    throw new MessagingError(
      `تغيّرت قائمة المستلمين بعد المعاينة (المتوقع ${input.expectedEligibleCount} والمؤهل الآن ${preview.eligibleCount}). أعد المعاينة والتأكيد.`,
    );
  }
  if (preview.eligibleCount > MAX_CAMPAIGN_RECIPIENTS) {
    throw new MessagingError("عدد المستلمين أكبر من الحد الأقصى للحملة الواحدة");
  }

  let scheduleDate: Date | null = null;
  if (input.scheduledAt) {
    const parsed = new Date(input.scheduledAt);
    if (Number.isNaN(parsed.getTime())) throw new MessagingError("موعد الجدولة غير صحيح");
    if (parsed.getTime() <= Date.now() + 30_000) {
      throw new MessagingError("موعد الجدولة يجب أن يكون في المستقبل");
    }
    scheduleDate = parsed;
  }

  // Re-load all evaluated recipients so the campaign snapshot is exact. The
  // preview above only returns a sample for the UI.
  const candidates = await getRecipientCandidates({
    source: input.source,
    ...input.filters,
  });
  const seen = new Set<string>();
  const evaluated = candidates.map(candidate =>
    evaluateRecipient(candidate, {
      messageType: input.messageType,
      requireMarketingConsent: settings.requireMarketingConsent,
      seenPhones: seen,
    }),
  );
  const eligible = evaluated.filter(row => row.eligible);
  const excluded = evaluated.filter(row => !row.eligible);
  if (eligible.length !== preview.eligibleCount) {
    throw new MessagingError("تغيّرت قائمة المستلمين أثناء التأكيد. أعد المحاولة.");
  }

  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const now = new Date();
  let campaignId = 0;
  await db.transaction(async tx => {
    const inserted = await tx.insert(campaigns).values({
      name: input.name.trim().slice(0, 200),
      audience: input.source,
      messageType: input.messageType,
      templateId: input.templateId ?? null,
      body: input.body,
      status: scheduleDate ? "scheduled" : "queued",
      scheduledAt: scheduleDate,
      timezone: input.timezone || settings.timezone,
      batchSize: Math.min(100, Math.max(1, input.batchSize ?? settings.batchSize)),
      delayMs: Math.min(60_000, Math.max(250, input.delayMs ?? settings.delayMs)),
      createdByUserId: actor.userId,
      filtersJson: JSON.stringify(input.filters ?? {}),
      totalRecipients: eligible.length,
      excludedCount: excluded.length,
      createdAt: now,
      updatedAt: now,
    });
    campaignId = Number(inserted[0].insertId);

    const rows = [...eligible, ...excluded].map(row => {
      const rendered = renderMessage(input.body, row.variables);
      return {
        campaignId,
        recipientType: row.recipientType,
        recipientId: row.recipientId,
        name: row.name,
        phone: row.phone ?? row.rawPhone ?? "",
        status: row.eligible ? ("queued" as const) : ("excluded" as const),
        exclusionReason: row.exclusionReason,
        messageBody: rendered.text,
        variablesJson: JSON.stringify(row.variables),
        senderUserId: actor.userId,
        queuedAt: row.eligible ? now : null,
        createdAt: now,
        updatedAt: now,
      };
    });
    for (let index = 0; index < rows.length; index += 200) {
      await tx
        .insert(campaignRecipients)
        .values(rows.slice(index, index + 200))
        .onDuplicateKeyUpdate({ set: { updatedAt: now } });
    }

    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: "campaign.created",
      entityType: "campaign",
      entityId: campaignId,
      metadata: {
        source: input.source,
        messageType: input.messageType,
        templateId: input.templateId ?? null,
        eligible: eligible.length,
        excluded: excluded.length,
        scheduledAt: scheduleDate?.toISOString() ?? null,
      },
      ipAddress,
    });
  });
  return { campaignId, status: scheduleDate ? "scheduled" : "queued" };
}

export async function listCampaigns(filters: {
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: 1, pageSize: 25 };
  const conditions = [];
  if (filters.status && ["draft", "scheduled", "queued", "sending", "completed", "cancelled", "failed"].includes(filters.status)) {
    conditions.push(eq(campaigns.status, filters.status as Campaign["status"]));
  }
  if (filters.source && ["leads", "students", "mixed"].includes(filters.source)) {
    conditions.push(eq(campaigns.audience, filters.source as Campaign["audience"]));
  }
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, totalRows] = await Promise.all([
    db
      .select({ campaign: campaigns, creatorName: users.name })
      .from(campaigns)
      .leftJoin(users, eq(users.id, campaigns.createdByUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  return {
    items: rows.map(row => ({ ...row.campaign, creatorName: row.creatorName })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function getCampaignDetail(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ campaign: campaigns, creatorName: users.name })
    .from(campaigns)
    .leftJoin(users, eq(users.id, campaigns.createdByUserId))
    .where(eq(campaigns.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .orderBy(campaignRecipients.id)
    .limit(1_000);
  const counts = await db
    .select({
      status: campaignRecipients.status,
      count: sql<number>`count(*)`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .groupBy(campaignRecipients.status);
  const template = row.campaign.templateId
    ? (
        await db
          .select()
          .from(messageTemplates)
          .where(eq(messageTemplates.id, row.campaign.templateId))
          .limit(1)
      )[0] ?? null
    : null;
  return {
    campaign: { ...row.campaign, creatorName: row.creatorName },
    template,
    recipients,
    statusCounts: counts.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {}),
  };
}

export async function cancelCampaign(
  actor: MessagingActor,
  id: number,
  reason: string,
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  const campaign = rows[0];
  if (!campaign) throw new MessagingError("الحملة غير موجودة");
  if (["completed", "cancelled", "failed"].includes(campaign.status)) {
    throw new MessagingError("لا يمكن إلغاء حملة منتهية");
  }
  const now = new Date();
  await db.transaction(async tx => {
    await tx
      .update(campaigns)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledByUserId: actor.userId,
        lastError: reason.trim().slice(0, 1000) || null,
        updatedAt: now,
      })
      .where(eq(campaigns.id, id));
    await tx
      .update(campaignRecipients)
      .set({ status: "cancelled", updatedAt: now })
      .where(
        and(
          eq(campaignRecipients.campaignId, id),
          inArray(campaignRecipients.status, ["queued", "sending"]),
        ),
      );
    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: "campaign.cancelled",
      entityType: "campaign",
      entityId: id,
      metadata: { reason: reason.trim().slice(0, 500) },
      ipAddress,
    });
  });
  return getCampaignDetail(id);
}

export async function retryFailedCampaignMessages(
  actor: MessagingActor,
  campaignId: number,
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const campaignRows = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaignRows[0]) throw new MessagingError("الحملة غير موجودة");
  if (campaignRows[0].status === "cancelled") {
    throw new MessagingError("لا يمكن إعادة محاولة حملة ملغاة");
  }
  const failed = await db
    .select({ id: campaignRecipients.id, providerMessageId: campaignRecipients.providerMessageId })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "failed"),
      ),
    );
  const retryable = failed.filter(row => !row.providerMessageId);
  if (!retryable.length) {
    throw new MessagingError("لا توجد رسائل فاشلة قابلة لإعادة المحاولة");
  }
  const now = new Date();
  await db.transaction(async tx => {
    await tx
      .update(campaignRecipients)
      .set({
        status: "queued",
        error: null,
        nextAttemptAt: now,
        retryCount: sql`${campaignRecipients.retryCount} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, "failed"),
          sql`${campaignRecipients.providerMessageId} is null`,
        ),
      );
    await tx
      .update(campaigns)
      .set({
        status: "queued",
        completedAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(campaigns.id, campaignId));
    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: "campaign.retry_requested",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { retried: retryable.length },
      ipAddress,
    });
  });
  return { retried: retryable.length };
}

export async function listMessageHistory(filters: {
  campaignId?: number;
  status?: string;
  phone?: string;
  fromKey?: string;
  toKey?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: 1, pageSize: 25 };
  const conditions = [];
  if (filters.campaignId) conditions.push(eq(campaignRecipients.campaignId, filters.campaignId));
  if (filters.status && ["queued", "excluded", "sending", "sent", "delivered", "read", "failed", "cancelled"].includes(filters.status)) {
    conditions.push(eq(campaignRecipients.status, filters.status as CampaignRecipient["status"]));
  }
  if (filters.phone?.trim()) {
    conditions.push(sql`${campaignRecipients.phone} like ${`%${filters.phone.trim()}%`}`);
  }
  if (filters.fromKey) conditions.push(gte(campaignRecipients.createdAt, new Date(`${filters.fromKey}T00:00:00Z`)));
  if (filters.toKey) conditions.push(lte(campaignRecipients.createdAt, new Date(`${filters.toKey}T23:59:59Z`)));
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, totalRows] = await Promise.all([
    db
      .select({ recipient: campaignRecipients, campaignName: campaigns.name })
      .from(campaignRecipients)
      .innerJoin(campaigns, eq(campaigns.id, campaignRecipients.campaignId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(campaignRecipients.createdAt), desc(campaignRecipients.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  return {
    items: rows.map(row => ({ ...row.recipient, campaignName: row.campaignName })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function listTemplates(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messageTemplates)
    .where(includeInactive ? undefined : eq(messageTemplates.active, true))
    .orderBy(desc(messageTemplates.updatedAt));
}

export async function saveTemplate(
  actor: MessagingActor,
  input: {
    id?: number;
    name: string;
    category: MessageTemplate["category"];
    body: string;
    variables?: string[];
    metaTemplateName?: string | null;
    language?: string;
    metaCategory?: MessageTemplate["metaCategory"];
    metaStatus?: MessageTemplate["metaStatus"];
    active?: boolean;
  },
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  if (!input.name.trim()) throw new MessagingError("اسم القالب مطلوب");
  if (!input.body.trim()) throw new MessagingError("نص القالب مطلوب");
  const declared = input.variables?.length ? input.variables : extractVariables(input.body);
  const allowed = new Set([
    "student_name",
    "course_name",
    "class_schedule",
    "amount_due",
  ]);
  const unknown = declared.filter(name => !allowed.has(name));
  if (unknown.length) {
    throw new MessagingError(`متغيرات غير معروفة: ${unknown.join(", ")}`);
  }
  const now = new Date();
  if (input.id) {
    const rows = await db.select().from(messageTemplates).where(eq(messageTemplates.id, input.id)).limit(1);
    if (!rows[0]) throw new MessagingError("القالب غير موجود");
    await db
      .update(messageTemplates)
      .set({
        name: input.name.trim().slice(0, 160),
        category: input.category,
        body: input.body,
        variables: JSON.stringify(declared),
        metaTemplateName: input.metaTemplateName?.trim() || null,
        language: input.language?.trim() || "ar",
        metaCategory: input.metaCategory ?? rows[0].metaCategory,
        metaStatus: input.metaStatus ?? rows[0].metaStatus,
        active: input.active ?? rows[0].active,
        updatedByUserId: actor.userId,
        updatedAt: now,
      })
      .where(eq(messageTemplates.id, input.id));
    await writeAudit(db, {
      actorUserId: actor.userId,
      action: "template.updated",
      entityType: "message_template",
      entityId: input.id,
      metadata: { name: input.name, metaTemplateName: input.metaTemplateName ?? null },
      ipAddress,
    });
    return input.id;
  }
  const inserted = await db.insert(messageTemplates).values({
    name: input.name.trim().slice(0, 160),
    category: input.category,
    body: input.body,
    variables: JSON.stringify(declared),
    metaTemplateName: input.metaTemplateName?.trim() || null,
    language: input.language?.trim() || "ar",
    metaCategory: input.metaCategory ?? null,
    metaStatus: input.metaStatus ?? (input.metaTemplateName ? "pending" : "draft"),
    active: input.active ?? true,
    createdByUserId: actor.userId,
    updatedByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
  });
  const id = Number(inserted[0].insertId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "template.created",
    entityType: "message_template",
    entityId: id,
    metadata: { name: input.name, category: input.category },
    ipAddress,
  });
  return id;
}

export async function archiveTemplate(
  actor: MessagingActor,
  id: number,
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  await db
    .update(messageTemplates)
    .set({ active: false, updatedByUserId: actor.userId, updatedAt: new Date() })
    .where(eq(messageTemplates.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "template.archived",
    entityType: "message_template",
    entityId: id,
    ipAddress,
  });
  return { id };
}

export async function refreshTemplateMetaStatus(
  actor: MessagingActor,
  id: number,
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const rows = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
  const template = rows[0];
  if (!template) throw new MessagingError("القالب غير موجود");
  if (!template.metaTemplateName) {
    throw new MessagingError("هذا القالب لا يحمل اسم قالب Meta");
  }
  const provider = getWhatsAppProvider();
  if (!provider.configured) {
    throw new MessagingError(
      "واتساب غير مهيأ. أضف متغيرات WhatsApp أولاً للتحقق من اعتماد القالب لدى Meta.",
    );
  }
  const meta = await provider.getTemplate(template.metaTemplateName, template.language);
  const status = String(meta.status).toUpperCase();
  const mapped: MessageTemplate["metaStatus"] =
    status === "APPROVED"
      ? "approved"
      : status === "REJECTED"
        ? "rejected"
        : status === "PAUSED" || status === "DISABLED"
          ? "disabled"
          : "pending";
  const now = new Date();
  await db
    .update(messageTemplates)
    .set({
      metaStatus: mapped,
      metaStatusCheckedAt: now,
      metaCategory:
        meta.category?.toLowerCase() === "marketing"
          ? "marketing"
          : meta.category?.toLowerCase() === "authentication"
            ? "authentication"
            : "utility",
      updatedAt: now,
    })
    .where(eq(messageTemplates.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: "template.meta_status_refreshed",
    entityType: "message_template",
    entityId: id,
    metadata: { metaStatus: mapped, providerStatus: status },
    ipAddress,
  });
  return { id, metaStatus: mapped, providerStatus: status };
}

export async function setRecipientOptOut(
  actor: MessagingActor,
  input: {
    recipientType: "lead" | "student";
    recipientId: number;
    optedOut: boolean;
    reason?: string | null;
  },
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const now = new Date();
  let recipientPhone: string | null = null;
  await db.transaction(async tx => {
    if (input.recipientType === "lead") {
      const rows = await tx
        .select({ phone: leads.studentPhone })
        .from(leads)
        .where(eq(leads.id, input.recipientId))
        .limit(1);
      if (!rows[0]) throw new MessagingError("العميل غير موجود");
      recipientPhone = normalizeRecipientPhone(rows[0].phone);
      await tx
        .update(leads)
        .set({
          whatsAppOptOut: input.optedOut,
          whatsAppOptOutAt: input.optedOut ? now : null,
          whatsAppOptOutByUserId: actor.userId,
          syncRevision: sql`${leads.syncRevision} + 1`,
          googleSheetSyncStatus: "pending",
          updatedAt: now,
        })
        .where(eq(leads.id, input.recipientId));
    } else {
      const rows = await tx
        .select({ phone: students.phone })
        .from(students)
        .where(eq(students.id, input.recipientId))
        .limit(1);
      if (!rows[0]) throw new MessagingError("الطالب غير موجود");
      recipientPhone = normalizeRecipientPhone(rows[0].phone);
      await tx
        .update(students)
        .set({
          whatsAppOptOut: input.optedOut,
          whatsAppOptOutAt: input.optedOut ? now : null,
          whatsAppOptOutByUserId: actor.userId,
          updatedAt: now,
        })
        .where(eq(students.id, input.recipientId));
    }
    await tx.insert(messagingOptOuts).values({
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      optedOut: input.optedOut,
      reason: input.reason?.trim().slice(0, 500) || null,
      changedByUserId: actor.userId,
      createdAt: now,
    });
    await writeAudit(tx, {
      actorUserId: actor.userId,
      action: input.optedOut ? "messaging.opt_out" : "messaging.opt_in",
      entityType: input.recipientType,
      entityId: input.recipientId,
      metadata: { reason: input.reason ?? null },
      ipAddress,
    });
  });
  if (input.optedOut) {
    await applyOptOutSideEffects({
      phone: recipientPhone,
      studentId:
        input.recipientType === "student" ? input.recipientId : null,
      reason: "أوقف المستلم الرسائل",
    });
  }
  return { ok: true };
}

export async function setRecipientConsent(
  actor: MessagingActor,
  input: {
    recipientType: "lead" | "student";
    recipientId: number;
    consent: boolean;
    source?: string | null;
  },
  ipAddress?: string | null,
) {
  const db = await getDb();
  if (!db) throw new MessagingError("قاعدة البيانات غير متاحة");
  const now = new Date();
  const source = input.source?.trim().slice(0, 120) || "recorded_by_staff";
  if (input.recipientType === "lead") {
    await db
      .update(leads)
      .set({
        whatsAppConsent: input.consent,
        whatsAppConsentAt: input.consent ? now : null,
        whatsAppConsentSource: input.consent ? source : null,
        updatedAt: now,
      })
      .where(eq(leads.id, input.recipientId));
  } else {
    await db
      .update(students)
      .set({
        whatsAppConsent: input.consent,
        whatsAppConsentAt: input.consent ? now : null,
        whatsAppConsentSource: input.consent ? source : null,
        updatedAt: now,
      })
      .where(eq(students.id, input.recipientId));
  }
  await writeAudit(db, {
    actorUserId: actor.userId,
    action: input.consent ? "messaging.consent_recorded" : "messaging.consent_removed",
    entityType: input.recipientType,
    entityId: input.recipientId,
    metadata: { source },
    ipAddress,
  });
  return { ok: true };
}

export async function messagingOverview() {
  const config = whatsappConfigStatus();
  const db = await getDb();
  const counts = db
    ? await db
        .select({
          status: campaigns.status,
          count: sql<number>`count(*)`,
        })
        .from(campaigns)
        .groupBy(campaigns.status)
    : [];
  const templates = await listTemplates(true);
  const groupRows = db
    ? await db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .orderBy(groups.name)
    : [];
  return {
    whatsapp: config,
    templates,
    groups: groupRows,
    campaignCounts: counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {}),
    employees: await listLeadEmployees(),
  };
}

export function campaignRecipientVariables(row: CampaignRecipient): Record<string, string> {
  try {
    const parsed = JSON.parse(row.variablesJson ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch {
    return {};
  }
}

export function templateCategoryLabel(category: string): string {
  return TEMPLATE_CATEGORY_LABELS[category as keyof typeof TEMPLATE_CATEGORY_LABELS] ?? category;
}

export const __testing = {
  leadDisplayPhone,
  classScheduleFor,
  aggregatePaymentState,
};
