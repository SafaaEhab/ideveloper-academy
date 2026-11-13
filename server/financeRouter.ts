import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  expensesProcedure,
  financeSettingsProcedure,
  paymentsProcedure,
  reportsProcedure,
  router,
  subscriptionsProcedure,
} from "./_core/trpc";
import {
  accountsDashboard,
  buildReceiptData,
  cancelSubscription,
  createExpense,
  createSubscription,
  exportMonthlyReport,
  getExpenseAttachment,
  getStudentFinance,
  getSubscriptionDetail,
  listCoursePlans,
  listExpenses,
  listFinanceAudit,
  listFinanceEmployees,
  listFinanceStudents,
  listPayments,
  listReminders,
  listSubscriptions,
  monthlyReport,
  recordPayment,
  renewSubscription,
  reversePayment,
  updateExpense,
  updateSubscription,
  upsertCoursePlan,
} from "./finance";
import { getSettings, updateSettings, type AppSettings } from "./settings";
import { generateReceiptBase64 } from "./receiptPdf";
import {
  cancelRemindersForSubscription,
  createManualReminder,
} from "./reminderScheduler";
import { tryWriteAudit } from "./audit";
import { kickPhase2Worker } from "./phase2Worker";

const courseSchema = z.enum(["Scratch", "Robotics", "Web", "Python"]);
const methodSchema = z.enum(["bank_transfer", "instapay", "cash", "wallet"]);
const subscriptionTypeSchema = z.enum(["monthly", "two_months", "one_time"]);
const dateKeySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "حدد تاريخاً صحيحاً");

const attachmentSchema = z
  .object({
    dataBase64: z.string().min(10).max(8_000_000),
    mime: z.string().min(3).max(120),
    name: z.string().trim().max(255).optional().nullable(),
  })
  .nullable()
  .optional();

const subscriptionCreateSchema = z.object({
  studentId: z.number().int().positive(),
  course: courseSchema,
  type: subscriptionTypeSchema,
  baseAmountMinor: z.number().int().positive().nullable().optional(),
  siblingStudentId: z.number().int().positive().nullable().optional(),
  siblingDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  manualDiscountMinor: z.number().int().min(0).nullable().optional(),
  discountReason: z.string().trim().max(500).nullable().optional(),
  paymentMethod: methodSchema,
  dueDateKey: dateKeySchema,
  recurringDueDay: z.number().int().min(1).max(28).nullable().optional(),
  startDateKey: dateKeySchema,
  endDateKey: dateKeySchema.nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const subscriptionUpdateSchema = subscriptionCreateSchema
  .omit({
    studentId: true,
    course: true,
    type: true,
    startDateKey: true,
    endDateKey: true,
  })
  .partial()
  .extend({ id: z.number().int().positive() });

const reportFiltersSchema = z.object({
  fromKey: dateKeySchema,
  toKey: dateKeySchema,
  course: courseSchema.optional(),
  method: methodSchema.optional(),
  employeeId: z.number().int().positive().optional(),
});

const settingsPatchSchema = z
  .object({
    academyName: z.string().trim().max(160),
    academyPhone: z.string().trim().max(40),
    academyAddress: z.string().trim().max(300),
    timezone: z.string().trim().max(64),
    reminderOffsets: z.array(z.number().int().min(-30).max(60)).max(12),
    reminderHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    reminderEnabled: z.boolean(),
    siblingDiscountPercent: z.number().min(0).max(100),
    overpaymentPolicy: z.enum(["credit", "refund_required"]),
    thankYouEnabled: z.boolean(),
    cashInstructions: z.string().trim().max(2000),
    cashHours: z.string().trim().max(500),
    instapayNumber: z.string().trim().max(100),
    instapayInstructions: z.string().trim().max(2000),
    walletNumber: z.string().trim().max(100),
    walletInstructions: z.string().trim().max(2000),
    bankName: z.string().trim().max(200),
    bankAccountName: z.string().trim().max(200),
    bankAccountNumber: z.string().trim().max(100),
    bankIban: z.string().trim().max(100),
    bankInstructions: z.string().trim().max(2000),
    requireMarketingConsent: z.boolean(),
    batchSize: z.number().int().min(1).max(100),
    delayMs: z.number().int().min(250).max(60_000),
    retryLimit: z.number().int().min(0).max(10),
    paymentReminderTemplateName: z.string().trim().max(120),
    paymentReminderTemplateLanguage: z.string().trim().max(10),
    thankYouTemplateName: z.string().trim().max(120),
    thankYouTemplateLanguage: z.string().trim().max(10),
  })
  .partial();

function actorOf(ctx: {
  user: { id: number; name?: string | null };
  phase2Actor: { isAdmin: boolean; salaries: boolean; displayName: string | null };
}) {
  return {
    userId: ctx.user.id,
    isAdmin: ctx.phase2Actor.isAdmin,
    salaries: ctx.phase2Actor.salaries,
    displayName: ctx.phase2Actor.displayName,
  };
}

function fail(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: error instanceof Error ? error.message : "تعذر تنفيذ العملية المالية",
  });
}

export const financeRouter = router({
  settings: router({
    // Readable by anyone who can record a payment: they need the configured
    // cash/InstaPay/wallet/bank instructions to explain a payment to a parent.
    get: paymentsProcedure.query(async () => {
      const settings = await getSettings();
      return settings;
    }),
    update: financeSettingsProcedure
      .input(settingsPatchSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const updated = await updateSettings(
            input as Partial<AppSettings>,
            ctx.user!.id,
          );
          await tryWriteAudit({
            actorUserId: ctx.user!.id,
            action: "finance.settings_updated",
            entityType: "settings",
            metadata: { fields: Object.keys(input) },
          });
          return updated;
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  students: paymentsProcedure.query(() => listFinanceStudents()),
  employees: paymentsProcedure.query(() => listFinanceEmployees()),

  coursePlans: router({
    list: paymentsProcedure.query(() => listCoursePlans()),
    update: financeSettingsProcedure
      .input(
        z.object({
          course: courseSchema,
          basePriceMinor: z.number().int().positive().nullable(),
          currency: z.string().trim().max(8).optional(),
          defaultSubscriptionType: subscriptionTypeSchema,
          active: z.boolean(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await upsertCoursePlan({
            ...input,
            actorUserId: ctx.user!.id,
          });
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  subscriptions: router({
    list: subscriptionsProcedure
      .input(
        z.object({
          search: z.string().trim().max(120).optional(),
          course: courseSchema.optional(),
          status: z.enum(["active", "completed", "cancelled"]).optional(),
          paymentStatus: z
            .enum(["paid", "due", "overdue", "partially_paid"])
            .optional(),
          studentId: z.number().int().positive().optional(),
          groupId: z.number().int().positive().optional(),
          method: methodSchema.optional(),
          employeeId: z.number().int().positive().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(({ input }) => listSubscriptions(input)),
    get: subscriptionsProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const detail = await getSubscriptionDetail(input.id);
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الاشتراك غير موجود" });
        }
        return detail;
      }),
    create: subscriptionsProcedure
      .input(subscriptionCreateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await createSubscription(actorOf(ctx as never), input);
        } catch (error) {
          return fail(error);
        }
      }),
    update: subscriptionsProcedure
      .input(subscriptionUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await updateSubscription(actorOf(ctx as never), input);
        } catch (error) {
          return fail(error);
        }
      }),
    cancel: subscriptionsProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await cancelSubscription(actorOf(ctx as never), input);
        } catch (error) {
          return fail(error);
        }
      }),
    renew: subscriptionsProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await renewSubscription(actorOf(ctx as never), input.id);
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  payments: router({
    record: paymentsProcedure
      .input(
        z.object({
          subscriptionId: z.number().int().positive(),
          amountMinor: z.number().int().positive().max(1_000_000_000),
          method: methodSchema,
          transactionReference: z.string().trim().min(8).max(80),
          notes: z.string().trim().max(1000).nullable().optional(),
          receiptImage: attachmentSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await recordPayment(actorOf(ctx as never), input);
          kickPhase2Worker();
          return result;
        } catch (error) {
          return fail(error);
        }
      }),
    reverse: adminProcedure
      .input(
        z.object({
          paymentId: z.number().int().positive(),
          reason: z.string().trim().min(5).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await reversePayment(
            {
              userId: ctx.user!.id,
              isAdmin: true,
              salaries: true,
              displayName: ctx.user!.name,
            },
            input,
          );
          kickPhase2Worker();
          return result;
        } catch (error) {
          return fail(error);
        }
      }),
    history: paymentsProcedure
      .input(
        z.object({
          fromKey: dateKeySchema.optional(),
          toKey: dateKeySchema.optional(),
          studentId: z.number().int().positive().optional(),
          subscriptionId: z.number().int().positive().optional(),
          method: methodSchema.optional(),
          recordedByUserId: z.number().int().positive().optional(),
          status: z.enum(["posted", "reversed"]).optional(),
          includeReversals: z.boolean().default(true),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(({ input }) => listPayments(input)),
    receiptPdf: paymentsProcedure
      .input(z.object({ paymentId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        try {
          const data = await buildReceiptData(input.paymentId);
          if (!data) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "الدفعة غير موجودة",
            });
          }
          const file = generateReceiptBase64(data);
          await tryWriteAudit({
            actorUserId: ctx.user!.id,
            action: "payment.receipt_downloaded",
            entityType: "payment",
            entityId: input.paymentId,
          });
          return file;
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  reminders: router({
    list: paymentsProcedure
      .input(
        z.object({
          subscriptionId: z.number().int().positive().optional(),
          status: z
            .enum(["pending", "sending", "sent", "failed", "cancelled", "skipped"])
            .optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(({ input }) => listReminders(input)),
    sendNow: paymentsProcedure
      .input(z.object({ subscriptionId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await createManualReminder({
            subscriptionId: input.subscriptionId,
            actorUserId: ctx.user!.id,
          });
          await tryWriteAudit({
            actorUserId: ctx.user!.id,
            action: "reminder.manual_sent",
            entityType: "subscription",
            entityId: input.subscriptionId,
            metadata: { status: result.status, error: result.error ?? null },
          });
          if (result.status === "sent" || result.status === "pending") {
            kickPhase2Worker();
          }
          return result;
        } catch (error) {
          return fail(error);
        }
      }),
    cancel: subscriptionsProcedure
      .input(
        z.object({
          subscriptionId: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const count = await cancelRemindersForSubscription(
            input.subscriptionId,
            input.reason,
          );
          await tryWriteAudit({
            actorUserId: ctx.user!.id,
            action: "reminder.cancelled",
            entityType: "subscription",
            entityId: input.subscriptionId,
            metadata: { reason: input.reason, count },
          });
          return { cancelled: count };
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  dashboard: reportsProcedure
    .input(
      z
        .object({
          course: courseSchema.optional(),
          method: methodSchema.optional(),
          employeeId: z.number().int().positive().optional(),
          paymentStatus: z
            .enum(["paid", "due", "overdue", "partially_paid"])
            .optional(),
          fromKey: dateKeySchema.optional(),
          toKey: dateKeySchema.optional(),
        })
        .optional(),
    )
    .query(({ input }) => accountsDashboard(input ?? {})),

  overdue: reportsProcedure
    .input(
      z
        .object({
          course: courseSchema.optional(),
          method: methodSchema.optional(),
          employeeId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const dashboard = await accountsDashboard(input ?? {});
      return {
        items: dashboard.overdue,
        overdueMinor: dashboard.overdueMinor,
        overdueStudentCount: dashboard.overdueStudentCount,
      };
    }),

  expenses: router({
    list: expensesProcedure
      .input(
        z.object({
          fromKey: dateKeySchema.optional(),
          toKey: dateKeySchema.optional(),
          category: z
            .enum(["rent", "trainer_salaries", "equipment", "other"])
            .optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(({ input, ctx }) => listExpenses(actorOf(ctx as never), input)),
    create: expensesProcedure
      .input(
        z.object({
          amountMinor: z.number().int().positive().max(1_000_000_000),
          category: z.enum([
            "rent",
            "trainer_salaries",
            "equipment",
            "other",
          ]),
          expenseDateKey: dateKeySchema,
          description: z.string().trim().min(2).max(1000),
          attachment: attachmentSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await createExpense(actorOf(ctx as never), input);
        } catch (error) {
          return fail(error);
        }
      }),
    update: expensesProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          amountMinor: z.number().int().positive().max(1_000_000_000).optional(),
          category: z
            .enum(["rent", "trainer_salaries", "equipment", "other"])
            .optional(),
          expenseDateKey: dateKeySchema.optional(),
          description: z.string().trim().min(2).max(1000).optional(),
          status: z.enum(["active", "archived"]).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await updateExpense(actorOf(ctx as never), input);
        } catch (error) {
          return fail(error);
        }
      }),
    attachment: expensesProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        try {
          const file = await getExpenseAttachment(actorOf(ctx as never), input.id);
          if (!file) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "لا يوجد مرفق لهذا المصروف",
            });
          }
          return file;
        } catch (error) {
          return fail(error);
        }
      }),
  }),

  reports: router({
    monthly: reportsProcedure
      .input(reportFiltersSchema)
      .query(({ input, ctx }) =>
        monthlyReport({
          ...input,
          includeSalaries: Boolean(ctx.phase2Actor.salaries),
        }),
      ),
    exportExcel: reportsProcedure
      .input(reportFiltersSchema)
      .mutation(async ({ input, ctx }) => {
        const file = await exportMonthlyReport({
          ...input,
          includeSalaries: Boolean(ctx.phase2Actor.salaries),
        });
        return {
          fileName: file.fileName,
          mime: file.mime,
          base64: file.base64,
          totals: {
            revenueMinor: file.report.revenueMinor,
            expenseMinor: file.report.expenseMinor,
            netProfitMinor: file.report.netProfitMinor,
            paymentCount: file.report.paymentCount,
          },
        };
      }),
  }),

  audit: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .query(({ input }) => listFinanceAudit(input.limit)),
  }),
});
