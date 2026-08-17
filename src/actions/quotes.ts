"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as quotesService from "@/services/quotes";

export async function listQuotesAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await quotesService.listQuotes(workspaceId);
  return { ok: true, data };
}

export async function getQuoteAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await quotesService.getQuote(workspaceId, id);
  if (!data) return { ok: false, error: "پیش‌فاکتور یافت نشد" };
  return { ok: true, data };
}

export async function createQuoteAction(input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as quotesService.QuoteInput;
  const row = await quotesService.createQuote(workspaceId, data);
  revalidatePath("/quotes");
  return { ok: true, data: row };
}

export async function updateQuoteAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as Partial<quotesService.QuoteInput>;
  const row = await quotesService.updateQuote(workspaceId, id, data);
  if (!row) return { ok: false, error: "پیش‌فاکتور یافت نشد" };
  revalidatePath("/quotes");
  return { ok: true, data: row };
}

export async function deleteQuoteAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await quotesService.deleteQuote(workspaceId, id);
  revalidatePath("/quotes");
  return { ok: Boolean(row) };
}

export async function convertQuoteToInvoiceAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const invoice = await quotesService.convertToInvoice(workspaceId, id);
  if (!invoice) return { ok: false, error: "تبدیل انجام نشد" };
  revalidatePath("/quotes");
  revalidatePath("/invoices");
  return { ok: true, data: invoice };
}
