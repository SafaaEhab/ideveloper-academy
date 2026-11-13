import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import {
  auditLogs,
  campaignRecipients,
  campaigns,
  expenses,
  leadStaff,
  leads,
  messageTemplates,
  messagingOptOuts,
  paymentReminders,
  payments,
  studentCourses,
  students,
  subscriptions,
  users,
  whatsappWebhookEvents,
} from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { signStudentSession } from "./_core/studentSession";
import ExcelJS from "exceljs";
import {
  createSubscription,
  createExpense,
  recordPayment,
  reversePayment,
  getSubscriptionDetail,
  accountsDashboard,
  monthlyReport,
  exportMonthlyReport,
  updateSubscription,
  buildReceiptData,
} from "./finance";
import { generateReceiptBase64 } from "./receiptPdf";
import {
  previewCampaign,
  createCampaign,
  cancelCampaign,
  retryFailedCampaignMessages,
  saveTemplate,
} from "./messaging";
import { processCampaignBatch, __testing as workerTesting } from "./phase2Worker";
import { WhatsAppError, type WhatsAppProvider } from "./whatsappCloud";
import { __testing as webhookTesting } from "./whatsappWebhook";
import { currentMonthRange, dateKeyInTimeZone } from "../shared/time";
import { addDaysToDateKey } from "../shared/time";

// The integration suite talks to a remote staging database; 5s is too tight
// for a cold connection under load. Individual operations still fail fast.
vi.setConfig({ testTimeout: 30_000 });

const run = Boolean(process.env.DATABASE_URL);
const suite = run ? describe : describe.skip;

function contextFor(user: TrpcContext["user"], cookie?: string): TrpcContext {
  return {
    user,
    req: {
      headers: cookie ? { cookie } : {},
      ip: "127.0.0.1",
      socket: {},
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

type UserRow = InferSelectModel<typeof users>;
type StudentRow = InferSelectModel<typeof students>;
type LeadRow = InferSelectModel<typeof leads>;

let adminUser: UserRow;
let staffUser: UserRow;
let noPayStaffUser: UserRow;
let instructorUser: UserRow;
let studentOne: StudentRow;
let studentTwo: StudentRow;
let leadNormal: LeadRow;
let leadNotInterested: LeadRow;
let leadOptOut: LeadRow;
let leadNoConsent: LeadRow;
const createdUserIds: number[] = [];
const createdStudentIds: number[] = [];
const createdLeadIds: number[] = [];
const createdCampaignIds: number[] = [];
const createdTemplateIds: number[] = [];
const createdSubscriptionIds: number[] = [];
const createdExpenseIds: number[] = [];
const suffix = String(Date.now()).slice(-7);
const phoneBase = String(Date.now()).slice(-8).padStart(8, "0");
const phoneSuffix = (offset: number) =>
  String((Number(phoneBase) + offset) % 100_000_000).padStart(8, "0");

async function insertUser(
  role: "admin" | "user" | "instructor",
  label: string,
): Promise<UserRow> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = `phase2-${label}-${suffix}@example.com`;
  const inserted = await db.insert(users).values({
    openId: `phase2-${label}-${suffix}`,
    name: `Phase2 ${label}`,
    email,
    loginMethod: "test",
    role,
  });
  const id = Number(inserted[0].insertId);
  createdUserIds.push(id);
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0]!;
}

async function insertStudent(
  name: string,
  phone: string,
  course: "Scratch" | "Robotics" | "Web" | "Python",
  consent = true,
): Promise<StudentRow> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(students).values({
    name,
    phone,
    accessCode: `P2${suffix}${createdStudentIds.length}`.slice(0, 20),
    status: "active",
    whatsAppConsent: consent,
    whatsAppConsentSource: "phase2-test",
    whatsAppConsentAt: new Date(),
  });
  const id = Number(inserted[0].insertId);
  createdStudentIds.push(id);
  await db.insert(studentCourses).values({ studentId: id, course });
  const rows = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return rows[0]!;
}

async function insertLead(input: {
  name: string;
  phone: string;
  status: "new" | "needs_follow_up" | "subscribed" | "not_interested";
  consent: boolean;
  optedOut?: boolean;
}): Promise<LeadRow> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(leads).values({
    fullName: input.name,
    studentPhone: input.phone,
    age: 12,
    school: "Phase2 Test School",
    address: "Phase2 Test Address",
    parentEmail: `parent-${suffix}-${createdLeadIds.length}@example.com`,
    parentPhone: input.phone,
    course: "Python",
    gender: "male",
    status: input.status,
    whatsAppConsent: input.consent,
    whatsAppConsentSource: input.consent ? "phase2-test" : null,
    whatsAppConsentAt: input.consent ? new Date() : null,
    whatsAppOptOut: Boolean(input.optedOut),
    whatsAppOptOutAt: input.optedOut ? new Date() : null,
    source: "phase2-test",
  });
  const id = Number(inserted[0].insertId);
  createdLeadIds.push(id);
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0]!;
}

function providerOk(sent: { to: string; templateName: string }[] = []): WhatsAppProvider {
  return {
    configured: true,
    async getTemplate(name, language) {
      return {
        name,
        language,
        status: "APPROVED",
        category: "MARKETING",
        components: [
          { type: "BODY", text: "{{1}} {{2}} {{3}} {{4}}" },
        ],
      };
    },
    async sendTemplate(input) {
      sent.push({ to: input.to, templateName: input.templateName });
      return {
        providerMessageId: `wamid.phase2.${sent.length}.${suffix}`,
        acceptedAt: new Date(),
        rawStatus: "accepted",
      };
    },
    async sendText(input) {
      sent.push({ to: input.to, templateName: "text" });
      return {
        providerMessageId: `wamid.text.${sent.length}.${suffix}`,
        acceptedAt: new Date(),
        rawStatus: "accepted",
      };
    },
  };
}

suite("Phase 2 integration — messaging, subscriptions, payments, reports", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DATABASE_URL is required for Phase 2 integration tests");
    adminUser = await insertUser("admin", "admin");
    staffUser = await insertUser("user", "staff");
    noPayStaffUser = await insertUser("user", "staff-no-pay");
    instructorUser = await insertUser("instructor", "instructor");

    await db.insert(leadStaff).values([
      {
        userId: staffUser.id,
        displayName: "Phase2 Reception",
        email: staffUser.email!,
        active: true,
        canConvert: false,
        canMessaging: true,
        canRecordPayments: true,
        canManageSubscriptions: true,
        canViewReports: false,
        canManageExpenses: false,
        canViewSalaries: false,
        canManageFinanceSettings: false,
      },
      {
        userId: noPayStaffUser.id,
        displayName: "Phase2 Reception No Pay",
        email: noPayStaffUser.email!,
        active: true,
        canConvert: false,
        canMessaging: false,
        canRecordPayments: false,
        canManageSubscriptions: false,
        canViewReports: false,
        canManageExpenses: false,
        canViewSalaries: false,
        canManageFinanceSettings: false,
      },
    ]);

    studentOne = await insertStudent("طالب المرحلة الثانية", `+2010${phoneSuffix(0)}`, "Python");
    studentTwo = await insertStudent("أخ طالب المرحلة الثانية", `+2011${phoneSuffix(1)}`, "Python");

    leadNormal = await insertLead({
      name: "عميل مؤهل",
      phone: `+2012${phoneSuffix(2)}`,
      status: "new",
      consent: true,
    });
    leadNotInterested = await insertLead({
      name: "عميل غير راغب",
      phone: `+2015${phoneSuffix(3)}`,
      status: "not_interested",
      consent: true,
    });
    leadOptOut = await insertLead({
      name: "عميل أوقف الرسائل",
      phone: `+2010${phoneSuffix(4)}`,
      status: "new",
      consent: true,
      optedOut: true,
    });
    leadNoConsent = await insertLead({
      name: "عميل بلا موافقة",
      phone: `+2015${phoneSuffix(5)}`,
      status: "new",
      consent: false,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    try {
      if (createdCampaignIds.length) {
        await db
          .delete(campaignRecipients)
          .where(inArray(campaignRecipients.campaignId, createdCampaignIds));
        await db.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
      }
      if (createdSubscriptionIds.length) {
        await db
          .delete(paymentReminders)
          .where(inArray(paymentReminders.subscriptionId, createdSubscriptionIds));
        await db.delete(payments).where(inArray(payments.subscriptionId, createdSubscriptionIds));
        await db
          .delete(subscriptions)
          .where(inArray(subscriptions.id, createdSubscriptionIds));
      }
      if (createdExpenseIds.length) {
        await db.delete(expenses).where(inArray(expenses.id, createdExpenseIds));
      }
      if (createdTemplateIds.length) {
        await db
          .delete(messageTemplates)
          .where(inArray(messageTemplates.id, createdTemplateIds));
      }
      if (createdStudentIds.length) {
        await db
          .delete(messagingOptOuts)
          .where(
            and(
              eq(messagingOptOuts.recipientType, "student"),
              inArray(messagingOptOuts.recipientId, createdStudentIds),
            ),
          );
        await db
          .delete(studentCourses)
          .where(inArray(studentCourses.studentId, createdStudentIds));
        await db.delete(students).where(inArray(students.id, createdStudentIds));
      }
      if (createdLeadIds.length) {
        await db
          .delete(messagingOptOuts)
          .where(
            and(
              eq(messagingOptOuts.recipientType, "lead"),
              inArray(messagingOptOuts.recipientId, createdLeadIds),
            ),
          );
        await db.delete(leads).where(inArray(leads.id, createdLeadIds));
      }
      if (createdUserIds.length) {
        await db.delete(leadStaff).where(inArray(leadStaff.userId, createdUserIds));
        await db.delete(users).where(inArray(users.id, createdUserIds));
        await db
          .delete(auditLogs)
          .where(inArray(auditLogs.actorUserId, createdUserIds));
      }
      if (createdLeadIds.length) {
        await db
          .delete(auditLogs)
          .where(
            and(
              eq(auditLogs.action, "messaging.opt_out"),
              inArray(auditLogs.entityId, createdLeadIds),
            ),
          );
      }
      await db
        .delete(whatsappWebhookEvents)
        .where(
          or(
            like(whatsappWebhookEvents.payload, `%${suffix}%`),
            like(whatsappWebhookEvents.payload, "%waba-test%"),
          ),
        );
      workerTesting.clearApprovalCache();
    } catch (error) {
      console.error("[Phase2 test cleanup]", error);
    }
  });

  let subscriptionId = 0;
  let firstPaymentId = 0;
  let secondPaymentId = 0;
  let firstReceipt = "";
  let secondReceipt = "";

  it("creates a subscription with sibling and manual discounts", async () => {
    const detail = await createSubscription(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      {
        studentId: studentOne.id,
        course: "Python",
        type: "monthly",
        baseAmountMinor: 100000,
        siblingStudentId: studentTwo.id,
        siblingDiscountPercent: 10,
        manualDiscountMinor: 5000,
        discountReason: "خصم اختبار إداري",
        paymentMethod: "cash",
        startDateKey: dateKeyInTimeZone(new Date()),
        dueDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), 10),
        recurringDueDay: 10,
        reminderEnabled: true,
      },
    );
    expect(detail).not.toBeNull();
    subscriptionId = detail!.subscription.id;
    createdSubscriptionIds.push(subscriptionId);
    expect(detail!.subscription.baseAmountMinor).toBe(100000);
    expect(detail!.subscription.siblingDiscountMinor).toBe(10000);
    expect(detail!.subscription.manualDiscountMinor).toBe(5000);
    expect(detail!.subscription.finalAmountMinor).toBe(85000);
    expect(detail!.balance.status).toBe("due");
    expect(detail!.reminders.filter(item => item.status === "pending").length).toBeGreaterThan(0);
  });

  it("records a partial payment, keeps reminders active, and issues sequential receipts", async () => {
    const result = await recordPayment(
      { userId: staffUser.id, isAdmin: false, salaries: false },
      {
        subscriptionId,
        amountMinor: 30000,
        method: "cash",
        transactionReference: `phase2-pay-one-${suffix}`,
      },
    );
    firstPaymentId = result.payment.id;
    firstReceipt = result.payment.receiptNumber;
    expect(result.duplicate).toBe(false);
    expect(result.balance.status).toBe("partially_paid");
    expect(result.balance.remainingMinor).toBe(55000);
    expect(firstReceipt).toMatch(/^REC-\d{4}-\d{6}$/);

    const detail = await getSubscriptionDetail(subscriptionId);
    expect(detail!.reminders.some(item => item.status === "pending")).toBe(true);
  });

  it("treats a repeated transaction reference as an idempotent submission, not a second payment", async () => {
    const repeated = await recordPayment(
      { userId: staffUser.id, isAdmin: false, salaries: false },
      {
        subscriptionId,
        amountMinor: 30000,
        method: "cash",
        transactionReference: `phase2-pay-one-${suffix}`,
      },
    );
    expect(repeated.duplicate).toBe(true);
    expect(repeated.payment.id).toBe(firstPaymentId);
    const db = await getDb();
    const count = await db!
      .select({ n: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId));
    expect(Number(count[0].n)).toBe(1);
  });

  it("records the remaining payment, marks Paid, cancels reminders, and increments the receipt", async () => {
    const result = await recordPayment(
      { userId: staffUser.id, isAdmin: false, salaries: false },
      {
        subscriptionId,
        amountMinor: 55000,
        method: "cash",
        transactionReference: `phase2-pay-two-${suffix}`,
      },
    );
    secondPaymentId = result.payment.id;
    secondReceipt = result.payment.receiptNumber;
    expect(result.balance.status).toBe("paid");
    expect(result.balance.remainingMinor).toBe(0);
    expect(secondReceipt).toMatch(/^REC-\d{4}-\d{6}$/);
    const firstSequence = Number(firstReceipt.split("-").pop());
    const secondSequence = Number(secondReceipt.split("-").pop());
    expect(secondSequence).toBe(firstSequence + 1);

    const detail = await getSubscriptionDetail(subscriptionId);
    expect(detail!.reminders.filter(item => item.status === "pending")).toHaveLength(0);
    expect(detail!.reminders.some(item => item.status === "cancelled")).toBe(true);
  });

  it("generates a real PDF receipt containing a complete valid header", async () => {
    const data = await buildReceiptData(firstPaymentId);
    expect(data).not.toBeNull();
    const file = generateReceiptBase64(data!);
    const buffer = Buffer.from(file.base64, "base64");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(file.fileName).toBe(`${firstReceipt}.pdf`);
  });

  it("reverses a payment without deleting it, preserving the ledger and audit trail", async () => {
    const result = await reversePayment(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      { paymentId: secondPaymentId, reason: "اختبار قيد عكسي بسبب خطأ إدخال" },
    );
    expect(result.reversal.receiptNumber).toMatch(/^REV-\d{4}-\d{6}$/);
    expect(result.balance.status).toBe("partially_paid");
    expect(result.balance.remainingMinor).toBe(55000);

    const db = await getDb();
    const original = await db!
      .select()
      .from(payments)
      .where(eq(payments.id, secondPaymentId))
      .limit(1);
    expect(original[0]!.status).toBe("reversed");
    const reversal = await db!
      .select()
      .from(payments)
      .where(eq(payments.reversesPaymentId, secondPaymentId))
      .limit(1);
    expect(reversal[0]!.type).toBe("reversal");
    const audit = await db!
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "payment.reversed"))
      .limit(1);
    expect(audit[0]?.entityId).toBe(secondPaymentId);
  });

  it("refuses to change the amount after a payment exists", async () => {
    await expect(
      updateSubscription(
        { userId: adminUser.id, isAdmin: true, salaries: true },
        { id: subscriptionId, baseAmountMinor: 120000 },
      ),
    ).rejects.toThrow(/قيداً عكسياً|بعد تسجيل دفعة/);
  });

  it("records an expense and calculates net profit from valid payments only", async () => {
    const expense = await createExpense(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      {
        amountMinor: 10000,
        category: "equipment",
        expenseDateKey: dateKeyInTimeZone(new Date()),
        description: "اختبار مصروفات المرحلة الثانية",
      },
    );
    createdExpenseIds.push(expense.id);

    const range = currentMonthRange();
    const report = await monthlyReport({
      fromKey: range.fromKey,
      toKey: range.toKey,
      includeSalaries: true,
    });
    expect(report.revenueMinor).toBe(30000);
    expect(report.expenseMinor).toBe(10000);
    expect(report.netProfitMinor).toBe(20000);
    expect(report.payments.some(item => item.id === secondPaymentId)).toBe(false);

    const file = await exportMonthlyReport({
      fromKey: range.fromKey,
      toKey: range.toKey,
      includeSalaries: true,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(file.base64, "base64"));
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(
      expect.arrayContaining([
        "الملخص",
        "المدفوعات",
        "المصروفات",
        "حسب الكورس",
        "حسب طريقة الدفع",
        "حسب الموظف",
      ]),
    );
    expect(workbook.getWorksheet("المدفوعات")?.rowCount).toBeGreaterThan(1);
  });

  it("calculates the accounts dashboard from active subscriptions and actual remaining balances", async () => {
    const overdue = await createSubscription(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      {
        studentId: studentOne.id,
        course: "Python",
        type: "one_time",
        baseAmountMinor: 20000,
        paymentMethod: "instapay",
        startDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), -20),
        dueDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), -5),
        reminderEnabled: true,
      },
    );
    createdSubscriptionIds.push(overdue!.subscription.id);
    const dashboard = await accountsDashboard({});
    expect(dashboard.outstandingMinor).toBeGreaterThanOrEqual(75000);
    expect(dashboard.overdueMinor).toBeGreaterThanOrEqual(20000);
    expect(dashboard.overdueStudentCount).toBeGreaterThanOrEqual(1);
    expect(dashboard.overdue[0]?.dueDateKey <= addDaysToDateKey(dateKeyInTimeZone(new Date()), -5)).toBe(true);
  });

  it("applies overpayment policy without inventing a refund", async () => {
    const over = await createSubscription(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      {
        studentId: studentTwo.id,
        course: "Python",
        type: "one_time",
        baseAmountMinor: 10000,
        paymentMethod: "wallet",
        startDateKey: dateKeyInTimeZone(new Date()),
        dueDateKey: addDaysToDateKey(dateKeyInTimeZone(new Date()), 5),
      },
    );
    createdSubscriptionIds.push(over!.subscription.id);
    const result = await recordPayment(
      { userId: adminUser.id, isAdmin: true, salaries: true },
      {
        subscriptionId: over!.subscription.id,
        amountMinor: 12000,
        method: "wallet",
        transactionReference: `phase2-overpay-${suffix}`,
      },
    );
    expect(result.balance.status).toBe("paid");
    expect(result.balance.overpaidMinor).toBe(2000);
    expect(result.balance.remainingMinor).toBe(0);
  });

  let templateId = 0;
  let largeCampaignId = 0;

  it("previews and explains every exclusion: not interested, opted out and no consent", async () => {
    const preview = await previewCampaign({
      source: "leads",
      filters: {
        ids: [leadNormal.id, leadNotInterested.id, leadOptOut.id, leadNoConsent.id],
      },
      body: "مرحباً {{student_name}} في {{course_name}}",
      messageType: "marketing",
      templateId: null,
    });
    expect(preview.totalCandidates).toBe(4);
    expect(preview.eligibleCount).toBe(1);
    expect(preview.excludedCount).toBe(3);
    expect(preview.notInterestedCount).toBe(1);
    expect(preview.optedOutCount).toBe(1);
    expect(preview.noConsentCount).toBe(1);
    expect(preview.preview?.recipientName).toBe(leadNormal.fullName);
  });

  it("requires an explicit template for marketing campaigns", async () => {
    await expect(
      createCampaign(
        { userId: adminUser.id, isAdmin: true },
        {
          name: "بدون قالب",
          source: "leads",
          filters: { ids: [leadNormal.id] },
          body: "نص",
          messageType: "marketing",
          templateId: null,
          confirm: true,
          expectedEligibleCount: 1,
        },
      ),
    ).rejects.toThrow(/قالب/);
  });

  it("creates a shared template and a campaign of >100 recipients, then sends in batches", async () => {
    templateId = await saveTemplate(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 Template ${suffix}`,
        category: "lead_follow_up",
        body: "مرحباً {{student_name}}، كورس {{course_name}}، {{class_schedule}}، {{amount_due}}",
        metaTemplateName: `phase2_template_${suffix}`,
        language: "ar",
        metaCategory: "marketing",
        metaStatus: "pending",
      },
    );
    createdTemplateIds.push(templateId);

    const manyIds = [leadNormal.id];
    for (let index = 0; index < 105; index += 1) {
      const lead = await insertLead({
        name: `عميل حملة ${index}`,
        phone: `+2012${phoneSuffix(1000 + index)}`,
        status: "new",
        consent: true,
      });
      manyIds.push(lead.id);
    }
    const preview = await previewCampaign({
      source: "leads",
      filters: { ids: manyIds },
      body: "مرحباً {{student_name}} في {{course_name}}",
      messageType: "marketing",
      templateId,
    });
    expect(preview.eligibleCount).toBe(106);

    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 106 campaign ${suffix}`,
        source: "leads",
        filters: { ids: manyIds },
        body: "مرحباً {{student_name}} في {{course_name}}",
        messageType: "marketing",
        templateId,
        batchSize: 30,
        delayMs: 250,
        confirm: true,
        expectedEligibleCount: 106,
      },
    );
    largeCampaignId = created.campaignId;
    createdCampaignIds.push(largeCampaignId);

    const sent: { to: string; templateName: string }[] = [];
    const provider = providerOk(sent);
    let finalStatus = "queued";
    for (let iteration = 0; iteration < 10 && finalStatus !== "completed"; iteration += 1) {
      const result = await processCampaignBatch(largeCampaignId, {
        provider,
        sleepImpl: async () => undefined,
        batchSizeOverride: 30,
      });
      finalStatus = result.status;
    }
    expect(finalStatus).toBe("completed");
    expect(sent).toHaveLength(106);

    const db = await getDb();
    const campaignRow = await db!
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, largeCampaignId))
      .limit(1);
    expect(campaignRow[0]!.sentCount).toBe(106);
    expect(campaignRow[0]!.failedCount).toBe(0);
    const sentRows = await db!
      .select()
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, largeCampaignId),
          eq(campaignRecipients.status, "sent"),
        ),
      );
    expect(sentRows).toHaveLength(106);
    expect(sentRows.every(row => row.providerMessageId)).toBe(true);
  }, 120_000);

  it("never reports an unapproved Meta template as sent", async () => {
    const lead = await insertLead({
      name: "عميل قالب مرفوض",
      phone: `+2015${phoneSuffix(2000 + Number(suffix.slice(-3)))}`,
      status: "new",
      consent: true,
    });
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 rejected template ${suffix}`,
        source: "leads",
        filters: { ids: [lead.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);
    const provider: WhatsAppProvider = {
      ...providerOk(),
      async getTemplate(name, language) {
        return {
          name,
          language,
          status: "PENDING",
          category: "MARKETING",
          components: [],
        };
      },
    };
    workerTesting.clearApprovalCache();
    const result = await processCampaignBatch(created.campaignId, {
      provider,
      sleepImpl: async () => undefined,
    });
    expect(result.status).toBe("failed");
    expect(result.sent).toBe(0);
    expect(result.error).toContain("غير معتمد");
    const db = await getDb();
    const rows = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, created.campaignId));
    expect(rows[0]!.status).toBe("failed");
    expect(rows[0]!.providerMessageId).toBeNull();
  });

  it("retries a failed message only on explicit retry and never duplicates sent history", async () => {
    workerTesting.clearApprovalCache();
    const lead = await insertLead({
      name: "عميل إعادة محاولة",
      phone: `+2010${phoneSuffix(3000)}`,
      status: "new",
      consent: true,
    });
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 retry ${suffix}`,
        source: "leads",
        filters: { ids: [lead.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);

    const failingProvider: WhatsAppProvider = {
      ...providerOk(),
      async sendTemplate() {
        throw new WhatsAppError({
          code: "provider",
          message: "فشل اختباري من المزود",
          retryable: false,
        });
      },
    };
    const failed = await processCampaignBatch(created.campaignId, {
      provider: failingProvider,
      sleepImpl: async () => undefined,
    });
    expect(failed.sent).toBe(0);
    expect(failed.failed).toBe(1);

    const retried = await retryFailedCampaignMessages(
      { userId: adminUser.id, isAdmin: true },
      created.campaignId,
    );
    expect(retried.retried).toBe(1);
    const sent: { to: string; templateName: string }[] = [];
    const success = await processCampaignBatch(created.campaignId, {
      provider: providerOk(sent),
      sleepImpl: async () => undefined,
    });
    expect(success.status).toBe("completed");
    expect(sent).toHaveLength(1);

    const db = await getDb();
    const rows = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, created.campaignId));
    expect(rows.filter(row => row.status === "sent")).toHaveLength(1);
    expect(rows[0]!.retryCount).toBe(1);
    expect(rows[0]!.providerMessageId).toBeTruthy();
  });

  it("enforces one recipient row per campaign and recipient", async () => {
    const db = await getDb();
    const first = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, largeCampaignId))
      .limit(1);
    await expect(
      db!.insert(campaignRecipients).values({
        campaignId: first[0]!.campaignId,
        recipientType: first[0]!.recipientType,
        recipientId: first[0]!.recipientId,
        name: first[0]!.name,
        phone: first[0]!.phone,
        status: "queued",
      }),
    ).rejects.toBeTruthy();
  });

  it("backs off on HTTP 429 and resumes the same durable campaign later", async () => {
    const lead = await insertLead({
      name: "عميل حد الإرسال",
      phone: `+2010${phoneSuffix(4000)}`,
      status: "new",
      consent: true,
    });
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 rate limit ${suffix}`,
        source: "leads",
        filters: { ids: [lead.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);
    workerTesting.clearApprovalCache();
    const limited: WhatsAppProvider = {
      ...providerOk(),
      async sendTemplate() {
        throw new WhatsAppError({
          code: "rate_limited",
          message: "تم تجاوز حد الإرسال",
          retryable: true,
          retryAfterMs: 1000,
        });
      },
    };
    const first = await processCampaignBatch(created.campaignId, {
      provider: limited,
      sleepImpl: async () => undefined,
    });
    expect(first.status).toBe("queued");
    expect(first.sent).toBe(0);

    const db = await getDb();
    const afterLimit = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, created.campaignId))
      .limit(1);
    expect(afterLimit[0]!.status).toBe("queued");
    expect(afterLimit[0]!.retryCount).toBe(1);
    expect(afterLimit[0]!.nextAttemptAt).toBeTruthy();

    const sent: { to: string; templateName: string }[] = [];
    const later = new Date(Date.now() + 10 * 60 * 1000);
    const second = await processCampaignBatch(created.campaignId, {
      provider: providerOk(sent),
      now: later,
      sleepImpl: async () => undefined,
    });
    expect(second.status).toBe("completed");
    expect(second.sent).toBe(1);
    expect(sent).toHaveLength(1);
  }, 30_000);

  it("resumes a scheduled campaign from the database, independent of in-memory state", async () => {
    const lead = await insertLead({
      name: "عميل استمرارية",
      phone: `+2010${phoneSuffix(5000)}`,
      status: "new",
      consent: true,
    });
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 persistence ${suffix}`,
        source: "leads",
        filters: { ids: [lead.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);
    const db = await getDb();
    // Simulate a process restart after the scheduled time passed: the only
    // state the worker reads is the durable campaign row.
    await db!
      .update(campaigns)
      .set({ scheduledAt: new Date(Date.now() - 60_000) })
      .where(eq(campaigns.id, created.campaignId));
    const sent: { to: string; templateName: string }[] = [];
    const provider = providerOk(sent);
    let status = "scheduled";
    for (let attempt = 0; attempt < 4 && status !== "completed"; attempt += 1) {
      const result = await processCampaignBatch(created.campaignId, {
        provider,
        sleepImpl: async () => undefined,
      });
      status = result.status;
    }
    expect(status).toBe("completed");
    expect(sent).toHaveLength(1);
  });

  it("re-checks opt-out at send time so a queued marketing message is never sent", async () => {
    const lead = await insertLead({
      name: "عميل ألغى بعد الحملة",
      phone: `+2010${phoneSuffix(6000)}`,
      status: "new",
      consent: true,
    });
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 late opt-out ${suffix}`,
        source: "leads",
        filters: { ids: [lead.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);
    const db = await getDb();
    await db!
      .update(leads)
      .set({
        whatsAppOptOut: true,
        whatsAppOptOutAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    workerTesting.clearApprovalCache();
    const sent: { to: string; templateName: string }[] = [];
    const result = await processCampaignBatch(created.campaignId, {
      provider: providerOk(sent),
      sleepImpl: async () => undefined,
    });
    expect(result.sent).toBe(0);
    expect(sent).toHaveLength(0);
    const rows = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, created.campaignId));
    expect(rows[0]!.status).toBe("excluded");
    expect(rows[0]!.exclusionReason).toBe("opted_out");
  });

  it("schedules a campaign and cancels it before execution", async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const created = await createCampaign(
      { userId: adminUser.id, isAdmin: true },
      {
        name: `Phase2 scheduled ${suffix}`,
        source: "leads",
        filters: { ids: [leadNormal.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId,
        scheduledAt,
        confirm: true,
        expectedEligibleCount: 1,
      },
    );
    createdCampaignIds.push(created.campaignId);
    expect(created.status).toBe("scheduled");
    const cancelled = await cancelCampaign(
      { userId: adminUser.id, isAdmin: true },
      created.campaignId,
      "اختبار الإلغاء قبل التنفيذ",
    );
    expect(cancelled!.campaign.status).toBe("cancelled");
    expect(cancelled!.recipients.every(row => row.status === "cancelled")).toBe(true);
  });

  it("updates delivery status from a signed webhook exactly once and opts out on STOP", async () => {
    const db = await getDb();
    const recipient = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, largeCampaignId))
      .limit(1);
    expect(recipient[0]!.providerMessageId).toBeTruthy();
    const providerMessageId = recipient[0]!.providerMessageId!;
    const statusPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-test",
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: providerMessageId,
                    status: "delivered",
                    timestamp: "1760000000",
                    recipient_id: recipient[0]!.phone.replace(/^\+/, ""),
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const raw = Buffer.from(JSON.stringify(statusPayload));
    const first = await webhookTesting.processWebhook(raw);
    expect(first.statuses).toBe(1);
    const second = await webhookTesting.processWebhook(raw);
    expect(second.statuses).toBe(0);

    const updated = await db!
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.id, recipient[0]!.id))
      .limit(1);
    expect(updated[0]!.status).toBe("delivered");
    const events = await db!
      .select()
      .from(whatsappWebhookEvents)
      .where(like(whatsappWebhookEvents.payload, `%${providerMessageId}%`));
    expect(events).toHaveLength(1);

    const stopPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-test",
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    id: `wamid.stop.${suffix}`,
                    from: leadNormal.studentPhone.replace(/^\+/, ""),
                    timestamp: "1760000002",
                    type: "text",
                    text: { body: "STOP" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    await webhookTesting.processWebhook(Buffer.from(JSON.stringify(stopPayload)));
    const updatedLead = await db!
      .select()
      .from(leads)
      .where(eq(leads.id, leadNormal.id))
      .limit(1);
    expect(updatedLead[0]!.whatsAppOptOut).toBe(true);

    const afterStop = await previewCampaign({
      source: "leads",
      filters: { ids: [leadNormal.id] },
      body: "مرحباً {{student_name}}",
      messageType: "marketing",
      templateId: null,
    });
    expect(afterStop.eligibleCount).toBe(0);
    expect(afterStop.optedOutCount).toBe(1);
  });

  it("enforces permissions on the server for each role", async () => {
    const adminCaller = appRouter.createCaller(contextFor(adminUser));
    const staffCaller = appRouter.createCaller(contextFor(staffUser));
    const noPayCaller = appRouter.createCaller(contextFor(noPayStaffUser));
    const instructorCaller = appRouter.createCaller(contextFor(instructorUser));

    await expect(
      adminCaller.finance.payments.history({ page: 1, pageSize: 5 }),
    ).resolves.toBeTruthy();
    await expect(
      staffCaller.finance.payments.history({ page: 1, pageSize: 5 }),
    ).resolves.toBeTruthy();
    await expect(
      noPayCaller.finance.payments.history({ page: 1, pageSize: 5 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      instructorCaller.finance.dashboard({}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      noPayCaller.messaging.preview({
        source: "leads",
        filters: { ids: [leadNormal.id] },
        body: "مرحباً {{student_name}}",
        messageType: "marketing",
        templateId: null,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      instructorCaller.finance.expenses.list({ page: 1, pageSize: 5 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits the student portal to the signed-in student's own finance", async () => {
    const token = await signStudentSession(studentOne.id);
    const caller = appRouter.createCaller(
      contextFor(null, `student_session_id=${token}`),
    );
    const mine = await caller.portal.finance();
    expect(mine.subscriptions.length).toBeGreaterThan(0);
    expect(mine.subscriptions.every(row => row.studentId === studentOne.id)).toBe(true);
    await expect(
      caller.finance.payments.history({ page: 1, pageSize: 5 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
