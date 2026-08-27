import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { slaPolicies, slaInstances } from "@/db/schema";
import { logAudit } from "@/services/audit";

export type SlaPolicyRow = typeof slaPolicies.$inferSelect;
export type SlaInstanceRow = typeof slaInstances.$inferSelect;

export async function listSlaPolicies(workspaceId: string) {
  return db.select().from(slaPolicies).where(eq(slaPolicies.workspaceId, workspaceId)).orderBy(slaPolicies.createdAt);
}

export async function createSlaPolicy(workspaceId: string, input: { name: string; entityType?: string; responseTimeHours: number; resolutionTimeHours: number }) {
  const [row] = await db.insert(slaPolicies).values({ workspaceId, name: input.name, entityType: input.entityType ?? "deal", responseTimeHours: input.responseTimeHours, resolutionTimeHours: input.resolutionTimeHours }).returning();
  void logAudit(workspaceId, null, "create", "sla_policy", row.id).catch(() => {});
  return row;
}

export async function updateSlaPolicy(workspaceId: string, id: string, input: Partial<{ name: string; responseTimeHours: number; resolutionTimeHours: number }>) {
  const [row] = await db.update(slaPolicies).set(input).where(and(eq(slaPolicies.id, id), eq(slaPolicies.workspaceId, workspaceId))).returning();
  return row ?? null;
}

export async function deleteSlaPolicy(workspaceId: string, id: string) {
  const [row] = await db.delete(slaPolicies).where(and(eq(slaPolicies.id, id), eq(slaPolicies.workspaceId, workspaceId))).returning({ id: slaPolicies.id });
  if (row) void logAudit(workspaceId, null, "delete", "sla_policy", id).catch(() => {});
  return row ?? null;
}

export async function createSlaInstance(workspaceId: string, policyId: string, entityType: string, entityId: string) {
  const policy = await db.select().from(slaPolicies).where(eq(slaPolicies.id, policyId)).limit(1);
  if (!policy[0]) return null;
  const now = new Date();
  const [row] = await db.insert(slaInstances).values({
    workspaceId,
    policyId,
    entityType,
    entityId,
    status: "active",
    responseDeadline: new Date(now.getTime() + policy[0].responseTimeHours * 3600000),
    resolutionDeadline: new Date(now.getTime() + policy[0].resolutionTimeHours * 3600000),
  }).returning();
  return row;
}

export async function getActiveSlaInstances(workspaceId: string) {
  return db.select().from(slaInstances).where(and(eq(slaInstances.workspaceId, workspaceId), eq(slaInstances.status, "active"))).orderBy(slaInstances.responseDeadline);
}

export async function resolveSlaInstance(id: string) {
  const [row] = await db.update(slaInstances).set({ resolvedAt: new Date(), status: "met", updatedAt: new Date() }).where(eq(slaInstances.id, id)).returning();
  return row ?? null;
}

export async function checkBreachedSlas(workspaceId: string) {
  const now = new Date();
  const breached = await db.select().from(slaInstances).where(and(eq(slaInstances.workspaceId, workspaceId), eq(slaInstances.status, "active"), sql`${slaInstances.responseDeadline} < ${now}`));
  if (breached.length > 0) {
    await db.update(slaInstances).set({ status: "breached", updatedAt: new Date() }).where(sql`${slaInstances.id} IN ${breached.map(b => b.id)}`);
  }
  return breached;
}
