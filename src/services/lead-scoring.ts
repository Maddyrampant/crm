import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, activityLog, invoices, payments } from "@/db/schema";
import { getLeadScoreSettings } from "@/services/lead-score-settings";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export type LeadScoreSettings = {
  activityWeight: number;
  dealWeight: number;
  invoiceWeight: number;
  recencyDecayDays: number;
  maxScore: number;
};

export async function calculateLeadScore(workspaceId: string, contactId: string) {
  const settings = await getLeadScoreSettings(workspaceId);

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

export async function batchScoreContacts(workspaceId: string) {
  const contactRows = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));

  let scored = 0;
  for (const row of contactRows) {
    await calculateLeadScore(workspaceId, row.id);
    scored++;
  }
  return scored;
}
