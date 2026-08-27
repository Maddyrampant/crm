import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { territories } from "@/db/schema";
import { logAudit } from "@/services/audit";

export type TerritoryRow = typeof territories.$inferSelect;

export async function listTerritories(workspaceId: string) {
  return db.select().from(territories).where(eq(territories.workspaceId, workspaceId)).orderBy(desc(territories.createdAt));
}

export async function getTerritory(workspaceId: string, id: string) {
  const [row] = await db.select().from(territories).where(and(eq(territories.id, id), eq(territories.workspaceId, workspaceId))).limit(1);
  return row ?? null;
}

export async function createTerritory(workspaceId: string, input: { name: string; rules?: Array<{ field: string; operator: string; value: string }>; ownerId?: string }) {
  const [row] = await db.insert(territories).values({ workspaceId, name: input.name, rules: input.rules ?? [], ownerId: input.ownerId ?? null }).returning();
  void logAudit(workspaceId, null, "create", "territory", row.id).catch(() => {});
  return row;
}

export async function updateTerritory(workspaceId: string, id: string, input: Partial<{ name: string; rules: Array<{ field: string; operator: string; value: string }>; ownerId: string }>) {
  const [row] = await db.update(territories).set({ ...input, updatedAt: new Date() }).where(and(eq(territories.id, id), eq(territories.workspaceId, workspaceId))).returning();
  if (row) void logAudit(workspaceId, null, "update", "territory", id).catch(() => {});
  return row ?? null;
}

export async function deleteTerritory(workspaceId: string, id: string) {
  const [row] = await db.delete(territories).where(and(eq(territories.id, id), eq(territories.workspaceId, workspaceId))).returning({ id: territories.id });
  if (row) void logAudit(workspaceId, null, "delete", "territory", id).catch(() => {});
  return row ?? null;
}
