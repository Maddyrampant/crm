"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as customFieldsService from "@/services/custom-fields";

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
  const { workspaceId } = await requireWorkspace();
  const data = input as customFieldsService.CustomFieldDefInput;
  const row = await customFieldsService.createField(workspaceId, data);
  revalidatePath("/settings");
  return { ok: true, data: row };
}

export async function deleteFieldAction(id: string) {
  const { workspaceId } = await requireWorkspace();
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
