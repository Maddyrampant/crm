import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailSequences, emailSequenceSteps, emailSequenceEnrollments } from "@/db/schema";
import { normalizePage, normalizePageSize, calculateOffset, buildPaginatedResult, type PaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/services/audit";

export type EmailSequenceRow = typeof emailSequences.$inferSelect;
export type EmailSequenceStepRow = typeof emailSequenceSteps.$inferSelect;
export type EmailSequenceEnrollmentRow = typeof emailSequenceEnrollments.$inferSelect;

export async function listSequences(workspaceId: string, params?: { page?: number; pageSize?: number }) {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const where = eq(emailSequences.workspaceId, workspaceId);
  const [totalRow] = await db.select({ count: count() }).from(emailSequences).where(where);
  const items = await db.select().from(emailSequences).where(where).orderBy(desc(emailSequences.createdAt)).limit(pageSize).offset(calculateOffset(page, pageSize));
  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getSequence(workspaceId: string, id: string) {
  const [row] = await db.select().from(emailSequences).where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId))).limit(1);
  if (!row) return null;
  const steps = await db.select().from(emailSequenceSteps).where(eq(emailSequenceSteps.sequenceId, id)).orderBy(emailSequenceSteps.orderIndex);
  const enrollments = await db.select().from(emailSequenceEnrollments).where(eq(emailSequenceEnrollments.sequenceId, id)).orderBy(desc(emailSequenceEnrollments.createdAt));
  return { sequence: row, steps, enrollments };
}

export async function createSequence(workspaceId: string, input: { name: string; subject: string; body: string; steps?: Array<{ delayDays: number; subject: string; body: string }> }) {
  const [row] = await db.insert(emailSequences).values({ workspaceId, name: input.name, subject: input.subject, body: input.body }).returning();
  if (input.steps && input.steps.length > 0) {
    await db.insert(emailSequenceSteps).values(input.steps.map((s, i) => ({ sequenceId: row.id, orderIndex: i, delayDays: s.delayDays, subject: s.subject, body: s.body })));
  }
  void logAudit(workspaceId, null, "create", "email_sequence", row.id).catch(() => {});
  return row;
}

export async function updateSequence(workspaceId: string, id: string, input: Partial<{ name: string; subject: string; body: string; status: "draft" | "active" | "paused" | "completed" }>) {
  const [row] = await db.update(emailSequences).set({ ...input, updatedAt: new Date() }).where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId))).returning();
  if (row) void logAudit(workspaceId, null, "update", "email_sequence", id).catch(() => {});
  return row ?? null;
}

export async function deleteSequence(workspaceId: string, id: string) {
  const [row] = await db.delete(emailSequences).where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId))).returning({ id: emailSequences.id });
  if (row) void logAudit(workspaceId, null, "delete", "email_sequence", id).catch(() => {});
  return row ?? null;
}

export async function addSequenceStep(workspaceId: string, sequenceId: string, input: { delayDays: number; subject: string; body: string }) {
  const seq = await getSequence(workspaceId, sequenceId);
  if (!seq) return null;
  const nextIndex = seq.steps.length;
  const [row] = await db.insert(emailSequenceSteps).values({ sequenceId, orderIndex: nextIndex, delayDays: input.delayDays, subject: input.subject, body: input.body }).returning();
  return row;
}

export async function deleteSequenceStep(workspaceId: string, stepId: string) {
  const [step] = await db.select().from(emailSequenceSteps).where(eq(emailSequenceSteps.id, stepId)).limit(1);
  if (!step) return null;
  const [seq] = await db.select().from(emailSequences).where(and(eq(emailSequences.id, step.sequenceId), eq(emailSequences.workspaceId, workspaceId))).limit(1);
  if (!seq) return null;
  const [row] = await db.delete(emailSequenceSteps).where(eq(emailSequenceSteps.id, stepId)).returning({ id: emailSequenceSteps.id });
  return row ?? null;
}

export async function enrollContact(workspaceId: string, sequenceId: string, contactId: string) {
  const [row] = await db.insert(emailSequenceEnrollments).values({ sequenceId, contactId, currentStep: 0, status: "pending" }).returning();
  await db.update(emailSequences).set({ totalEnrolled: sql`${emailSequences.totalEnrolled} + 1` }).where(eq(emailSequences.id, sequenceId));
  void logAudit(workspaceId, null, "enroll", "email_sequence", sequenceId).catch(() => {});
  return row;
}

export async function unenrollContact(workspaceId: string, sequenceId: string, contactId: string) {
  const [seq] = await db.select().from(emailSequences).where(and(eq(emailSequences.id, sequenceId), eq(emailSequences.workspaceId, workspaceId))).limit(1);
  if (!seq) return null;
  const [row] = await db.delete(emailSequenceEnrollments).where(and(eq(emailSequenceEnrollments.sequenceId, sequenceId), eq(emailSequenceEnrollments.contactId, contactId))).returning({ id: emailSequenceEnrollments.id });
  return row ?? null;
}
