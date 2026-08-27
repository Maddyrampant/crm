"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listDealProducts, addDealProduct, updateDealProduct, deleteDealProduct } from "@/services/deal-products";

export async function listDealProductsAction(dealId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listDealProducts(workspaceId, dealId);
}

export async function addDealProductAction(dealId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = z.object({ productId: z.string().optional(), description: z.string().min(1), quantity: z.number().positive(), unitPrice: z.number().min(0), discount: z.number().min(0).optional(), taxRate: z.number().min(0).max(100).optional() }).parse(raw);
  const row = await addDealProduct(workspaceId, dealId, parsed);
  revalidatePath("/pipeline/deals");
  return { ok: true, id: row.id };
}

export async function updateDealProductAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = z.object({ description: z.string().optional(), quantity: z.number().optional(), unitPrice: z.number().optional(), discount: z.number().optional(), taxRate: z.number().optional() }).parse(raw);
  const row = await updateDealProduct(workspaceId, id, parsed);
  revalidatePath("/pipeline/deals");
  return { ok: Boolean(row) };
}

export async function deleteDealProductAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await deleteDealProduct(workspaceId, id);
  revalidatePath("/pipeline/deals");
  return { ok: Boolean(row) };
}
