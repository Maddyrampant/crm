"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listCallLogs, createCallLog, updateCallLog, deleteCallLog } from "@/services/call-logs";

export async function listCallLogsAction(params?: { page?: number; pageSize?: number; contactId?: string }) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listCallLogs(workspaceId, params);
}

export async function createCallLogAction(raw: unknown) {
  const { workspaceId, user } = await requireWorkspaceRole("seller");
  const parsed = z.object({ contactId: z.string().optional(), direction: z.string().optional(), duration: z.number().optional(), outcome: z.enum(["connected", "no_answer", "voicemail", "busy", "wrong_number"]), notes: z.string().optional(), phone: z.string().optional() }).parse(raw);
  const row = await createCallLog(workspaceId, { ...parsed, userId: user.id });
  revalidatePath("/call-logs");
  return { ok: true, id: row.id };
}

export async function updateCallLogAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = z.object({ notes: z.string().optional(), outcome: z.enum(["connected", "no_answer", "voicemail", "busy", "wrong_number"]).optional(), duration: z.number().optional() }).parse(raw);
  const row = await updateCallLog(workspaceId, id, parsed);
  revalidatePath("/call-logs");
  return { ok: Boolean(row) };
}

export async function deleteCallLogAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteCallLog(workspaceId, id);
  revalidatePath("/call-logs");
  return { ok: Boolean(row) };
}
