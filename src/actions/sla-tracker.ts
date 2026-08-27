"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listSlaPolicies, createSlaPolicy, updateSlaPolicy, deleteSlaPolicy, getActiveSlaInstances, checkBreachedSlas } from "@/services/sla-tracker";

export async function listSlaPoliciesAction() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  return listSlaPolicies(workspaceId);
}

export async function createSlaPolicyAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = z.object({ name: z.string().min(1), entityType: z.string().optional(), responseTimeHours: z.number().min(1), resolutionTimeHours: z.number().min(1) }).parse(raw);
  const row = await createSlaPolicy(workspaceId, parsed);
  revalidatePath("/sla");
  return { ok: true, id: row.id };
}

export async function deleteSlaPolicyAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const row = await deleteSlaPolicy(workspaceId, id);
  revalidatePath("/sla");
  return { ok: Boolean(row) };
}

export async function getActiveSlaInstancesAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return getActiveSlaInstances(workspaceId);
}

export async function checkBreachedSlasAction() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  return checkBreachedSlas(workspaceId);
}
