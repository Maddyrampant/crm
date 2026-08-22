"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import * as goalsService from "@/services/goals";

const goalSchema = z.object({
  userId: z.string().min(1),
  period: z.enum(["monthly", "quarterly", "yearly"]),
  targetAmount: z.number().positive(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function listGoalsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await goalsService.listGoals(workspaceId);
  return { ok: true, data };
}

export async function createGoalAction(input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await goalsService.createGoal(workspaceId, parsed.data);
  revalidatePath("/goals");
  return { ok: true, data: row };
}

export async function deleteGoalAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await goalsService.deleteGoal(workspaceId, id);
  revalidatePath("/goals");
  return { ok: Boolean(row) };
}

export async function getGoalProgressAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await goalsService.getGoalProgress(workspaceId, id);
  if (!data) return { ok: false, error: "هدف یافت نشد" };
  return { ok: true, data };
}
