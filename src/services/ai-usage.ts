import "server-only";

import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { aiMessages, aiConversations } from "@/db/schema";

export async function getUsageStats(workspaceId: string) {
  const [stats] = await db
    .select({
      totalConversations: sql<number>`count(distinct ${aiConversations.id})::int`,
      totalMessages: sql<number>`count(${aiMessages.id})::int`,
      totalInputTokens: sql<number>`coalesce(sum((${aiMessages.usage}->>'inputTokens')::int), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum((${aiMessages.usage}->>'outputTokens')::int), 0)::int`,
      totalTokens: sql<number>`coalesce(sum((${aiMessages.usage}->>'totalTokens')::int), 0)::int`,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
    .where(eq(aiConversations.workspaceId, workspaceId));

  return stats ?? {
    totalConversations: 0,
    totalMessages: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
  };
}

export async function getUsageByDay(workspaceId: string, days = 30) {
  const rows = await db
    .select({
      date: sql<string>`to_char(${aiMessages.createdAt}::date, 'YYYY-MM-DD')`,
      messages: sql<number>`count(${aiMessages.id})::int`,
      tokens: sql<number>`coalesce(sum((${aiMessages.usage}->>'totalTokens')::int), 0)::int`,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
    .where(
      and(
        eq(aiConversations.workspaceId, workspaceId),
        sql`${aiMessages.createdAt} >= now() - interval '${sql.raw(String(days))} days'`
      )
    )
    .groupBy(sql`${aiMessages.createdAt}::date`)
    .orderBy(desc(sql`${aiMessages.createdAt}::date`));

  return rows;
}

export async function getUsageByModel(workspaceId: string) {
  const rows = await db
    .select({
      model: aiConversations.model,
      conversations: sql<number>`count(distinct ${aiConversations.id})::int`,
      messages: sql<number>`count(${aiMessages.id})::int`,
      tokens: sql<number>`coalesce(sum((${aiMessages.usage}->>'totalTokens')::int), 0)::int`,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
    .where(eq(aiConversations.workspaceId, workspaceId))
    .groupBy(aiConversations.model)
    .orderBy(desc(sql`count(${aiMessages.id})`));

  return rows;
}
