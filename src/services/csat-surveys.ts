import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { csatSurveys } from "@/db/schema";
import { normalizePage, normalizePageSize, calculateOffset, buildPaginatedResult, type PaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/services/audit";


export async function listSurveys(workspaceId: string, params?: { page?: number; pageSize?: number; type?: string }) {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const conditions = [eq(csatSurveys.workspaceId, workspaceId)];
  if (params?.type) conditions.push(eq(csatSurveys.type, params.type as "csat" | "nps" | "ces"));
  const where = and(...conditions);
  const [totalRow] = await db.select({ count: count() }).from(csatSurveys).where(where);
  const items = await db.select().from(csatSurveys).where(where).orderBy(desc(csatSurveys.createdAt)).limit(pageSize).offset(calculateOffset(page, pageSize));
  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function createSurvey(workspaceId: string, input: { contactId: string; dealId?: string; type?: "csat" | "nps" | "ces" }) {
  const [row] = await db.insert(csatSurveys).values({
    workspaceId,
    contactId: input.contactId,
    dealId: input.dealId ?? null,
    type: input.type ?? "csat",
    status: "pending",
  }).returning();
  void logAudit(workspaceId, null, "create", "csat_survey", row.id).catch(() => {});
  return row;
}

export async function respondToSurvey(workspaceId: string, id: string, score: number, comment?: string) {
  const [row] = await db.update(csatSurveys).set({ score, comment: comment ?? null, status: "completed", respondedAt: new Date() }).where(and(eq(csatSurveys.id, id), eq(csatSurveys.workspaceId, workspaceId))).returning();
  if (row) void logAudit(workspaceId, null, "respond", "csat_survey", id).catch(() => {});
  return row ?? null;
}

export async function getSurveyStats(workspaceId: string) {
  const [csatAvg] = await db.select({ avg: sql<number>`coalesce(avg(${csatSurveys.score}), 0)::int` }).from(csatSurveys).where(and(eq(csatSurveys.workspaceId, workspaceId), eq(csatSurveys.type, "csat"), eq(csatSurveys.status, "completed")));
  const [npsAvg] = await db.select({ avg: sql<number>`coalesce(avg(${csatSurveys.score}), 0)::int` }).from(csatSurveys).where(and(eq(csatSurveys.workspaceId, workspaceId), eq(csatSurveys.type, "nps"), eq(csatSurveys.status, "completed")));
  const [totalSent] = await db.select({ count: count() }).from(csatSurveys).where(eq(csatSurveys.workspaceId, workspaceId));
  const [totalCompleted] = await db.select({ count: count() }).from(csatSurveys).where(and(eq(csatSurveys.workspaceId, workspaceId), eq(csatSurveys.status, "completed")));
  return { csatAvg: csatAvg?.avg ?? 0, npsAvg: npsAvg?.avg ?? 0, totalSent: totalSent?.count ?? 0, totalCompleted: totalCompleted?.count ?? 0, responseRate: totalSent?.count ? Math.round(((totalCompleted?.count ?? 0) / totalSent.count) * 100) : 0 };
}

export async function deleteSurvey(workspaceId: string, id: string) {
  const [row] = await db.delete(csatSurveys).where(and(eq(csatSurveys.id, id), eq(csatSurveys.workspaceId, workspaceId))).returning({ id: csatSurveys.id });
  return row ?? null;
}
