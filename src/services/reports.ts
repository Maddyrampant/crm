import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cacheKey, cacheRemember } from "@/lib/cache";
import {
  activityLog,
  contacts,
  deals,
  invoices,
  payments,
  pipelines,
  stages,
} from "@/db/schema";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

/** ۶۰ ثانیه کش برای تجمیع‌های سنگین (بدون تغییر در شکل خروجی) */
const KPIS_TTL = 60;

export async function getKpis(workspaceId: string) {
  return cacheRemember(
    cacheKey("kpis", workspaceId),
    KPIS_TTL,
    async () => {
      const [contactRow, dealRow, invoiceRow, paymentRow] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(contacts)
          .where(eq(contacts.workspaceId, workspaceId)),
        db
          .select({
            openValue: sql<string>`coalesce(sum(case when deals.status = 'open' then deals.amount::numeric else 0 end),0)::text`,
            wonValue: sql<string>`coalesce(sum(case when deals.status = 'won' then deals.amount::numeric else 0 end),0)::text`,
            wonCount: sql<number>`count(*) filter (where deals.status = 'won')::int`,
            openCount: sql<number>`count(*) filter (where deals.status = 'open')::int`,
          })
          .from(deals)
          .where(eq(deals.workspaceId, workspaceId)),
        db
          .select({
            total: sql<string>`coalesce(sum(case when invoices.status != 'cancelled' then invoices.total::numeric else 0 end),0)::text`,
            paid: sql<string>`coalesce(sum(case when invoices.status = 'paid' then invoices.total::numeric else 0 end),0)::text`,
            overdue: sql<number>`count(*) filter (where invoices.status = 'overdue')::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(invoices)
          .where(eq(invoices.workspaceId, workspaceId)),
        db
          .select({ sum: sql<string>`coalesce(sum(amount::numeric),0)::text` })
          .from(payments)
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .where(eq(invoices.workspaceId, workspaceId)),
      ]);

      return {
        contacts: contactRow[0]?.count ?? 0,
        openDeals: dealRow[0]?.openCount ?? 0,
        wonDeals: dealRow[0]?.wonCount ?? 0,
        openValue: num(dealRow[0]?.openValue),
        wonValue: num(dealRow[0]?.wonValue),
        invoiceCount: invoiceRow[0]?.count ?? 0,
        invoiceTotal: num(invoiceRow[0]?.total),
        invoicePaid: num(invoiceRow[0]?.paid),
        overdueInvoices: invoiceRow[0]?.overdue ?? 0,
        collected: num(paymentRow[0]?.sum),
        winRate: num(dealRow[0]?.wonCount) + num(dealRow[0]?.openCount) > 0
          ? Math.round(
              (num(dealRow[0]?.wonCount) /
                (num(dealRow[0]?.wonCount) + num(dealRow[0]?.openCount))) * 100
            )
          : 0,
      };
    },
  );
}

/** درآمد واقعی (پرداخت‌ها) به تفکیک ۶ ماه اخیر */
export async function getRevenueByMonth(workspaceId: string, months = 6) {
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1));
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`to_char(payments.paid_at, 'YYYY-MM')`,
      sum: sql<string>`sum(payments.amount::numeric)::text`,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(and(eq(invoices.workspaceId, workspaceId), gte(payments.paidAt, from)))
    .groupBy(sql`to_char(payments.paid_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(payments.paid_at, 'YYYY-MM')`);

  return rows.map((r) => ({ month: r.month, revenue: num(r.sum) }));
}

/** فرصت‌های فروش به تفکیک مرحله */
export async function getPipelineStats(workspaceId: string) {
  const pipeline = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.workspaceId, workspaceId))
    .limit(1);
  const pipelineId = pipeline[0]?.id;
  if (!pipelineId) return [];

  const rows = await db
    .select({
      stageId: stages.id,
      stageName: stages.name,
      color: stages.color,
      count: sql<number>`count(deals.id)::int`,
      total: sql<string>`coalesce(sum(deals.amount::numeric),0)::text`,
    })
    .from(stages)
    .leftJoin(deals, and(eq(deals.stageId, stages.id), eq(deals.status, "open")))
    .where(eq(stages.pipelineId, pipelineId))
    .groupBy(stages.id, stages.name, stages.color)
    .orderBy(stages.orderIndex);

  return rows.map((r) => ({
    id: r.stageId,
    name: r.stageName,
    color: r.color,
    count: r.count,
    total: num(r.total),
  }));
}

/** مخاطبین به تفکیک منبع */
export async function getLeadSourceStats(workspaceId: string) {
  const rows = await db
    .select({
      source: contacts.source,
      count: sql<number>`count(*)::int`,
    })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId))
    .groupBy(contacts.source);
  return rows.map((r) => ({ source: r.source, count: r.count }));
}

export async function getRecentActivity(workspaceId: string, limit = 15) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.workspaceId, workspaceId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
