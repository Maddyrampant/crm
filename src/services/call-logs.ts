import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { normalizePage, normalizePageSize, calculateOffset, buildPaginatedResult, type PaginatedResult } from "@/lib/pagination";

export type CallLogRow = typeof callLogs.$inferSelect;

export async function listCallLogs(workspaceId: string, params?: { page?: number; pageSize?: number; contactId?: string }) {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const conditions = [eq(callLogs.workspaceId, workspaceId)];
  if (params?.contactId) conditions.push(eq(callLogs.contactId, params.contactId));
  const where = and(...conditions);
  const [totalRow] = await db.select({ count: count() }).from(callLogs).where(where);
  const items = await db.select().from(callLogs).where(where).orderBy(desc(callLogs.createdAt)).limit(pageSize).offset(calculateOffset(page, pageSize));
  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getCallLog(workspaceId: string, id: string) {
  const [row] = await db.select().from(callLogs).where(and(eq(callLogs.id, id), eq(callLogs.workspaceId, workspaceId))).limit(1);
  return row ?? null;
}

export async function createCallLog(workspaceId: string, input: {
  contactId?: string;
  userId?: string;
  direction?: string;
  duration?: number;
  outcome: "connected" | "no_answer" | "voicemail" | "busy" | "wrong_number";
  notes?: string;
  phone?: string;
  startedAt?: Date;
}) {
  const [row] = await db.insert(callLogs).values({
    workspaceId,
    contactId: input.contactId ?? null,
    userId: input.userId ?? null,
    direction: input.direction ?? "outbound",
    duration: input.duration ?? null,
    outcome: input.outcome,
    notes: input.notes ?? null,
    phone: input.phone ?? null,
    startedAt: input.startedAt ?? new Date(),
  }).returning();
  return row;
}

export async function updateCallLog(workspaceId: string, id: string, input: { notes?: string; outcome?: "connected" | "no_answer" | "voicemail" | "busy" | "wrong_number"; duration?: number }) {
  const [row] = await db.update(callLogs).set(input).where(and(eq(callLogs.id, id), eq(callLogs.workspaceId, workspaceId))).returning();
  return row ?? null;
}

export async function deleteCallLog(workspaceId: string, id: string) {
  const [row] = await db.delete(callLogs).where(and(eq(callLogs.id, id), eq(callLogs.workspaceId, workspaceId))).returning({ id: callLogs.id });
  return row ?? null;
}
