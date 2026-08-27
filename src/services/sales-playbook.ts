import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { salesPlaybook, dealChecklists } from "@/db/schema";
import { logActivity } from "@/services/activity";
import { logAudit } from "@/services/audit";

export type SalesPlaybookRow = typeof salesPlaybook.$inferSelect;
export type DealChecklistRow = typeof dealChecklists.$inferSelect;

export async function listPlaybooks(workspaceId: string) {
  return db.select().from(salesPlaybook).where(eq(salesPlaybook.workspaceId, workspaceId)).orderBy(desc(salesPlaybook.createdAt));
}

export async function getPlaybook(workspaceId: string, id: string) {
  const [row] = await db.select().from(salesPlaybook).where(and(eq(salesPlaybook.id, id), eq(salesPlaybook.workspaceId, workspaceId))).limit(1);
  return row ?? null;
}

export async function createPlaybook(workspaceId: string, input: { name: string; description?: string; steps: Array<{ title: string; description?: string }> }) {
  const [row] = await db.insert(salesPlaybook).values({
    workspaceId,
    name: input.name,
    description: input.description ?? null,
    steps: input.steps.map((s, i) => ({ ...s, orderIndex: i })),
  }).returning();
  void logAudit(workspaceId, null, "create", "sales_playbook", row.id).catch(() => {});
  return row;
}

export async function updatePlaybook(workspaceId: string, id: string, input: Partial<{ name: string; description: string; steps: Array<{ title: string; description?: string; orderIndex: number }> }>) {
  const [row] = await db.update(salesPlaybook).set({ ...input, updatedAt: new Date() }).where(and(eq(salesPlaybook.id, id), eq(salesPlaybook.workspaceId, workspaceId))).returning();
  return row ?? null;
}

export async function deletePlaybook(workspaceId: string, id: string) {
  const [row] = await db.delete(salesPlaybook).where(and(eq(salesPlaybook.id, id), eq(salesPlaybook.workspaceId, workspaceId))).returning({ id: salesPlaybook.id });
  if (row) void logAudit(workspaceId, null, "delete", "sales_playbook", id).catch(() => {});
  return row ?? null;
}

export async function getDealChecklist(workspaceId: string, dealId: string) {
  return db.select().from(dealChecklists).where(and(eq(dealChecklists.dealId, dealId), eq(dealChecklists.workspaceId, workspaceId))).orderBy(dealChecklists.orderIndex);
}

export async function createDealChecklist(workspaceId: string, dealId: string, playbookId: string | null, steps: Array<{ stepTitle: string; orderIndex: number }>) {
  const rows = await db.insert(dealChecklists).values(steps.map(s => ({ workspaceId, dealId, playbookId, stepTitle: s.stepTitle, orderIndex: s.orderIndex }))).returning();
  void logActivity({ workspaceId, entityType: "deal", entityId: dealId, action: "checklist_created", data: { count: rows.length } }).catch(() => {});
  return rows;
}

export async function toggleChecklistItem(workspaceId: string, id: string, completed: boolean) {
  const current = await db.select().from(dealChecklists).where(and(eq(dealChecklists.id, id), eq(dealChecklists.workspaceId, workspaceId))).limit(1);
  const [row] = await db.update(dealChecklists).set({ completed, completedAt: completed ? new Date() : null }).where(and(eq(dealChecklists.id, id), eq(dealChecklists.workspaceId, workspaceId))).returning();
  if (row && current[0]) void logActivity({ workspaceId, entityType: "deal", entityId: current[0].dealId, action: "checklist_toggled", data: { stepTitle: current[0].stepTitle, completed } }).catch(() => {});
  return row ?? null;
}

export async function deleteDealChecklist(workspaceId: string, dealId: string) {
  await db.delete(dealChecklists).where(and(eq(dealChecklists.dealId, dealId), eq(dealChecklists.workspaceId, workspaceId)));
}
