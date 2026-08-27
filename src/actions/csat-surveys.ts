"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listSurveys, createSurvey, respondToSurvey, getSurveyStats, deleteSurvey } from "@/services/csat-surveys";

export async function listSurveysAction(params?: { page?: number; pageSize?: number; type?: string }) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listSurveys(workspaceId, params);
}

export async function createSurveyAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ contactId: z.string().min(1), dealId: z.string().optional(), type: z.enum(["csat", "nps", "ces"]).optional() }).parse(raw);
  const row = await createSurvey(workspaceId, parsed);
  revalidatePath("/csat");
  return { ok: true, id: row.id };
}

export async function respondToSurveyAction(id: string, score: number, comment?: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await respondToSurvey(workspaceId, id, score, comment);
  revalidatePath("/csat");
  return { ok: Boolean(row) };
}

export async function getSurveyStatsAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return getSurveyStats(workspaceId);
}

export async function deleteSurveyAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteSurvey(workspaceId, id);
  revalidatePath("/csat");
  return { ok: Boolean(row) };
}
