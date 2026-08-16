import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  contacts,
  deals,
  pipelines,
  stages,
  user,
  type Deal,
} from "@/db/schema";
import { getActivityFeed } from "@/services/activity";
import { dispatchWebhookEvent } from "@/services/automation";
import { notifyWorkspace } from "@/services/notifications";
import { dispatchRuleEvent } from "@/services/rules";

const DEAL_SELECT = {
  deal: deals,
  contactName: contacts.firstName,
  contactLastName: contacts.lastName,
  contactEmail: contacts.email,
  companyName: companies.name,
  stageName: stages.name,
  stageColor: stages.color,
  ownerName: user.name,
};

export type DealFilters = {
  workspaceId: string;
  pipelineId?: string | null;
  stageId?: string | null;
  status?: Deal["status"] | null;
  ownerId?: string | null;
  contactId?: string | null;
  /** تاریخ شروع (شمول) — برای فیلتر بر اساس تاریخ بستن */
  closeDateFrom?: Date | null;
  /** تاریخ پایان (شمول) — برای فیلتر بر اساس تاریخ بستن */
  closeDateTo?: Date | null;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listDeals(filters: DealFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const conditions: SQL[] = [eq(deals.workspaceId, filters.workspaceId)];
  if (filters.pipelineId) conditions.push(eq(deals.pipelineId, filters.pipelineId));
  if (filters.stageId) conditions.push(eq(deals.stageId, filters.stageId));
  if (filters.status) conditions.push(eq(deals.status, filters.status));
  if (filters.ownerId) conditions.push(eq(deals.ownerId, filters.ownerId));
  if (filters.contactId) conditions.push(eq(deals.contactId, filters.contactId));
  if (filters.closeDateFrom) {
    conditions.push(gte(deals.closeDate, filters.closeDateFrom));
  }
  if (filters.closeDateTo) {
    conditions.push(lte(deals.closeDate, filters.closeDateTo));
  }
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    const searchCond = or(
      ilike(deals.title, q),
      ilike(contacts.firstName, q),
      ilike(contacts.lastName, q),
      ilike(companies.name, q)
    );
    if (searchCond) conditions.push(searchCond);
  }

  const [rows, totalRow] = await Promise.all([
    db
      .select(DEAL_SELECT)
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(stages, eq(stages.id, deals.stageId))
      .leftJoin(user, eq(user.id, deals.ownerId))
      .where(and(...conditions))
      .orderBy(desc(deals.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .where(and(...conditions)),
  ]);

  return {
    items: rows.map((r) => ({ ...r, amount: Number(r.deal.amount) })),
    total: Number(totalRow[0]?.value ?? 0),
  };
}

export type BoardDeal = {
  deal: Deal;
  contactName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  stageName: string | null;
  stageColor: string | null;
  ownerName: string | null;
  amount: number;
};

export type KanbanStage = typeof stages.$inferSelect & {
  deals: BoardDeal[];
};

export async function getKanbanBoard(workspaceId: string, pipelineId?: string | null) {
  let pipelineIdResolved = pipelineId ?? null;
  if (!pipelineIdResolved) {
    const [def] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.workspaceId, workspaceId))
      .orderBy(desc(pipelines.isDefault))
      .limit(1);
    pipelineIdResolved = def?.id ?? null;
  }

  if (!pipelineIdResolved) {
    return { pipeline: null, stages: [] as KanbanStage[] };
  }

  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, pipelineIdResolved), eq(pipelines.workspaceId, workspaceId)))
    .limit(1);

  if (!pipeline) return { pipeline: null, stages: [] as KanbanStage[] };

  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipeline.id))
    .orderBy(asc(stages.orderIndex));

  const dealRows = await db
    .select(DEAL_SELECT)
    .from(deals)
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(stages, eq(stages.id, deals.stageId))
    .leftJoin(user, eq(user.id, deals.ownerId))
    .where(eq(deals.pipelineId, pipeline.id))
    .orderBy(desc(deals.updatedAt));

  const stagesWithDeals: KanbanStage[] = stageRows.map((stage) => ({
    ...stage,
    deals: dealRows
      .filter((d) => d.deal.stageId === stage.id)
      .map((d) => ({ ...d, amount: Number(d.deal.amount) })),
  }));

  return { pipeline, stages: stagesWithDeals };
}

export async function getDeal(workspaceId: string, id: string) {
  const [row] = await db
    .select(DEAL_SELECT)
    .from(deals)
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(stages, eq(stages.id, deals.stageId))
    .leftJoin(user, eq(user.id, deals.ownerId))
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .limit(1);

  if (!row) return null;

  const activity = await getActivityFeed({
    workspaceId,
    entityType: "deal",
    entityId: id,
    limit: 20,
  });

  return { ...row, amount: Number(row.deal.amount), activity };
}

export type DealInput = {
  title: string;
  amount: number;
  pipelineId: string;
  stageId: string;
  contactId?: string | null;
  ownerId?: string | null;
  closeDate?: Date | null;
  status?: Deal["status"];
  lostReason?: string | null;
};

export async function createDeal(workspaceId: string, input: DealInput) {
  const [deal] = await db
    .insert(deals)
    .values({
      workspaceId,
      title: input.title,
      amount: String(input.amount),
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      contactId: input.contactId ?? null,
      ownerId: input.ownerId ?? null,
      closeDate: input.closeDate ?? null,
      status: input.status ?? "open",
      lostReason: input.lostReason ?? null,
    })
    .returning();

  dispatchWebhookEvent(workspaceId, "deal.created", { id: deal.id });
  return deal;
}

export async function updateDeal(
  workspaceId: string,
  id: string,
  input: Partial<DealInput>
) {
  const [deal] = await db
    .update(deals)
    .set({
      title: input.title,
      amount: input.amount !== undefined ? String(input.amount) : undefined,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      contactId: input.contactId ?? null,
      ownerId: input.ownerId ?? null,
      closeDate: input.closeDate ?? null,
      lostReason: input.lostReason ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .returning();

  return deal ?? null;
}

/** انتقال دیل به مرحله دیگر (درگ‌اند‌دراپ کانبان). */
export async function moveDeal(workspaceId: string, id: string, stageId: string) {
  const [before] = await db
    .select({
      stageId: deals.stageId,
      title: deals.title,
      amount: deals.amount,
      pipelineId: deals.pipelineId,
      contactId: deals.contactId,
      ownerId: deals.ownerId,
      status: deals.status,
    })
    .from(deals)
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .limit(1);
  if (!before || before.stageId === stageId) return null;

  const [deal] = await db
    .update(deals)
    .set({ stageId, updatedAt: new Date() })
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .returning();

  if (deal) {
    dispatchWebhookEvent(workspaceId, "deal.stage_changed", {
      id: deal.id,
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
    });
    dispatchRuleEvent(workspaceId, "deal.stage_changed", {
      entityId: deal.id,
      dealId: deal.id,
      title: deal.title,
      amount: Number(deal.amount),
      stageId: deal.stageId,
      fromStageId: before.stageId,
      pipelineId: deal.pipelineId,
      contactId: deal.contactId,
      ownerId: deal.ownerId,
      status: deal.status,
      link: "/pipeline",
    });
  }
  return deal ?? null;
}

/** ثبت برد/باخت دیل. */
export async function setDealOutcome(
  workspaceId: string,
  id: string,
  outcome: "won" | "lost",
  lostReason?: string | null
) {
  const [deal] = await db
    .update(deals)
    .set({
      status: outcome,
      wonAt: outcome === "won" ? new Date() : null,
      lostReason: outcome === "lost" ? (lostReason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .returning();

  if (deal?.status === "won") {
    await notifyWorkspace({
      workspaceId,
      type: "deal",
      title: "فرصت فروش به برد رسید",
      body: `فرصت «${deal.title}» با موفقیت بسته شد.`,
      link: "/pipeline",
      data: { dealId: deal.id, amount: Number(deal.amount) },
    });
  }

  if (deal) {
    dispatchWebhookEvent(workspaceId, "deal.outcome_changed", {
      id: deal.id,
      status: deal.status,
    });
    dispatchRuleEvent(workspaceId, "deal.outcome_changed", {
      entityId: deal.id,
      dealId: deal.id,
      title: deal.title,
      amount: Number(deal.amount),
      status: deal.status,
      stageId: deal.stageId,
      contactId: deal.contactId,
      ownerId: deal.ownerId,
      link: "/pipeline",
    });
  }
  return deal ?? null;
}

export async function deleteDeal(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(deals)
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, id)))
    .returning({ id: deals.id });

  if (deleted) {
    dispatchWebhookEvent(workspaceId, "deal.deleted", { id: deleted.id });
  }
  return deleted ?? null;
}
