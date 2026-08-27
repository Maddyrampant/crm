"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listPlaybooks, createPlaybook, deletePlaybook, getDealChecklist, createDealChecklist, toggleChecklistItem, deleteDealChecklist } from "@/services/sales-playbook";

export async function listPlaybooksAction() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listPlaybooks(workspaceId);
}

export async function createPlaybookAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ name: z.string().min(1), description: z.string().optional(), steps: z.array(z.object({ title: z.string().min(1), description: z.string().optional() })) }).parse(raw);
  const row = await createPlaybook(workspaceId, parsed);
  revalidatePath("/playbook");
  return { ok: true, id: row.id };
}

export async function deletePlaybookAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const row = await deletePlaybook(workspaceId, id);
  revalidatePath("/playbook");
  return { ok: Boolean(row) };
}

export async function getDealChecklistAction(dealId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return getDealChecklist(workspaceId, dealId);
}

export async function applyPlaybookToDealAction(dealId: string, playbookId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const { getPlaybook } = await import("@/services/sales-playbook");
  const playbook = await getPlaybook(workspaceId, playbookId);
  if (!playbook) return { ok: false, error: "لیست پخش یافت نشد" };
  const steps = (playbook.steps as Array<{ title: string }>).map((s, i) => ({ stepTitle: s.title, orderIndex: i }));
  await createDealChecklist(workspaceId, dealId, playbookId, steps);
  revalidatePath("/playbook");
  return { ok: true };
}

export async function toggleChecklistItemAction(id: string, completed: boolean) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  await toggleChecklistItem(workspaceId, id, completed);
  revalidatePath("/playbook");
  return { ok: true };
}

export async function deleteDealChecklistAction(dealId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  await deleteDealChecklist(workspaceId, dealId);
  revalidatePath("/playbook");
  return { ok: true };
}
