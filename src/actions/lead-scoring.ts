"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as leadScoringService from "@/services/lead-scoring";
import * as leadScoreSettingsService from "@/services/lead-score-settings";

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
  const data = await leadScoreSettingsService.getLeadScoreSettings(workspaceId);
  return { ok: true, data };
}

export async function updateLeadScoreSettingsAction(settings: leadScoreSettingsService.LeadScoreSettingsInput) {
  const { workspaceId } = await requireWorkspace();
  const result = await leadScoreSettingsService.updateLeadScoreSettings(workspaceId, settings);
  revalidatePath("/settings");
  revalidatePath("/contacts");
  return { ok: result.ok };
}
