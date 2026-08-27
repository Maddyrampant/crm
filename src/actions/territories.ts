"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listTerritories, createTerritory, updateTerritory, deleteTerritory } from "@/services/territories";

export async function listTerritoriesAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listTerritories(workspaceId);
}

export async function createTerritoryAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = z.object({ name: z.string().min(1), rules: z.array(z.object({ field: z.string(), operator: z.string(), value: z.string() })).optional(), ownerId: z.string().optional() }).parse(raw);
  const row = await createTerritory(workspaceId, parsed);
  revalidatePath("/territories");
  return { ok: true, id: row.id };
}

export async function updateTerritoryAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = z.object({ name: z.string().optional(), ownerId: z.string().optional() }).parse(raw);
  const row = await updateTerritory(workspaceId, id, parsed);
  revalidatePath("/territories");
  return { ok: Boolean(row) };
}

export async function deleteTerritoryAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const row = await deleteTerritory(workspaceId, id);
  revalidatePath("/territories");
  return { ok: Boolean(row) };
}
