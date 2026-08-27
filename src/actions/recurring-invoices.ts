"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/session";
import { listRecurringInvoices, createRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice } from "@/services/recurring-invoices";

export async function listRecurringInvoicesAction(params?: { page?: number; pageSize?: number }) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  return listRecurringInvoices(workspaceId, params);
}

export async function createRecurringInvoiceAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ contactId: z.string().min(1), frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(), templateItems: z.array(z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number(), taxRate: z.number().optional() })).optional(), notes: z.string().optional() }).parse(raw);
  const row = await createRecurringInvoice(workspaceId, parsed);
  revalidatePath("/recurring-invoices");
  return { ok: true, id: row.id };
}

export async function updateRecurringInvoiceAction(id: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const parsed = z.object({ frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(), status: z.enum(["active", "paused", "completed"]).optional(), notes: z.string().optional() }).parse(raw);
  const row = await updateRecurringInvoice(workspaceId, id, parsed);
  revalidatePath("/recurring-invoices");
  return { ok: Boolean(row) };
}

export async function deleteRecurringInvoiceAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteRecurringInvoice(workspaceId, id);
  revalidatePath("/recurring-invoices");
  return { ok: Boolean(row) };
}
