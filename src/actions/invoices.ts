"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  convertInvoice,
  createInvoice,
  deleteInvoice,
  listInvoices,
  recordPayment,
  updateInvoiceStatus,
} from "@/services/invoices";

export async function listInvoicesAction(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  const result = await listInvoices(workspaceId, params);
  return result;
}

export async function createInvoiceAction(raw: unknown) {
  const { user, workspaceId } = await requireWorkspaceRole("seller");
  const invoice = await createInvoice(workspaceId, user.id, raw);
  revalidatePath("/invoices");
  return { ok: true, id: invoice.id };
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
) {
  const { user, workspaceId } = await requireWorkspaceRole("seller");
  const row = await updateInvoiceStatus(workspaceId, user.id, invoiceId, status);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: Boolean(row) };
}

/** تبدیل پیش‌فاکتور به فاکتور رسمی (draft → sent). */
export async function convertInvoiceAction(invoiceId: string) {
  const { user, workspaceId } = await requireWorkspaceRole("seller");
  const result = await convertInvoice(workspaceId, user.id, invoiceId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function recordPaymentAction(
  invoiceId: string,
  raw: { amount: number; method?: string; reference?: string }
) {
  const { user, workspaceId } = await requireWorkspaceRole("seller");
  const result = await recordPayment(workspaceId, user.id, invoiceId, raw);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: Boolean(result) };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await deleteInvoice(workspaceId, invoiceId);
  revalidatePath("/invoices");
  return { ok: Boolean(row) };
}
