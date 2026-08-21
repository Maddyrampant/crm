"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import * as customFieldsService from "@/services/custom-fields";

const createFieldSchema = z.object({
  entity: z.enum(["contact", "company", "deal"]),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "number", "date", "select", "multiselect", "boolean"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export async function listFieldsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await customFieldsService.listFields(workspaceId);
  return { ok: true, data };
}

export async function getFieldsForEntityAction(entity: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await customFieldsService.getFieldsForEntity(workspaceId, entity);
  return { ok: true, data };
}

export async function createFieldAction(input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const parsed = createFieldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await customFieldsService.createField(workspaceId, parsed.data);
  revalidatePath("/settings");
  return { ok: true, data: row };
}

export async function deleteFieldAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const row = await customFieldsService.deleteField(workspaceId, id);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getFieldValuesAction(entityId: string, entity: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await customFieldsService.getFieldValues(workspaceId, entityId, entity);
  return { ok: true, data };
}

export async function setFieldValueAction(
  entityId: string,
  entity: string,
  fieldId: string,
  value: string | null
) {
  const { workspaceId } = await requireWorkspace();
  const row = await customFieldsService.setFieldValue(workspaceId, entityId, entity, fieldId, value);
  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true, data: row };
}
