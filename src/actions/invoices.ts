"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import {
  createInvoice,
  deleteInvoice,
  recordPayment,
  updateInvoiceStatus,
} from "@/services/invoices";

export async function createInvoiceAction(raw: unknown) {
  const { user, workspaceId } = await requireWorkspace();
  const invoice = await createInvoice(workspaceId, user.id, raw);
  revalidatePath("/invoices");
  return { ok: true, id: invoice.id };
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
) {
  const { user, workspaceId } = await requireWorkspace();
  const row = await updateInvoiceStatus(workspaceId, user.id, invoiceId, status);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: Boolean(row) };
}

export async function recordPaymentAction(
  invoiceId: string,
  raw: { amount: number; method?: string; reference?: string }
) {
  const { user, workspaceId } = await requireWorkspace();
  const result = await recordPayment(workspaceId, user.id, invoiceId, raw);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: Boolean(result) };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await deleteInvoice(workspaceId, invoiceId);
  revalidatePath("/invoices");
  return { ok: Boolean(row) };
}
