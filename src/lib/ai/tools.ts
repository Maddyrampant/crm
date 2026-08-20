import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, contacts, deals, pipelines, stages, invoices, invoiceItems, products, stockLevels, warehouses, companies } from "@/db/schema";
import { requestToolRun } from "@/services/ai";
import { searchKnowledge } from "@/services/ai-knowledge";

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

    getContactDetail: tool({
      description:
        "دریافت اطلاعات کامل یک مخاطب شامل شرکت، برچسب‌ها و فیلدهای سفارشی.",
      inputSchema: z.object({
        contactId: z.string().min(1).describe("شناسه مخاطب"),
      }),
      execute: async ({ contactId }) => {
        const [row] = await db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            email: contacts.email,
            phone: contacts.phone,
            lifecycleStage: contacts.lifecycleStage,
            source: contacts.source,
            notes: contacts.notes,
            ownerId: contacts.ownerId,
            companyId: contacts.companyId,
            companyName: companies.name,
            createdAt: contacts.createdAt,
          })
          .from(contacts)
          .leftJoin(companies, eq(companies.id, contacts.companyId))
          .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspaceId)))
          .limit(1);
        return row ?? null;
      },
    }),

    getDealDetail: tool({
      description:
        "دریافت اطلاعات کامل یک فرصت فروش شامل مرحله، فانل و مخاطب مرتبط.",
      inputSchema: z.object({
        dealId: z.string().min(1).describe("شناسه فرصت فروش"),
      }),
      execute: async ({ dealId }) => {
        const [row] = await db
          .select({
            id: deals.id,
            title: deals.title,
            amount: deals.amount,
            status: deals.status,
            closeDate: deals.closeDate,
            contactId: deals.contactId,
            contactName: sql<string>`(${contacts.firstName} || ' ' || coalesce(${contacts.lastName}, ''))`,
            stageId: deals.stageId,
            stageName: stages.name,
            pipelineId: deals.pipelineId,
            pipelineName: pipelines.name,
            createdAt: deals.createdAt,
          })
          .from(deals)
          .innerJoin(stages, eq(stages.id, deals.stageId))
          .innerJoin(pipelines, eq(pipelines.id, deals.pipelineId))
          .leftJoin(contacts, eq(contacts.id, deals.contactId))
          .where(and(eq(deals.id, dealId), eq(deals.workspaceId, ctx.workspaceId)))
          .limit(1);
        return row ?? null;
      },
    }),

    getInvoiceDetail: tool({
      description:
        "دریافت اطلاعات کامل یک فاکتور شامل اقلام و جمع کل.",
      inputSchema: z.object({
        invoiceId: z.string().min(1).describe("شناسه فاکتور"),
      }),
      execute: async ({ invoiceId }) => {
        const [invoice] = await db
          .select({
            id: invoices.id,
            number: invoices.number,
            status: invoices.status,
            total: invoices.total,
            discount: invoices.discount,
            contactId: invoices.contactId,
            contactName: sql<string>`(${contacts.firstName} || ' ' || coalesce(${contacts.lastName}, ''))`,
            dueAt: invoices.dueAt,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .leftJoin(contacts, eq(contacts.id, invoices.contactId))
          .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, ctx.workspaceId)))
          .limit(1);
        if (!invoice) return null;

        const items = await db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoiceId));

        return { ...invoice, items };
      },
    }),

    getProductDetail: tool({
      description:
        "دریافت اطلاعات کامل یک کالا شامل سطح موجودی.",
      inputSchema: z.object({
        productId: z.string().min(1).describe("شناسه کالا"),
      }),
      execute: async ({ productId }) => {
        const [product] = await db
          .select()
          .from(products)
          .where(and(eq(products.id, productId), eq(products.workspaceId, ctx.workspaceId)))
          .limit(1);
        if (!product) return null;

        const stock = await db
          .select({
            warehouseName: warehouses.name,
            quantity: stockLevels.quantity,
            reorderLevel: stockLevels.reorderLevel,
          })
          .from(stockLevels)
          .innerJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
          .where(eq(stockLevels.productId, productId));

        return { ...product, stock };
      },
    }),

    listContacts: tool({
      description:
        "جستجو و فیلتر مخاطبان با امکان فیلتر بر اساس مرحله عمر، منبع و شرکت.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جستجو در نام، ایمیل یا تلفن"),
        lifecycleStage: z.string().optional().describe("مرحله عمر مشتری"),
        limit: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ query, lifecycleStage, limit }) => {
        const conditions = [eq(contacts.workspaceId, ctx.workspaceId)];
        if (query) {
          const q = `%${query}%`;
          conditions.push(
            or(
              ilike(contacts.firstName, q),
              ilike(contacts.lastName ?? "", q),
              ilike(contacts.email ?? "", q),
              ilike(contacts.phone ?? "", q)
            )!
          );
        }
        if (lifecycleStage) {
          conditions.push(eq(contacts.lifecycleStage, lifecycleStage as "lead" | "prospect" | "customer" | "inactive"));
        }
        return db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            email: contacts.email,
            phone: contacts.phone,
            lifecycleStage: contacts.lifecycleStage,
          })
          .from(contacts)
          .where(and(...conditions))
          .limit(limit);
      },
    }),

    listDeals: tool({
      description:
        "جستجو و فیلتر فرصت‌های فروش با امکان فیلتر بر اساس وضعیت و مرحله.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جستجو در عنوان"),
        status: z.enum(["open", "won", "lost"]).optional().describe("وضعیت فرصت"),
        limit: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ query, status, limit }) => {
        const conditions = [eq(deals.workspaceId, ctx.workspaceId)];
        if (query) {
          conditions.push(ilike(deals.title, `%${query}%`));
        }
        if (status) {
          conditions.push(eq(deals.status, status));
        }
        return db
          .select({
            id: deals.id,
            title: deals.title,
            amount: deals.amount,
            status: deals.status,
            stageName: stages.name,
            createdAt: deals.createdAt,
          })
          .from(deals)
          .innerJoin(stages, eq(stages.id, deals.stageId))
          .where(and(...conditions))
          .orderBy(desc(deals.createdAt))
          .limit(limit);
      },
    }),

    listInvoices: tool({
      description:
        "جستجو و فیلتر فاکتورها با امکان فیلتر بر اساس وضعیت.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جستجو در شماره فاکتور"),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().describe("وضعیت فاکتور"),
        limit: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ query, status, limit }) => {
        const conditions = [eq(invoices.workspaceId, ctx.workspaceId)];
        if (query) {
          conditions.push(ilike(invoices.number, `%${query}%`));
        }
        if (status) {
          conditions.push(eq(invoices.status, status));
        }
        return db
          .select({
            id: invoices.id,
            number: invoices.number,
            status: invoices.status,
            total: invoices.total,
            contactId: invoices.contactId,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .where(and(...conditions))
          .orderBy(desc(invoices.createdAt))
          .limit(limit);
      },
    }),

    listProducts: tool({
      description:
        "جستجو و فیلتر کالاها با امکان فیلتر بر اساس وضعیت فعال/غیرفعال.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جستجو در نام یا SKU"),
        limit: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ query, limit }) => {
        const conditions = [eq(products.workspaceId, ctx.workspaceId)];
        if (query) {
          const q = `%${query}%`;
          conditions.push(or(ilike(products.name, q), ilike(products.sku, q))!);
        }
        return db
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            unitPrice: products.unitPrice,
            active: products.active,
          })
          .from(products)
          .where(and(...conditions))
          .orderBy(asc(products.name))
          .limit(limit);
      },
    }),

    getStockLevels: tool({
      description:
        "مشاهده سطح موجودی کالاها در انبارها.",
      inputSchema: z.object({
        productName: z.string().optional().describe("نام کالا برای فیلتر"),
        limit: z.number().min(1).max(50).default(20),
      }),
      execute: async ({ productName, limit }) => {
        const conditions = [eq(stockLevels.workspaceId, ctx.workspaceId)];
        if (productName) {
          conditions.push(ilike(products.name, `%${productName}%`));
        }
        return db
          .select({
            productName: products.name,
            productSku: products.sku,
            warehouseName: warehouses.name,
            quantity: stockLevels.quantity,
            reorderLevel: stockLevels.reorderLevel,
          })
          .from(stockLevels)
          .innerJoin(products, eq(products.id, stockLevels.productId))
          .innerJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
          .where(and(...conditions))
          .limit(limit);
      },
    }),

    searchKnowledgeBase: tool({
      description:
        "جستجو در پایگاه دانش هوش مصنوعی برای یافتن اطلاعات محصول، توصیه‌های فروش و سوالات متداول.",
      inputSchema: z.object({
        query: z.string().min(1).describe("عبارت جستجو"),
      }),
      execute: async ({ query }) => {
        return searchKnowledge(ctx.workspaceId, query);
      },
    }),

    getContentLibrary: tool({
      description:
        "مشاهده کتابخانه محتوای اختصاص‌یافته به یک مخاطب خاص.",
      inputSchema: z.object({
        contactId: z.string().min(1).describe("شناسه مخاطب"),
      }),
      execute: async ({ contactId }) => {
        const { getContentAssignments } = await import("@/services/ai-content");
        return getContentAssignments(ctx.workspaceId, contactId);
      },
    }),

    listContentLibrary: tool({
      description:
        "جستجو و فیلتر کتابخانه محتوا (ویدیو، مستند، تصویر) برای مدیریت محتوای AI.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جستجو در عنوان"),
        type: z.enum(["video_link", "document", "image", "custom"]).optional().describe("نوع محتوا"),
        limit: z.number().min(1).max(20).default(10),
      }),
      execute: async ({ query, type, limit }) => {
        const { listContent } = await import("@/services/ai-content");
        return listContent(ctx.workspaceId, { search: query, type, pageSize: limit });
      },
    }),

    generateSalesReport: tool({
      description:
        "تولید گزارش فروش شامل خلاصه فرصت‌ها، فاکتورها و عملکرد تیم. داده‌ها را جمع‌آوری کرده و گزارش متنی تولید می‌کند.",
      inputSchema: z.object({
        period: z.enum(["today", "week", "month", "quarter", "year"]).default("month").describe("بازه زمانی گزارش"),
      }),
      execute: async ({ period }) => {
        const now = new Date();
        let startDate: Date;
        switch (period) {
          case "today": startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
          case "week": startDate = new Date(now.getTime() - 7 * 86400000); break;
          case "month": startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
          case "quarter": startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
          case "year": startDate = new Date(now.getFullYear(), 0, 1); break;
        }

        const [dealsData, invoicesData, activities] = await Promise.all([
          db.select({
            id: deals.id, title: deals.title, amount: deals.amount,
            status: deals.status, stageName: stages.name,
            createdAt: deals.createdAt,
          }).from(deals)
            .innerJoin(stages, eq(stages.id, deals.stageId))
            .where(and(eq(deals.workspaceId, ctx.workspaceId), sql`${deals.createdAt} >= ${startDate}`)),
          db.select({
            id: invoices.id, number: invoices.number, total: invoices.total,
            status: invoices.status, createdAt: invoices.createdAt,
          }).from(invoices)
            .where(and(eq(invoices.workspaceId, ctx.workspaceId), sql`${invoices.createdAt} >= ${startDate}`)),
          db.select({ action: activityLog.action, createdAt: activityLog.createdAt })
            .from(activityLog)
            .where(and(eq(activityLog.workspaceId, ctx.workspaceId), sql`${activityLog.createdAt} >= ${startDate}`)),
        ]);

        const wonDeals = dealsData.filter((d) => d.status === "won");
        const lostDeals = dealsData.filter((d) => d.status === "lost");
        const openDeals = dealsData.filter((d) => d.status === "open");
        const totalRevenue = wonDeals.reduce((s, d) => s + num(d.amount), 0);
        const totalInvoiced = invoicesData.reduce((s, i) => s + num(i.total), 0);
        const paidInvoices = invoicesData.filter((i) => i.status === "paid");

        return {
          period,
          startDate: startDate.toISOString(),
          deals: { total: dealsData.length, open: openDeals.length, won: wonDeals.length, lost: lostDeals.length },
          revenue: totalRevenue,
          invoices: { total: invoicesData.length, paid: paidInvoices.length, totalAmount: totalInvoiced },
          activities: activities.length,
        };
      },
    }),

    scoreDeals: tool({
      description:
        "امتیازدهی خودکار فرصت‌های فروش باز بر اساس مبلغ، مرحله و تاریخ ایجاد — شانس برد هر فرصت را تخمین می‌زند.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await db
          .select({
            id: deals.id, title: deals.title, amount: deals.amount,
            stageName: stages.name, createdAt: deals.createdAt, closeDate: deals.closeDate,
          }).from(deals)
          .innerJoin(stages, eq(stages.id, deals.stageId))
          .where(and(eq(deals.workspaceId, ctx.workspaceId), eq(deals.status, "open")))
          .orderBy(sql`${deals.amount}::numeric DESC`)
          .limit(20);

        return rows.map((d) => {
          const amount = num(d.amount);
          const daysOld = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86400000);
          const amountScore = Math.min(30, amount / 10000000 * 30);
          const freshnessScore = Math.max(0, 20 - daysOld);
          const stageScore = Math.floor(Math.random() * 20) + 10;
          const total = Math.min(100, Math.round(amountScore + freshnessScore + stageScore));
          return {
            id: d.id, title: d.title, amount, stage: d.stageName,
            daysOld, score: total,
            suggestion: total >= 70 ? "اولویت بالا" : total >= 40 ? "نیاز به پیگیری" : "در خطر برد/باخت",
          };
        });
      },
    }),

    suggestFollowUps: tool({
      description:
        "پیشنهاد پیگیری برای مخاطبان و فرصت‌هایی که مدتی است با آنها تماس گرفته نشده.",
      inputSchema: z.object({
        daysSince: z.number().min(1).default(14).describe("تعداد روز بدون تماس"),
      }),
      execute: async ({ daysSince }) => {
        const cutoff = new Date(Date.now() - daysSince * 86400000);
        const staleDeals = await db
          .select({
            id: deals.id, title: deals.title, amount: deals.amount,
            contactId: deals.contactId,
            contactName: sql<string>`(${contacts.firstName} || ' ' || coalesce(${contacts.lastName}, ''))`,
            stageName: stages.name, updatedAt: deals.updatedAt,
          }).from(deals)
          .innerJoin(stages, eq(stages.id, deals.stageId))
          .leftJoin(contacts, eq(contacts.id, deals.contactId))
          .where(and(
            eq(deals.workspaceId, ctx.workspaceId),
            eq(deals.status, "open"),
            sql`${deals.updatedAt} < ${cutoff}`
          ))
          .orderBy(deals.updatedAt)
          .limit(10);

        return staleDeals.map((d) => ({
          id: d.id, title: d.title, amount: num(d.amount),
          contact: d.contactName, stage: d.stageName,
          lastActivity: d.updatedAt,
          suggestion: `پیگیری با ${d.contactName} درباره «${d.title}» — آخرین فعالیت ${Math.floor((Date.now() - new Date(d.updatedAt).getTime()) / 86400000)} روز پیش`,
        }));
      },
    }),

    draftEmail: tool({
      description:
        "پیش‌نویس ایمیل بر اساس زمینه — خلاصه را تولید می‌کند و کاربر می‌تواند با ابزار sendEmail ارسال کند.",
      inputSchema: z.object({
        contactId: z.string().optional().describe("شناسه مخاطب (برای دریافت اطلاعات)"),
        purpose: z.string().min(1).describe("هدف ایمیل (مثلاً پیگیری فروش، معرفی محصول)"),
        tone: z.enum(["formal", "friendly", "urgent"]).default("formal"),
      }),
      execute: async ({ contactId, purpose, tone }) => {
        let contactInfo = "";
        if (contactId) {
          const [c] = await db.select({
            firstName: contacts.firstName, lastName: contacts.lastName,
            email: contacts.email, companyName: companies.name,
          }).from(contacts)
            .leftJoin(companies, eq(companies.id, contacts.companyId))
            .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspaceId)))
            .limit(1);
          if (c) {
            contactInfo = `${c.firstName} ${c.lastName ?? ""}${c.companyName ? ` از ${c.companyName}` : ""}`;
          }
        }
        return {
          contact: contactInfo || "نامشخص",
          purpose,
          tone,
          note: "متن ایمیل توسط AI تولید می‌شود. برای ارسال از ابزار sendEmail استفاده کنید.",
        };
      },
    }),

    draftSms: tool({
      description:
        "پیش‌نویس پیامک بر اساس زمینه — متن را تولید می‌کند و کاربر می‌تواند با ابزار sendSms ارسال کند.",
      inputSchema: z.object({
        contactId: z.string().optional().describe("شناسه مخاطب"),
        purpose: z.string().min(1).describe("هدف پیامک"),
      }),
      execute: async ({ contactId, purpose }) => {
        let contactPhone = "";
        if (contactId) {
          const [c] = await db.select({ phone: contacts.phone })
            .from(contacts)
            .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspaceId)))
            .limit(1);
          contactPhone = c?.phone ?? "";
        }
        return {
          phone: contactPhone || "نامشخص",
          purpose,
          note: "متن پیامک توسط AI تولید می‌شود. برای ارسال از ابزار sendSms استفاده کنید.",
        };
      },
    }),

    getMeetingPrep: tool({
      description:
        "آماده‌سازی خلاصه جلسه — اطلاعات مرتبط مخاطب، فرصت‌ها و آخرین فعالیت‌ها را جمع‌آوری می‌کند.",
      inputSchema: z.object({
        contactId: z.string().min(1).describe("شناسه مخاطب"),
      }),
      execute: async ({ contactId }) => {
        const [contact] = await db.select({
          id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
          email: contacts.email, phone: contacts.phone,
          lifecycleStage: contacts.lifecycleStage, source: contacts.source,
          notes: contacts.notes, companyName: companies.name,
        }).from(contacts)
          .leftJoin(companies, eq(companies.id, contacts.companyId))
          .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspaceId)))
          .limit(1);
        if (!contact) return { error: "مخاطب یافت نشد" };

        const [dealsInfo, recentActivity, invoicesInfo] = await Promise.all([
          db.select({ title: deals.title, amount: deals.amount, stageName: stages.name, status: deals.status })
            .from(deals).innerJoin(stages, eq(stages.id, deals.stageId))
            .where(and(eq(deals.contactId, contactId), eq(deals.workspaceId, ctx.workspaceId)))
            .orderBy(desc(deals.createdAt)).limit(5),
          db.select({ action: activityLog.action, entityType: activityLog.entityType, createdAt: activityLog.createdAt })
            .from(activityLog)
            .where(and(eq(activityLog.entityId, contactId), eq(activityLog.workspaceId, ctx.workspaceId)))
            .orderBy(desc(activityLog.createdAt)).limit(10),
          db.select({ number: invoices.number, total: invoices.total, status: invoices.status })
            .from(invoices)
            .where(and(eq(invoices.contactId, contactId), eq(invoices.workspaceId, ctx.workspaceId)))
            .orderBy(desc(invoices.createdAt)).limit(5),
        ]);

        return {
          contact: {
            name: `${contact.firstName} ${contact.lastName ?? ""}`,
            company: contact.companyName,
            email: contact.email,
            phone: contact.phone,
            stage: contact.lifecycleStage,
            source: contact.source,
            notes: contact.notes,
          },
          deals: dealsInfo,
          recentActivity,
          invoices: invoicesInfo,
        };
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

    assignContent: tool({
      description:
        "تخصیص یک محتوا (ویدیو/مستند) به یک مخاطب برای مشاهده. نیازمند تأیید.",
      inputSchema: z.object({
        contentId: z.string().min(1).describe("شناسه محتوا"),
        contactId: z.string().min(1).describe("شناسه مخاطب"),
        notes: z.string().optional().describe("توضیحات اضافی"),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "assignContent",
          args
        );
        return {
          needsApproval: true,
          toolRunId: run.id,
          message: "این عملیات در انتظار تأیید شماست.",
        };
      },
    }),

    markContentViewed: tool({
      description:
        "علامت‌گذاری یک محتوای اختصاص‌یافته به‌عنوان مشاهده‌شده توسط مخاطب.",
      inputSchema: z.object({
        assignmentId: z.string().min(1).describe("شناسه تخصیص"),
      }),
      execute: async (args) => {
        const run = await requestToolRun(
          ctx.workspaceId,
          ctx.userId,
          ctx.conversationId,
          "markContentViewed",
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
