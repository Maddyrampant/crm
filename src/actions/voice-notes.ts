"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listVoiceNotes, listAllVoiceNotes, createVoiceNote, deleteVoiceNote } from "@/services/voice-notes";

export async function listAllVoiceNotesAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listAllVoiceNotes(workspaceId);
}

export async function listVoiceNotesAction(entityType: string, entityId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listVoiceNotes(workspaceId, entityType, entityId);
}

export async function createVoiceNoteAction(raw: unknown) {
  const { workspaceId, user } = await requireWorkspaceRole("seller");
  const parsed = z.object({ entityType: z.string().min(1), entityId: z.string().min(1), transcription: z.string().optional(), audioUrl: z.string().optional(), duration: z.number().optional() }).parse(raw);
  const row = await createVoiceNote(workspaceId, { ...parsed, userId: user.id });
  revalidatePath("/voice-notes");
  return { ok: true, id: row.id };
}

export async function deleteVoiceNoteAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteVoiceNote(workspaceId, id);
  revalidatePath("/voice-notes");
  return { ok: Boolean(row) };
}
