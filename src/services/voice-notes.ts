import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { voiceNotes } from "@/db/schema";
import { logAudit } from "@/services/audit";

export type VoiceNoteRow = typeof voiceNotes.$inferSelect;

export async function listAllVoiceNotes(workspaceId: string) {
  return db.select().from(voiceNotes).where(eq(voiceNotes.workspaceId, workspaceId)).orderBy(voiceNotes.createdAt);
}

export async function listVoiceNotes(workspaceId: string, entityType: string, entityId: string) {
  return db.select().from(voiceNotes).where(and(eq(voiceNotes.workspaceId, workspaceId), eq(voiceNotes.entityType, entityType), eq(voiceNotes.entityId, entityId))).orderBy(voiceNotes.createdAt);
}

export async function createVoiceNote(workspaceId: string, input: { entityType: string; entityId: string; userId?: string; transcription?: string; audioUrl?: string; duration?: number }) {
  const [row] = await db.insert(voiceNotes).values({ workspaceId, entityType: input.entityType, entityId: input.entityId, userId: input.userId ?? null, transcription: input.transcription ?? null, audioUrl: input.audioUrl ?? null, duration: input.duration ?? null }).returning();
  void logAudit(workspaceId, null, "create", "voice_note", row.id).catch(() => {});
  return row;
}

export async function deleteVoiceNote(workspaceId: string, id: string) {
  const [row] = await db.delete(voiceNotes).where(and(eq(voiceNotes.id, id), eq(voiceNotes.workspaceId, workspaceId))).returning({ id: voiceNotes.id });
  if (row) void logAudit(workspaceId, null, "delete", "voice_note", id).catch(() => {});
  return row ?? null;
}
