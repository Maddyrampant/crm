import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { salesGoals, deals, user } from "@/db/schema";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export type GoalInput = {
  userId: string;
  period: "monthly" | "quarterly" | "yearly";
  targetAmount: number;
  startDate: string;
  endDate: string;
};

export async function listGoals(workspaceId: string) {
  return db
    .select({ goal: salesGoals, userName: user.name })
    .from(salesGoals)
    .leftJoin(user, eq(user.id, salesGoals.userId))
    .where(eq(salesGoals.workspaceId, workspaceId))
    .orderBy(desc(salesGoals.createdAt));
}

export async function createGoal(workspaceId: string, input: GoalInput) {
  const [row] = await db
    .insert(salesGoals)
    .values({
      workspaceId,
      userId: input.userId,
      period: input.period,
      targetAmount: String(input.targetAmount),
      startDate: input.startDate,
      endDate: input.endDate,
    })
    .returning();
  return row;
}

export async function deleteGoal(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(salesGoals)
    .where(and(eq(salesGoals.workspaceId, workspaceId), eq(salesGoals.id, id)))
    .returning({ id: salesGoals.id });
  return deleted ?? null;
}

export async function getGoalProgress(workspaceId: string, goalId: string) {
  const [row] = await db
    .select()
    .from(salesGoals)
    .where(and(eq(salesGoals.workspaceId, workspaceId), eq(salesGoals.id, goalId)))
    .limit(1);
  if (!row) return null;

  const [wonStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      value: sql<string>`coalesce(sum(${deals.amount}::numeric), 0)::text`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        eq(deals.ownerId, row.userId),
        eq(deals.status, "won"),
        gte(deals.wonAt, new Date(row.startDate)),
        lte(deals.wonAt, new Date(row.endDate))
      )
    );

  const target = num(row.targetAmount);
  const achieved = num(wonStats?.value);
  const percentage = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

  return {
    ...row,
    targetAmount: target,
    achieved,
    count: wonStats?.count ?? 0,
    percentage,
  };
}

export async function listGoalsWithProgress(workspaceId: string) {
  const goals = await listGoals(workspaceId);
  const results = [];
  for (const g of goals) {
    const progress = await getGoalProgress(workspaceId, g.goal.id);
    results.push({ ...g, progress });
  }
  return results;
}
