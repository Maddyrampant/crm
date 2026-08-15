import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, contacts, deals, pipelines, stages } from "@/db/schema";
import { requestToolRun } from "@/services/ai";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export type ToolContext = {
  workspaceId: string;
  userId: string;
  conversationId: string;
};

/** ابزارهای فقط‌خواندنی — خودکار اجرا می‌شوند */
export function readTools(ctx: ToolContext) {
  return {
    searchContacts: tool({
      description:
        "جستجوی مخاطبان با نام، ایمیل یا شماره تماس. نتایج را با اطلاعات پایه برمی‌گرداند.",
      inputSchema: z.object({
        query: z.string().min(1).describe("عبارت جستجو"),
        limit: z.number().min(1).max(20).default(5),
      }),
      execute: async ({ query, limit }) => {
        const rows = await db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            email: contacts.email,
            phone: contacts.phone,
            lifecycleStage: contacts.lifecycleStage,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, ctx.workspaceId),
              or(
                ilike(contacts.firstName, `%${query}%`),
                ilike(contacts.lastName ?? "", `%${query}%`),
                ilike(contacts.email ?? "", `%${query}%`),
                ilike(contacts.phone ?? "", `%${query}%`)
              )
            )
          )
          .limit(limit);
        return rows;
      },
    }),

    getPipelineSummary: tool({
      description:
        "نمای کلی فانل فروش: لیست مراحل به ترتیب، تعداد و ارزش کل فرصت‌های باز هر مرحله.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await db
          .select({
            stage: stages.name,
            count: sql<number>`count(${deals.id})::int`,
            total: sql<string>`coalesce(sum(${deals.amount}::numeric),0)::text`,
          })
          .from(stages)
          .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
          .leftJoin(
            deals,
            and(eq(deals.stageId, stages.id), eq(deals.status, "open"))
          )
          .where(eq(pipelines.workspaceId, ctx.workspaceId))
          .groupBy(stages.name, stages.orderIndex)
          .orderBy(stages.orderIndex);
        return rows.map((r) => ({
          stage: r.stage,
          count: r.count,
          total: num(r.total),
        }));
      },
    }),

    getDealsByStage: tool({
      description:
        "فرصت‌های فروش باز به تفکیک مرحله با مجموع ارزش هر مرحله.",
      inputSchema: z.object({
        stageName: z.string().optional().describe("نام مرحله برای فیلتر"),
      }),
      execute: async ({ stageName }) => {
        const rows = await db
          .select({
            stage: stages.name,
            title: deals.title,
            amount: deals.amount,
          })
          .from(deals)
          .innerJoin(stages, eq(stages.id, deals.stageId))
          .where(
            and(
              eq(deals.workspaceId, ctx.workspaceId),
              eq(deals.status, "open"),
              stageName ? ilike(stages.name, `%${stageName}%`) : undefined
            )
          )
          .orderBy(stages.orderIndex);
        return rows.map((r) => ({
          stage: r.stage,
          title: r.title,
          amount: num(r.amount),
        }));
      },
    }),

    getRecentActivity: tool({
      description: "آخرین فعالیت‌های ثبت‌شده در سیستم (حداکثر ۲۰ رویداد).",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(10) }),
      execute: async ({ limit }) => {
        const rows = await db
          .select({
            action: activityLog.action,
            entityType: activityLog.entityType,
            createdAt: activityLog.createdAt,
          })
          .from(activityLog)
          .where(eq(activityLog.workspaceId, ctx.workspaceId))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);
        return rows;
      },
    }),
  };
}

/** ابزارهای نوشتنی — نیازمند تأیید انسانی */
export function writeTools(ctx: ToolContext) {
  return {
    createContact: tool({
      description:
        "ساخت مخاطب جدید. به‌دلیل نیاز به تأیید، ابتدا درخواست ثبت می‌شود و پس از تأیید انسانی اجرا می‌شود.",
      inputSchema: z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "createContact",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    createTask: tool({
      description:
        "ساخت تسک جدید برای یک مخاطب. به‌دلیل نیاز به تأیید، ابتدا درخواست ثبت می‌شود.",
      inputSchema: z.object({
        title: z.string().min(1),
        dueAt: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "createTask",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    createDeal: tool({
      description:
        "ساخت فرصت فروش جدید در فانل. به‌دلیل نیاز به تأیید، ابتدا درخواست ثبت می‌شود.",
      inputSchema: z.object({
        title: z.string().min(1).describe("عنوان فرصت فروش"),
        amount: z.number().min(0).optional().describe("مبلغ به تومان"),
        contactId: z.string().optional().describe("شناسه مخاطب مرتبط"),
        closeDate: z.string().optional().describe("تاریخ بسته‌شدن تخمینی (ISO)"),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "createDeal",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    updateDealStage: tool({
      description:
        "انتقال یک فرصت فروش به مرحله دیگر فانل (مثلاً «مذاکره» به «بستن قرارداد»). نیازمند تأیید.",
      inputSchema: z.object({
        dealId: z.string().min(1).describe("شناسه فرصت فروش"),
        stageName: z.string().min(1).describe("نام مرحله مقصد"),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "updateDealStage",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    createInvoice: tool({
      description:
        "صدور فاکتور برای یک مشتری (با شناسه مشتری) همراه با اقلام. نیازمند تأیید.",
      inputSchema: z.object({
        contactId: z.string().min(1).describe("شناسه مشتری"),
        dueAt: z.string().optional().describe("تاریخ سررسید (ISO)"),
        discount: z.number().min(0).optional(),
        taxRate: z.number().min(0).max(100).optional(),
        items: z
          .array(
            z.object({
              description: z.string().min(1).describe("شرح اقلام"),
              quantity: z.number().positive(),
              unitPrice: z.number().min(0),
              taxRate: z.number().min(0).max(100).default(0),
            })
          )
          .min(1),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "createInvoice",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    sendEmail: tool({
      description:
        "ارسال ایمیل به یک آدرس. نیازمند تأیید انسانی.",
      inputSchema: z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        contactId: z.string().optional(),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "sendEmail",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    sendSms: tool({
      description:
        "ارسال پیامک به یک شماره. نیازمند تأیید انسانی.",
      inputSchema: z.object({
        to: z.string().min(1).describe("شماره گیرنده"),
        body: z.string().min(1),
        contactId: z.string().optional(),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "sendSms",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),
  };
}
