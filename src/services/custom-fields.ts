import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefs, customFieldVals } from "@/db/schema";

export type CustomFieldDefInput = {
  entity: "contact" | "company" | "deal";
  name: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "boolean";
  options?: string[];
  required?: boolean;
  orderIndex?: number;
};

export type CustomFieldDef = {
  id: string;
  workspaceId: string;
  entity: "contact" | "company" | "deal";
  name: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "boolean";
  options: string[] | null;
  required: boolean;
  orderIndex: number;
  createdAt: Date;
};

export async function listFields(workspaceId: string) {
  return db
    .select()
    .from(customFieldDefs)
    .where(eq(customFieldDefs.workspaceId, workspaceId))
    .orderBy(customFieldDefs.orderIndex);
}

export async function getFieldsForEntity(workspaceId: string, entity: string) {
  return db
    .select()
    .from(customFieldDefs)
    .where(and(eq(customFieldDefs.workspaceId, workspaceId), eq(customFieldDefs.entity, entity as "contact" | "company" | "deal")))
    .orderBy(customFieldDefs.orderIndex);
}

export async function createField(workspaceId: string, input: CustomFieldDefInput) {
  const [row] = await db
    .insert(customFieldDefs)
    .values({
      workspaceId,
      entity: input.entity,
      name: input.name,
      type: input.type,
      options: input.options ?? null,
      required: input.required ?? false,
      orderIndex: input.orderIndex ?? 0,
    })
    .returning();
  return row;
}

export async function deleteField(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(customFieldDefs)
    .where(and(eq(customFieldDefs.workspaceId, workspaceId), eq(customFieldDefs.id, id)))
    .returning({ id: customFieldDefs.id });
  return deleted ?? null;
}

export async function getFieldValues(workspaceId: string, entityId: string, entity: string) {
  const rows = await db
    .select()
    .from(customFieldVals)
    .where(
      and(
        eq(customFieldVals.workspaceId, workspaceId),
        eq(customFieldVals.entityId, entityId),
        eq(customFieldVals.entity, entity as "contact" | "company" | "deal")
      )
    );
  const map: Record<string, string | null> = {};
  for (const row of rows) {
    map[row.fieldId] = row.value;
  }
  return map;
}

export async function setFieldValue(
  workspaceId: string,
  entityId: string,
  entity: string,
  fieldId: string,
  value: string | null
) {
  const [existing] = await db
    .select({ id: customFieldVals.id })
    .from(customFieldVals)
    .where(
      and(
        eq(customFieldVals.workspaceId, workspaceId),
        eq(customFieldVals.entityId, entityId),
        eq(customFieldVals.entity, entity as "contact" | "company" | "deal"),
        eq(customFieldVals.fieldId, fieldId)
      )
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(customFieldVals)
      .set({ value })
      .where(eq(customFieldVals.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(customFieldVals)
    .values({
      workspaceId,
      entityId,
      entity: entity as "contact" | "company" | "deal",
      fieldId,
      value,
    })
    .returning();
  return row;
}
