import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotes, quoteItems } from "@/db/schema";
import { invoices, invoiceItems } from "@/db/schema";

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const toMoney = (v: number) => String(round2(v));

async function nextQuoteNumber(workspaceId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(eq(quotes.workspaceId, workspaceId));
  return `QUO-${String((row?.count ?? 0) + 1).padStart(5, "0")}`;
}

export type QuoteInput = {
  contactId: string;
  validUntil?: string | null;
  taxRate?: number;
  notes?: string | null;
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
};

export async function listQuotes(workspaceId: string) {
  return db
    .select()
    .from(quotes)
    .where(eq(quotes.workspaceId, workspaceId))
    .orderBy(desc(quotes.createdAt));
}

export async function getQuote(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.id, id)))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id));
  return { ...row, items };
}

export async function createQuote(workspaceId: string, input: QuoteInput) {
  const number = await nextQuoteNumber(workspaceId);
  let subtotal = 0;
  const items = input.items.map((it) => {
    const line = round2(num(it.quantity) * num(it.unitPrice));
    const tax = round2(line * num(it.taxRate ?? 0) / 100);
    subtotal = round2(subtotal + line);
    return {
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      taxRate: String(it.taxRate ?? 0),
      amount: toMoney(line),
    };
  });
  const taxRate = num(input.taxRate);
  const taxAmount = round2(subtotal * taxRate / 100);
  const total = round2(subtotal + taxAmount);

  const [quote] = await db
    .insert(quotes)
    .values({
      workspaceId,
      contactId: input.contactId,
      number,
      validUntil: input.validUntil ?? null,
      subtotal: toMoney(subtotal),
      taxRate: String(taxRate),
      taxAmount: toMoney(taxAmount),
      total: toMoney(total),
      notes: input.notes ?? null,
    })
    .returning();

  if (items.length > 0) {
    await db.insert(quoteItems).values(
      items.map((it) => ({ ...it, quoteId: quote.id }))
    );
  }

  return quote;
}

export async function updateQuote(workspaceId: string, id: string, input: Partial<QuoteInput>) {
  const [existing] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.id, id)))
    .limit(1);
  if (!existing) return null;

  const contactId = input.contactId ?? existing.contactId;
  const validUntil = input.validUntil !== undefined ? input.validUntil : existing.validUntil;
  const taxRate = input.taxRate !== undefined ? input.taxRate : num(existing.taxRate);
  const notes = input.notes !== undefined ? input.notes : existing.notes;

  let subtotal = num(existing.subtotal);
  let items = input.items?.map((it) => {
    const line = round2(num(it.quantity) * num(it.unitPrice));
    subtotal = round2(subtotal + line);
    return {
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      taxRate: String(it.taxRate ?? 0),
      amount: toMoney(line),
    };
  });

  if (input.items) {
    subtotal = 0;
    items = input.items.map((it) => {
      const line = round2(num(it.quantity) * num(it.unitPrice));
      subtotal = round2(subtotal + line);
      return {
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        taxRate: String(it.taxRate ?? 0),
        amount: toMoney(line),
      };
    });
  }

  const taxAmount = round2(subtotal * taxRate / 100);
  const total = round2(subtotal + taxAmount);

  const [quote] = await db
    .update(quotes)
    .set({
      contactId,
      validUntil: validUntil ?? null,
      subtotal: toMoney(subtotal),
      taxRate: String(taxRate),
      taxAmount: toMoney(taxAmount),
      total: toMoney(total),
      notes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.id, id)))
    .returning();

  if (quote && input.items) {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    if (items && items.length > 0) {
      await db.insert(quoteItems).values(
        items.map((it) => ({ ...it, quoteId: id }))
      );
    }
  }

  return quote ?? null;
}

export async function deleteQuote(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(quotes)
    .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.id, id)))
    .returning({ id: quotes.id });
  return deleted ?? null;
}

export async function convertToInvoice(workspaceId: string, quoteId: string) {
  const quote = await getQuote(workspaceId, quoteId);
  if (!quote) return null;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId));
  const invoiceNumber = `INV-${String((countRow?.count ?? 0) + 1).padStart(5, "0")}`;

  const [invoice] = await db
    .insert(invoices)
    .values({
      workspaceId,
      contactId: quote.contactId,
      number: invoiceNumber,
      status: "draft",
      taxRate: quote.taxRate,
      total: quote.total,
      notes: quote.notes,
    })
    .returning();

  if (quote.items.length > 0) {
    await db.insert(invoiceItems).values(
      quote.items.map((it) => ({
        invoiceId: invoice.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        amount: it.amount,
      }))
    );
  }

  await db
    .update(quotes)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  return invoice;
}
