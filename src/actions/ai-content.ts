"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  assignContent,
  getContentAssignments,
  markContentViewed,
  unassignContent,
} from "@/services/ai-content";

const contentSchema = z.object({
  type: z.string().optional(),
  title: z.string().min(1, "عنوان الزامی است"),
  description: z.string().optional(),
  url: z.string().url("آدرس نامعتبر است"),
  tags: z.array(z.string()).optional(),
});

const assignSchema = z.object({
  contentId: z.string().min(1),
  contactId: z.string().min(1),
  notes: z.string().optional(),
});

export async function listContentAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  return listContent(workspaceId, params);
}

export async function getContentAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  return getContent(workspaceId, id);
}

export async function createContentAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = contentSchema.parse(raw);
  try {
    const row = await createContent(workspaceId, parsed);
    revalidatePath("/settings/ai-content");
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ایجاد" };
  }
}

export async function updateContentAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = contentSchema.partial().parse(raw);
  try {
    const row = await updateContent(workspaceId, id, parsed);
    revalidatePath("/settings/ai-content");
    return { ok: Boolean(row), error: row ? undefined : "یافت نشد" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در ویرایش" };
  }
}

export async function deleteContentAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteContent(workspaceId, id);
  revalidatePath("/settings/ai-content");
  return { ok: Boolean(row) };
}

export async function assignContentAction(raw: unknown) {
  const { workspaceId, user } = await requireWorkspaceRole("manager");
  const parsed = assignSchema.parse(raw);
  try {
    const row = await assignContent(workspaceId, parsed.contentId, parsed.contactId, user.id, parsed.notes);
    revalidatePath("/settings/ai-content");
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطا در تخصیص" };
  }
}

export async function getContentAssignmentsAction(contactId: string) {
  const { workspaceId } = await requireWorkspace();
  return getContentAssignments(workspaceId, contactId);
}

export async function markContentViewedAction(assignmentId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await markContentViewed(workspaceId, assignmentId);
  return { ok: Boolean(row) };
}

export async function unassignContentAction(assignmentId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await unassignContent(workspaceId, assignmentId);
  revalidatePath("/settings/ai-content");
  return { ok: Boolean(row) };
}
