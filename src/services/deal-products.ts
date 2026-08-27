import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dealProducts } from "@/db/schema";
import { logActivity } from "@/services/activity";
import { logAudit } from "@/services/audit";

export type DealProductRow = typeof dealProducts.$inferSelect;

export async function listDealProducts(workspaceId: string, dealId: string) {
  return db.select().from(dealProducts).where(and(eq(dealProducts.workspaceId, workspaceId), eq(dealProducts.dealId, dealId))).orderBy(dealProducts.createdAt);
}

export async function addDealProduct(workspaceId: string, dealId: string, input: { productId?: string; description: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number }) {
  const amount = input.quantity * input.unitPrice - (input.discount ?? 0);
  const tax = amount * ((input.taxRate ?? 0) / 100);
  const [row] = await db.insert(dealProducts).values({
    workspaceId,
    dealId,
    productId: input.productId ?? null,
    description: input.description,
    quantity: String(input.quantity),
    unitPrice: String(input.unitPrice),
    discount: String(input.discount ?? 0),
    taxRate: String(input.taxRate ?? 0),
    amount: String(amount + tax),
  }).returning();
  void logActivity({ workspaceId, entityType: "deal", entityId: dealId, action: "product_added", data: { description: input.description } }).catch(() => {});
  void logAudit(workspaceId, null, "create", "deal_product", row.id).catch(() => {});
  return row;
}

export async function updateDealProduct(workspaceId: string, id: string, input: Partial<{ description: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>) {
  const current = await db.select().from(dealProducts).where(and(eq(dealProducts.id, id), eq(dealProducts.workspaceId, workspaceId))).limit(1);
  if (!current[0]) return null;
  const c = current[0];
  const quantity = input.quantity ?? Number(c.quantity);
  const unitPrice = input.unitPrice ?? Number(c.unitPrice);
  const discount = input.discount ?? Number(c.discount);
  const taxRate = input.taxRate ?? Number(c.taxRate);
  const amount = quantity * unitPrice - discount;
  const tax = amount * (taxRate / 100);
  const [row] = await db.update(dealProducts).set({
    ...(input.description !== undefined && { description: input.description }),
    quantity: String(quantity),
    unitPrice: String(unitPrice),
    discount: String(discount),
    taxRate: String(taxRate),
    amount: String(amount + tax),
  }).where(and(eq(dealProducts.id, id), eq(dealProducts.workspaceId, workspaceId))).returning();
  return row ?? null;
}

export async function deleteDealProduct(workspaceId: string, id: string) {
  const current = await db.select().from(dealProducts).where(and(eq(dealProducts.id, id), eq(dealProducts.workspaceId, workspaceId))).limit(1);
  if (!current[0]) return null;
  const [row] = await db.delete(dealProducts).where(and(eq(dealProducts.id, id), eq(dealProducts.workspaceId, workspaceId))).returning({ id: dealProducts.id });
  if (row) {
    void logActivity({ workspaceId, entityType: "deal", entityId: current[0].dealId, action: "product_removed", data: { description: current[0].description } }).catch(() => {});
    void logAudit(workspaceId, null, "delete", "deal_product", id).catch(() => {});
  }
  return row ?? null;
}
