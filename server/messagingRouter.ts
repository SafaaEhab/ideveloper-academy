import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  messagingProcedure,
  router,
} from "./_core/trpc";
import { getSettings } from "./settings";
import {
  archiveTemplate,
  cancelCampaign,
  createCampaign,
  evaluateRecipient,
  getCampaignDetail,
  getRecipientCandidates,
  listCampaigns,
  listMessageHistory,
  listTemplates,
  messagingOverview,
  previewCampaign,
  refreshTemplateMetaStatus,
  retryFailedCampaignMessages,
  saveTemplate,
  setRecipientConsent,
  setRecipientOptOut,
} from "./messaging";
import { kickPhase2Worker, processCampaignBatch } from "./phase2Worker";
import { whatsappConfigStatus } from "./whatsappCloud";
import { tryWriteAudit } from "./audit";

const courseSchema = z.enum(["Scratch", "Robotics", "Web", "Python"]);
const messageTypeSchema = z.enum(["marketing", "transactional"]);

const recipientFiltersSchema = z.object({
  source: z.enum(["leads", "students"]),
  status: z.string().trim().max(40).optional(),
  course: courseSchema.optional(),
  groupId: z.number().int().positive().optional(),
  paymentStatus: z
    .enum(["paid", "due", "overdue", "partially_paid"])
    .optional(),
  assignedEmployeeId: z.number().int().positive().optional(),
  search: z.string().trim().max(120).optional(),
  ids: z.array(z.number().int().positive()).max(5000).optional(),
});

const templateInputSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(160),
  category: z.enum([
    "welcome",
    "class_reminder",
    "payment_reminder",
    "lead_follow_up",
    "custom",
  ]),
  body: z.string().trim().min(1).max(5000),
  variables: z.array(z.string().trim().max(40)).max(20).optional(),
  metaTemplateName: z.string().trim().max(120).optional().nullable(),
  language: z.string().trim().max(10).optional(),
  metaCategory: z
    .enum(["marketing", "utility", "authentication"])
    .optional()
    .nullable(),
  metaStatus: z
    .enum(["draft", "pending", "approved", "rejected", "disabled"])
    .optional(),
  active: z.boolean().optional(),
});

function toTRPCError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message:
      error instanceof Error ? error.message : "تعذر تنفيذ العملية",
  });
}

export const messagingRouter = router({
  overview: messagingProcedure.query(() => messagingOverview()),
  configStatus: messagingProcedure.query(() => whatsappConfigStatus()),

  templates: router({
    list: messagingProcedure
      .input(z.object({ includeInactive: z.boolean().default(false) }).optional())
      .query(({ input, ctx }) =>
        listTemplates(
          Boolean(input?.includeInactive) && ctx.phase2Actor.isAdmin,
        ),
      ),
    create: adminProcedure.input(templateInputSchema).mutation(async ({ input, ctx }) => {
      try {
        return await saveTemplate(
          { userId: ctx.user!.id, isAdmin: true, displayName: ctx.user!.name },
          input,
        );
      } catch (error) {
        return toTRPCError(error);
      }
    }),
    update: adminProcedure.input(templateInputSchema).mutation(async ({ input, ctx }) => {
      try {
        return await saveTemplate(
          { userId: ctx.user!.id, isAdmin: true, displayName: ctx.user!.name },
          input,
        );
      } catch (error) {
        return toTRPCError(error);
      }
    }),
    archive: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await archiveTemplate(
            { userId: ctx.user!.id, isAdmin: true },
            input.id,
          );
        } catch (error) {
          return toTRPCError(error);
        }
      }),
    refreshMetaStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await refreshTemplateMetaStatus(
            { userId: ctx.user!.id, isAdmin: true },
            input.id,
          );
        } catch (error) {
          return toTRPCError(error);
        }
      }),
  }),

  recipients: router({
    query: messagingProcedure
      .input(
        recipientFiltersSchema.extend({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(async ({ input }) => {
        const settings = await getSettings();
        const candidates = await getRecipientCandidates(input);
        const seen = new Set<string>();
        const evaluated = candidates.map(candidate =>
          evaluateRecipient(candidate, {
            messageType: "marketing",
            requireMarketingConsent: settings.requireMarketingConsent,
            seenPhones: seen,
          }),
        );
        const total = evaluated.length;
        const start = (input.page - 1) * input.pageSize;
        return {
          items: evaluated.slice(start, start + input.pageSize),
          total,
          page: input.page,
          pageSize: input.pageSize,
          eligibleCount: evaluated.filter(row => row.eligible).length,
          requireMarketingConsent: settings.requireMarketingConsent,
        };
      }),
    ids: messagingProcedure
      .input(recipientFiltersSchema)
      .query(async ({ input }) => {
        const candidates = await getRecipientCandidates(input);
        return {
          ids: candidates.map(row => row.recipientId),
          total: candidates.length,
        };
      }),
  }),

  preview: messagingProcedure
    .input(
      z.object({
        source: z.enum(["leads", "students"]),
        filters: recipientFiltersSchema
          .omit({ source: true, ids: true })
          .extend({
            ids: z.array(z.number().int().positive()).max(5000).optional(),
          })
          .optional(),
        body: z.string().trim().min(1).max(5000),
        messageType: messageTypeSchema,
        templateId: z.number().int().positive().nullable().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await previewCampaign({
          source: input.source,
          filters: input.filters,
          body: input.body,
          messageType: input.messageType,
          templateId: input.templateId ?? null,
        });
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  campaigns: router({
    create: messagingProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(200),
          source: z.enum(["leads", "students"]),
          filters: recipientFiltersSchema
            .omit({ source: true, ids: true })
            .extend({
              ids: z.array(z.number().int().positive()).max(5000).optional(),
            })
            .optional(),
          body: z.string().trim().min(1).max(5000),
          messageType: messageTypeSchema,
          templateId: z.number().int().positive().nullable().optional(),
          scheduledAt: z.string().trim().max(64).nullable().optional(),
          timezone: z.string().trim().max(64).optional(),
          batchSize: z.number().int().min(1).max(100).optional(),
          delayMs: z.number().int().min(250).max(60_000).optional(),
          freeFormWindowConfirmed: z.boolean().default(false),
          confirm: z.boolean(),
          expectedEligibleCount: z.number().int().min(0),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await createCampaign(
            {
              userId: ctx.user!.id,
              isAdmin: ctx.phase2Actor.isAdmin,
              displayName: ctx.phase2Actor.displayName,
            },
            input,
          );
          kickPhase2Worker();
          return result;
        } catch (error) {
          return toTRPCError(error);
        }
      }),
    list: messagingProcedure
      .input(
        z.object({
          status: z.string().trim().max(40).optional(),
          source: z.string().trim().max(20).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(({ input }) => listCampaigns(input)),
    detail: messagingProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const detail = await getCampaignDetail(input.id);
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الحملة غير موجودة" });
        }
        return detail;
      }),
    cancel: messagingProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(2).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await cancelCampaign(
            {
              userId: ctx.user!.id,
              isAdmin: ctx.phase2Actor.isAdmin,
            },
            input.id,
            input.reason,
          );
        } catch (error) {
          return toTRPCError(error);
        }
      }),
    retryFailed: messagingProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await retryFailedCampaignMessages(
            {
              userId: ctx.user!.id,
              isAdmin: ctx.phase2Actor.isAdmin,
            },
            input.id,
          );
          kickPhase2Worker();
          return result;
        } catch (error) {
          return toTRPCError(error);
        }
      }),
    runNow: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          const result = await processCampaignBatch(input.id);
          return result;
        } catch (error) {
          return toTRPCError(error);
        }
      }),
  }),

  history: messagingProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive().optional(),
        status: z.string().trim().max(40).optional(),
        phone: z.string().trim().max(40).optional(),
        fromKey: z.string().trim().max(10).optional(),
        toKey: z.string().trim().max(10).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(({ input }) => listMessageHistory(input)),

  optOut: messagingProcedure
    .input(
      z.object({
        recipientType: z.enum(["lead", "student"]),
        recipientId: z.number().int().positive(),
        optedOut: z.boolean(),
        reason: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await setRecipientOptOut(
          {
            userId: ctx.user!.id,
            isAdmin: ctx.phase2Actor.isAdmin,
          },
          input,
        );
        await tryWriteAudit({
          actorUserId: ctx.user!.id,
          action: "messaging.opt_out_changed",
          entityType: input.recipientType,
          entityId: input.recipientId,
          metadata: { optedOut: input.optedOut, reason: input.reason ?? null },
        });
        return result;
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  consent: messagingProcedure
    .input(
      z.object({
        recipientType: z.enum(["lead", "student"]),
        recipientId: z.number().int().positive(),
        consent: z.boolean(),
        source: z.string().trim().max(120).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await setRecipientConsent(
          {
            userId: ctx.user!.id,
            isAdmin: ctx.phase2Actor.isAdmin,
          },
          input,
        );
      } catch (error) {
        return toTRPCError(error);
      }
    }),

  worker: router({
    tick: adminProcedure.mutation(async () => {
      // Imported lazily to avoid a router/service cycle at module load.
      const { processPhase2Queue } = await import("./phase2Worker");
      return processPhase2Queue();
    }),
    templateApprovalCache: adminProcedure.mutation(async () => {
      const { __testing } = await import("./phase2Worker");
      __testing.clearApprovalCache();
      return { cleared: true };
    }),
  }),
});
