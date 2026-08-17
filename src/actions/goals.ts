"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as goalsService from "@/services/goals";

export async function listGoalsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await goalsService.listGoals(workspaceId);
  return { ok: true, data };
}

export async function createGoalAction(input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as goalsService.GoalInput;
  const row = await goalsService.createGoal(workspaceId, data);
  revalidatePath("/goals");
  return { ok: true, data: row };
}

export async function deleteGoalAction(id: string) {
  const { workspaceId } = await requireWorkspace();
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
