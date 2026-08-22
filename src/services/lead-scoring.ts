import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, activityLog, invoices } from "@/db/schema";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export type LeadScoreSettings = {
  activityWeight: number;
  dealWeight: number;
  invoiceWeight: number;
  recencyDecayDays: number;
  maxScore: number;
};

const DEFAULT_SETTINGS: LeadScoreSettings = {
  activityWeight: 5,
  dealWeight: 10,
  invoiceWeight: 1,
  recencyDecayDays: 90,
  maxScore: 100,
};

export async function calculateLeadScore(workspaceId: string, contactId: string) {
  const settings = DEFAULT_SETTINGS;

  const [activityCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLog)
    .where(and(eq(activityLog.workspaceId, workspaceId), eq(activityLog.entityId, contactId)));

  const [dealStats] = await db
    .select({
      wonCount: sql<number>`count(*) filter (where ${deals.status} = 'won')::int`,
      openCount: sql<number>`count(*) filter (where ${deals.status} = 'open')::int`,
    })
    .from(deals)
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.contactId, contactId)));

  const [invoiceStats] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.total}::numeric), 0)::text`,
    })
    .from(invoices)
    .where(and(eq(invoices.workspaceId, workspaceId), eq(invoices.contactId, contactId)));

  const [lastActivity] = await db
    .select({ createdAt: activityLog.createdAt })
    .from(activityLog)
    .where(and(eq(activityLog.workspaceId, workspaceId), eq(activityLog.entityId, contactId)))
    .orderBy(sql`${activityLog.createdAt} DESC`)
    .limit(1);

  const activityScore = num(activityCount?.count) * settings.activityWeight;
  const dealScore = (num(dealStats?.wonCount) * 2 + num(dealStats?.openCount)) * settings.dealWeight;
  const invoiceScore = num(invoiceStats?.total) * settings.invoiceWeight;

  let recencyMultiplier = 1;
  if (lastActivity?.createdAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    recencyMultiplier = Math.max(0.1, 1 - daysSince / settings.recencyDecayDays);
  }

  const rawScore = (activityScore + dealScore + invoiceScore) * recencyMultiplier;
  const score = Math.min(settings.maxScore, Math.round(rawScore));

  await db
    .update(contacts)
    .set({ leadScore: score, updatedAt: new Date() })
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.id, contactId)));

  return score;
}

export async function getLeadScoreSettings(_workspaceId: string) {
  return DEFAULT_SETTINGS;
}

export async function updateLeadScoreSettings(_workspaceId: string, _settings: Partial<LeadScoreSettings>) {
  return { ok: true as const };
}

export async function batchScoreContacts(workspaceId: string) {
  const settings = DEFAULT_SETTINGS;
  const decayDays = settings.recencyDecayDays;
  const maxScore = settings.maxScore;
  const now = Date.now();

  // 4 batch queries instead of 5N (was: 4 selects + 1 update per contact)
  const [contactRows, activityRows, dealRows, invoiceRows] = await Promise.all([
    db.select({ id: contacts.id }).from(contacts).where(eq(contacts.workspaceId, workspaceId)),
    db.select({
      entityId: activityLog.entityId,
      count: sql<number>`count(*)::int`,
      lastActivity: sql<Date>`max(${activityLog.createdAt})`,
    })
      .from(activityLog)
      .where(and(eq(activityLog.workspaceId, workspaceId), eq(activityLog.entityType, "contact")))
      .groupBy(activityLog.entityId),
    db.select({
      contactId: deals.contactId,
      wonCount: sql<number>`count(*) filter (where ${deals.status} = 'won')::int`,
      openCount: sql<number>`count(*) filter (where ${deals.status} = 'open')::int`,
    })
      .from(deals)
      .where(eq(deals.workspaceId, workspaceId))
      .groupBy(deals.contactId),
    db.select({
      contactId: invoices.contactId,
      total: sql<string>`coalesce(sum(${invoices.total}::numeric), 0)::text`,
    })
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId))
      .groupBy(invoices.contactId),
  ]);

  // Build lookup maps
  const activityMap = new Map(activityRows.map((r) => [r.entityId, r]));
  const dealMap = new Map(dealRows.map((r) => [r.contactId, r]));
  const invoiceMap = new Map(invoiceRows.map((r) => [r.contactId, r]));

  // Calculate scores in JS
  const updates: Array<{ id: string; score: number }> = [];
  for (const c of contactRows) {
    const ac = activityMap.get(c.id);
    const ds = dealMap.get(c.id);
    const ist = invoiceMap.get(c.id);

    const activityScore = (ac?.count ?? 0) * settings.activityWeight;
    const dealScore = ((ds?.wonCount ?? 0) * 2 + (ds?.openCount ?? 0)) * settings.dealWeight;
    const invoiceScore = Number(ist?.total ?? 0) * settings.invoiceWeight;

    let recencyMultiplier = 1;
    if (ac?.lastActivity) {
      const daysSince = Math.floor((now - new Date(ac.lastActivity).getTime()) / 86_400_000);
      recencyMultiplier = Math.max(0.1, 1 - daysSince / decayDays);
    }

    const rawScore = (activityScore + dealScore + invoiceScore) * recencyMultiplier;
    updates.push({ id: c.id, score: Math.min(maxScore, Math.round(rawScore)) });
  }

  // Batch update using Promise.all (bounded)
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(
      batch.map((u) =>
        db
          .update(contacts)
          .set({ leadScore: u.score, updatedAt: new Date() })
          .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.id, u.id)))
      )
    );
  }

  return updates.length;
}
