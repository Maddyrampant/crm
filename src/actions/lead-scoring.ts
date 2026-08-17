"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as leadScoringService from "@/services/lead-scoring";

export async function calculateLeadScoreAction(contactId: string) {
  const { workspaceId } = await requireWorkspace();
  const score = await leadScoringService.calculateLeadScore(workspaceId, contactId);
  revalidatePath("/contacts");
  return { ok: true, data: { score } };
}

export async function batchScoreContactsAction() {
  const { workspaceId } = await requireWorkspace();
  const scored = await leadScoringService.batchScoreContacts(workspaceId);
  revalidatePath("/contacts");
  return { ok: true, data: { scored } };
}

export async function getLeadScoreSettingsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await leadScoringService.getLeadScoreSettings(workspaceId);
  return { ok: true, data };
}

export async function updateLeadScoreSettingsAction(settings: unknown) {
  const { workspaceId } = await requireWorkspace();
  const result = await leadScoringService.updateLeadScoreSettings(
    workspaceId,
    settings as Partial<leadScoringService.LeadScoreSettings>
  );
  revalidatePath("/settings");
  return { ok: result.ok };
}
