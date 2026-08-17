"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/lib/session";
import * as quotesService from "@/services/quotes";

const quoteItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional(),
});

const quoteSchema = z.object({
  contactId: z.string().min(1),
  validUntil: z.string().nullable().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(quoteItemSchema).min(1),
});

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
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await quotesService.createQuote(workspaceId, parsed.data);
  revalidatePath("/quotes");
  return { ok: true, data: row };
}

export async function updateQuoteAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const parsed = quoteSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await quotesService.updateQuote(workspaceId, id, parsed.data);
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
