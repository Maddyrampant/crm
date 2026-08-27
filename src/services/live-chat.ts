import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveChatSessions, liveChatMessages } from "@/db/schema";
import { normalizePage, normalizePageSize, calculateOffset, buildPaginatedResult, type PaginatedResult } from "@/lib/pagination";
import { logActivity } from "@/services/activity";
import { logAudit } from "@/services/audit";

export type LiveChatSessionRow = typeof liveChatSessions.$inferSelect;
export type LiveChatMessageRow = typeof liveChatMessages.$inferSelect;

export async function listSessions(workspaceId: string, params?: { page?: number; pageSize?: number; status?: string }) {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const conditions = [eq(liveChatSessions.workspaceId, workspaceId)];
  if (params?.status) conditions.push(eq(liveChatSessions.status, params.status));
  const where = and(...conditions);
  const [totalRow] = await db.select({ count: count() }).from(liveChatSessions).where(where);
  const items = await db.select().from(liveChatSessions).where(where).orderBy(desc(liveChatSessions.createdAt)).limit(pageSize).offset(calculateOffset(page, pageSize));
  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getSession(workspaceId: string, id: string) {
  const [row] = await db.select().from(liveChatSessions).where(and(eq(liveChatSessions.id, id), eq(liveChatSessions.workspaceId, workspaceId))).limit(1);
  if (!row) return null;
  const messages = await db.select().from(liveChatMessages).where(eq(liveChatMessages.sessionId, id)).orderBy(liveChatMessages.createdAt);
  return { session: row, messages };
}

export async function createSession(workspaceId: string, input: { visitorName?: string; visitorEmail?: string; contactId?: string }) {
  const [row] = await db.insert(liveChatSessions).values({ workspaceId, visitorName: input.visitorName ?? null, visitorEmail: input.visitorEmail ?? null, contactId: input.contactId ?? null }).returning();
  if (input.contactId) void logActivity({ workspaceId, entityType: "contact", entityId: input.contactId, action: "chat_started", data: { sessionId: row.id } }).catch(() => {});
  void logAudit(workspaceId, null, "create", "live_chat_session", row.id).catch(() => {});
  return row;
}

export async function sendMessage(workspaceId: string, sessionId: string, role: "visitor" | "agent", content: string) {
  const [session] = await db.select().from(liveChatSessions).where(and(eq(liveChatSessions.id, sessionId), eq(liveChatSessions.workspaceId, workspaceId))).limit(1);
  if (!session) return null;
  const [row] = await db.insert(liveChatMessages).values({ sessionId, role, content }).returning();
  if (session.contactId) void logActivity({ workspaceId, entityType: "contact", entityId: session.contactId, action: "chat_message", data: { role, sessionId } }).catch(() => {});
  return row;
}

export async function closeSession(workspaceId: string, sessionId: string) {
  const [row] = await db.update(liveChatSessions).set({ status: "closed", endedAt: new Date() }).where(and(eq(liveChatSessions.id, sessionId), eq(liveChatSessions.workspaceId, workspaceId))).returning();
  if (row) void logAudit(workspaceId, null, "close", "live_chat_session", sessionId).catch(() => {});
  return row ?? null;
}

export async function assignSession(workspaceId: string, sessionId: string, userId: string) {
  const [row] = await db.update(liveChatSessions).set({ assignedTo: userId }).where(and(eq(liveChatSessions.id, sessionId), eq(liveChatSessions.workspaceId, workspaceId))).returning();
  return row ?? null;
}
