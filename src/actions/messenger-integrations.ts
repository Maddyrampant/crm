"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listIntegrations, createIntegration, updateIntegration, deleteIntegration } from "@/services/messenger-integrations";

export async function listIntegrationsAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listIntegrations(workspaceId);
}

export async function createIntegrationAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = z.object({ channel: z.enum(["whatsapp", "telegram", "instagram", "other"]), name: z.string().min(1), config: z.record(z.string(), z.unknown()).optional() }).parse(raw);
  const row = await createIntegration(workspaceId, parsed);
  revalidatePath("/messenger");
  return { ok: true, id: row.id };
}

export async function updateIntegrationAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = z.object({ name: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }).parse(raw);
  const row = await updateIntegration(workspaceId, id, parsed);
  revalidatePath("/messenger");
  return { ok: Boolean(row) };
}

export async function deleteIntegrationAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const row = await deleteIntegration(workspaceId, id);
  revalidatePath("/messenger");
  return { ok: Boolean(row) };
}
