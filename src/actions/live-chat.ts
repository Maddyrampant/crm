"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listSessions, getSession, createSession, sendMessage, closeSession, assignSession } from "@/services/live-chat";

export async function listSessionsAction(params?: { page?: number; pageSize?: number; status?: string }) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listSessions(workspaceId, params);
}

export async function getSessionAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return getSession(workspaceId, id);
}

export async function createSessionAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = z.object({ visitorName: z.string().optional(), visitorEmail: z.string().optional(), contactId: z.string().optional() }).parse(raw);
  const row = await createSession(workspaceId, parsed);
  revalidatePath("/live-chat");
  return { ok: true, id: row.id };
}

export async function sendMessageAction(sessionId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = z.object({ role: z.enum(["visitor", "agent"]), content: z.string().min(1) }).parse(raw);
  const row = await sendMessage(workspaceId, sessionId, parsed.role, parsed.content);
  revalidatePath("/live-chat");
  return { ok: true, id: row?.id ?? "" };
}

export async function closeSessionAction(sessionId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await closeSession(workspaceId, sessionId);
  revalidatePath("/live-chat");
  return { ok: Boolean(row) };
}

export async function assignSessionAction(sessionId: string, userId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await assignSession(workspaceId, sessionId, userId);
  revalidatePath("/live-chat");
  return { ok: Boolean(row) };
}
