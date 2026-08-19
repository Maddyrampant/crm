"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  listKnowledge,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
} from "@/services/ai-knowledge";

const knowledgeSchema = z.object({
  category: z.string().optional(),
  title: z.string().min(1, "عنوان الزامی است"),
  content: z.string().min(1, "محتوا الزامی است"),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function listKnowledgeAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  return listKnowledge(workspaceId, params);
}

export async function getKnowledgeAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  return getKnowledge(workspaceId, id);
}

export async function createKnowledgeAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = knowledgeSchema.parse(raw);
  try {
    const row = await createKnowledge(workspaceId, parsed);
    revalidatePath("/settings/ai-knowledge");
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ایجاد" };
  }
}

export async function updateKnowledgeAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = knowledgeSchema.partial().parse(raw);
  try {
    const row = await updateKnowledge(workspaceId, id, parsed);
    revalidatePath("/settings/ai-knowledge");
    return { ok: Boolean(row), error: row ? undefined : "یافت نشد" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ویرایش" };
  }
}

export async function toggleKnowledgeAction(id: string, active: boolean) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateKnowledge(workspaceId, id, { active });
  revalidatePath("/settings/ai-knowledge");
  return { ok: Boolean(row) };
}

export async function deleteKnowledgeAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteKnowledge(workspaceId, id);
  revalidatePath("/settings/ai-knowledge");
  return { ok: Boolean(row) };
}
