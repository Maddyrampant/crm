"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import * as leadScoringService from "@/services/lead-scoring";

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
  const { workspaceId } = await requireWorkspaceRole("manager");
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
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = leadScoreSettingsSchema.safeParse(settings);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const result = await leadScoringService.updateLeadScoreSettings(workspaceId, parsed.data);
  revalidatePath("/settings");
  return { ok: result.ok };
}
