import "server-only";

import { and, count, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { recurringInvoices } from "@/db/schema";
import { normalizePage, normalizePageSize, calculateOffset, buildPaginatedResult, type PaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/services/audit";

export type RecurringInvoiceRow = typeof recurringInvoices.$inferSelect;

export async function listRecurringInvoices(workspaceId: string, params?: { page?: number; pageSize?: number }) {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const where = eq(recurringInvoices.workspaceId, workspaceId);
  const [totalRow] = await db.select({ count: count() }).from(recurringInvoices).where(where);
  const items = await db.select().from(recurringInvoices).where(where).orderBy(desc(recurringInvoices.createdAt)).limit(pageSize).offset(calculateOffset(page, pageSize));
  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getRecurringInvoice(workspaceId: string, id: string) {
  const [row] = await db.select().from(recurringInvoices).where(and(eq(recurringInvoices.id, id), eq(recurringInvoices.workspaceId, workspaceId))).limit(1);
  return row ?? null;
}

export async function createRecurringInvoice(workspaceId: string, input: {
  contactId: string;
  frequency?: "weekly" | "monthly" | "quarterly" | "yearly";
  templateItems?: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>;
  discount?: { type: "fixed" | "percent"; value: number };
  taxRate?: number;
  notes?: string;
  nextGenerationAt?: Date;
}) {
  const [row] = await db.insert(recurringInvoices).values({
    workspaceId,
    contactId: input.contactId,
    frequency: input.frequency ?? "monthly",
    templateItems: input.templateItems ?? [],
    discount: input.discount ?? null,
    taxRate: input.taxRate ?? 0,
    notes: input.notes ?? null,
    nextGenerationAt: input.nextGenerationAt ?? null,
  }).returning();
  void logAudit(workspaceId, null, "create", "recurring_invoice", row.id).catch(() => {});
  return row;
}

export async function updateRecurringInvoice(workspaceId: string, id: string, input: Partial<{
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  status: "active" | "paused" | "completed";
  templateItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>;
  discount: { type: "fixed" | "percent"; value: number } | null;
  taxRate: number;
  notes: string;
}>) {
  const [row] = await db.update(recurringInvoices).set({ ...input, updatedAt: new Date() }).where(and(eq(recurringInvoices.id, id), eq(recurringInvoices.workspaceId, workspaceId))).returning();
  if (row) void logAudit(workspaceId, null, "update", "recurring_invoice", id).catch(() => {});
  return row ?? null;
}

export async function deleteRecurringInvoice(workspaceId: string, id: string) {
  const [row] = await db.delete(recurringInvoices).where(and(eq(recurringInvoices.id, id), eq(recurringInvoices.workspaceId, workspaceId))).returning({ id: recurringInvoices.id });
  if (row) void logAudit(workspaceId, null, "delete", "recurring_invoice", id).catch(() => {});
  return row ?? null;
}

export async function getDueRecurringInvoices() {
  const now = new Date();
  return db.select().from(recurringInvoices).where(and(eq(recurringInvoices.status, "active"), lte(recurringInvoices.nextGenerationAt, now))).orderBy(recurringInvoices.nextGenerationAt);
}
