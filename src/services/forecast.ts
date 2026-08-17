import "server-only";

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, deals, stages, contacts } from "@/db/schema";

export type ForecastRow = {
  stageId: string;
  stageName: string;
  winProbability: number;
  dealCount: number;
  totalAmount: number;
  weightedAmount: number;
};

export type WinPrediction = {
  dealId: string;
  title: string;
  amount: number;
  stageName: string;
  winProbability: number;
  daysInStage: number;
  prediction: "high" | "medium" | "low";
  confidence: number;
};

export type BestTimeSlot = {
  hour: number;
  label: string;
  count: number;
};

export type StalledDeal = {
  dealId: string;
  title: string;
  amount: number;
  stageName: string;
  daysSinceUpdate: number;
};

/** پیش‌بینی وزنی فروش — مجموع مبالغ وزن‌دار بر اساس احتمال برد مرحله */
export async function getForecast(workspaceId: string): Promise<ForecastRow[]> {
  const rows = await db
    .select({
      stageId: stages.id,
      stageName: stages.name,
      winProbability: sql<number>`cast(${stages.winProbability} as numeric)`,
      dealCount: sql<number>`count(${deals.id})::int`,
      totalAmount: sql<number>`coalesce(sum(${deals.amount}::numeric), 0)::numeric`,
    })
    .from(deals)
    .innerJoin(stages, eq(stages.id, deals.stageId))
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "open")))
    .groupBy(stages.id, stages.name, stages.winProbability)
    .orderBy(asc(stages.orderIndex));

  return rows.map((r) => ({
    stageId: r.stageId,
    stageName: r.stageName,
    winProbability: Number(r.winProbability),
    dealCount: r.dealCount,
    totalAmount: Number(r.totalAmount),
    weightedAmount: Math.round((Number(r.totalAmount) * Number(r.winProbability)) / 100),
  }));
}

/** پیش‌بینی برد یک فرصت خاص */
export async function getWinPrediction(
  workspaceId: string,
  dealId: string
): Promise<WinPrediction | null> {
  const [row] = await db
    .select({
      dealId: deals.id,
      title: deals.title,
      amount: deals.amount,
      stageName: stages.name,
      winProbability: sql<number>`cast(${stages.winProbability} as numeric)`,
      updatedAt: deals.updatedAt,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .innerJoin(stages, eq(stages.id, deals.stageId))
    .where(and(eq(deals.workspaceId, workspaceId), eq(deals.id, dealId)))
    .limit(1);

  if (!row) return null;

  const now = Date.now();
  const daysInStage = Math.floor(
    (now - new Date(row.updatedAt).getTime()) / 86_400_000
  );
  const prob = Number(row.winProbability);

  let prediction: "high" | "medium" | "low";
  let confidence: number;
  if (prob >= 60 && daysInStage <= 14) {
    prediction = "high";
    confidence = Math.min(95, prob + 10);
  } else if (prob >= 35 && daysInStage <= 30) {
    prediction = "medium";
    confidence = prob;
  } else {
    prediction = "low";
    confidence = Math.max(10, prob - 10);
  }

  return {
    dealId: row.dealId,
    title: row.title,
    amount: Number(row.amount),
    stageName: row.stageName,
    winProbability: prob,
    daysInStage,
    prediction,
    confidence,
  };
}

/** بهترین زمان تماس — بر اساس الگوی فعالیت مشتری */
export async function getBestTimeToContact(
  workspaceId: string,
  contactId: string
): Promise<BestTimeSlot[]> {
  const logs = await db
    .select({ createdAt: activityLog.createdAt })
    .from(activityLog)
    .where(
      and(
        eq(activityLog.workspaceId, workspaceId),
        eq(activityLog.entityType, "contact"),
        eq(activityLog.entityId, contactId)
      )
    )
    .orderBy(asc(activityLog.createdAt));

  const hourCounts = new Map<number, number>();
  for (const log of logs) {
    const hour = new Date(log.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  const sorted = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sorted.map(([hour, count]) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    count,
  }));
}

/** فرصتهای متوقف‌شده — دیلهایی که مدتی در یک مرحله مانده‌اند */
export async function getStalledDeals(
  workspaceId: string,
  daysThreshold = 14
): Promise<StalledDeal[]> {
  const threshold = new Date(Date.now() - daysThreshold * 86_400_000);

  const rows = await db
    .select({
      dealId: deals.id,
      title: deals.title,
      amount: deals.amount,
      stageName: stages.name,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .innerJoin(stages, eq(stages.id, deals.stageId))
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        eq(deals.status, "open"),
        lte(deals.updatedAt, threshold)
      )
    )
    .orderBy(asc(deals.updatedAt));

  return rows.map((r) => ({
    dealId: r.dealId,
    title: r.title,
    amount: Number(r.amount),
    stageName: r.stageName,
    daysSinceUpdate: Math.floor(
      (Date.now() - new Date(r.updatedAt).getTime()) / 86_400_000
    ),
  }));
}
