"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listSequences, createSequence, updateSequence, deleteSequence, addSequenceStep, deleteSequenceStep, enrollContact, unenrollContact } from "@/services/email-sequences";

const sequenceSchema = z.object({ name: z.string().min(1), subject: z.string().min(1), body: z.string().min(1) });

export async function listSequencesAction(params?: { page?: number; pageSize?: number }) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listSequences(workspaceId, params);
}

export async function createSequenceAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = sequenceSchema.parse(raw);
  try {
    const row = await createSequence(workspaceId, parsed);
    revalidatePath("/email-sequences");
    return { ok: true, id: row.id };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : "خطا" }; }
}

export async function updateSequenceAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ name: z.string().optional(), subject: z.string().optional(), body: z.string().optional(), status: z.enum(["draft", "active", "paused", "completed"]).optional() }).parse(raw);
  const row = await updateSequence(workspaceId, id, parsed);
  revalidatePath("/email-sequences");
  return { ok: Boolean(row) };
}

export async function deleteSequenceAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteSequence(workspaceId, id);
  revalidatePath("/email-sequences");
  return { ok: Boolean(row) };
}

export async function addSequenceStepAction(sequenceId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ delayDays: z.number().min(0), subject: z.string().min(1), body: z.string().min(1) }).parse(raw);
  const row = await addSequenceStep(workspaceId, sequenceId, parsed);
  revalidatePath("/email-sequences");
  return { ok: Boolean(row) };
}

export async function deleteSequenceStepAction(sequenceId: string, stepId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  await deleteSequenceStep(workspaceId, stepId);
  revalidatePath("/email-sequences");
  return { ok: true };
}

export async function enrollContactAction(sequenceId: string, contactId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await enrollContact(workspaceId, sequenceId, contactId);
  revalidatePath("/email-sequences");
  return { ok: Boolean(row) };
}

export async function unenrollContactAction(sequenceId: string, contactId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  await unenrollContact(workspaceId, sequenceId, contactId);
  revalidatePath("/email-sequences");
  return { ok: true };
}
