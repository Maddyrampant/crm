"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/lib/session";
import * as leadScoringService from "@/services/lead-scoring";
import * as leadScoreSettingsService from "@/services/lead-score-settings";

const leadScoreSettingsSchema = z.object({
  activityWeight: z.number().min(0).max(100).optional(),
  dealWeight: z.number().min(0).max(100).optional(),
  invoiceWeight: z.number().min(0).max(100).optional(),
  recencyDecayDays: z.number().int().min(1).max(365).optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

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
  const parsed = leadScoreSettingsSchema.safeParse(settings);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const result = await leadScoreSettingsService.updateLeadScoreSettings(workspaceId, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/contacts");
  return { ok: result.ok };
}
