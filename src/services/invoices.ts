import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activityLog,
  contacts,
  invoiceItems,
  invoices,
  payments,
  type InvoiceStatus,
} from "@/db/schema";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";
import { dispatchWebhookEvent } from "./automation";
import { notifyWorkspace } from "./notifications";
import { dispatchRuleEvent } from "./rules";
import { adjustStock } from "./inventory";
import { warehouses } from "@/db/schema";
import { products } from "@/db/schema";
import { invalidateInvoiceCache } from "@/lib/cache-invalidate";

export const invoiceItemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().trim().min(1, "شرح مورد نیاز است"),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  contactId: z.string().min(1, "مشتری را انتخاب کنید"),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().max(2000).optional().default(""),
  items: z.array(invoiceItemSchema).min(1, "حداقل یک آیتم لازم است"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const toMoney = (v: number) => String(round2(v));

async function nextInvoiceNumber(workspaceId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId));
  return `INV-${String((row?.count ?? 0) + 1).padStart(5, "0")}`;
}

async function logActivity(
  workspaceId: string,
  userId: string | null,
  action: string,
  entityId: string,
  data: Record<string, unknown> = {}
) {
  await db.insert(activityLog).values({
    workspaceId,
    entityType: "invoice",
    entityId,
    action,
    userId,
    data,
  });
}

/** کسر موجودی کالاهای فاکتور هنگام ارسال (و برگشت آن هنگام لغو). */
async function adjustStockForInvoice(
  workspaceId: string,
  userId: string | null,
  invoiceId: string,
  direction: 1 | -1
) {
  const [wh] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(eq(warehouses.workspaceId, workspaceId), eq(warehouses.isDefault, true))
    )
    .limit(1);
  if (!wh) return;

  const [invoice] = await db
    .select({ number: invoices.number })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));
  for (const it of items) {
    if (!it.productId) continue;
    await adjustStock(
      workspaceId,
      userId,
      {
        productId: it.productId,
        warehouseId: wh.id,
        quantity: direction * num(it.quantity),
        type: direction < 0 ? "sale" : "return",
        reference: invoice?.number,
      }
    );
  }
}

export async function listInvoices(
  workspaceId: string,
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
  }
): Promise<PaginatedResult<{
  invoice: typeof invoices.$inferSelect;
  contactName: string;
  paidTotal: string;
}>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions = [eq(invoices.workspaceId, workspaceId)];

  if (params?.status) {
    conditions.push(eq(invoices.status, params.status as typeof invoices.$inferSelect.status));
  }
  if (params?.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(like(invoices.number, q), like(contacts.firstName, q))!
    );
  }

  const where = and(...conditions);

  const orderByClause =
    params?.sortBy === "total"
      ? params?.sortDir === "asc"
        ? asc(invoices.total)
        : desc(invoices.total)
      : params?.sortBy === "number"
        ? params?.sortDir === "asc"
          ? asc(invoices.number)
          : desc(invoices.number)
        : params?.sortDir === "asc"
          ? asc(invoices.issuedAt)
          : desc(invoices.issuedAt);

  const [items, totalRow] = await Promise.all([
    db
      .select({
        invoice: invoices,
        contactName: sql<string>`concat(${contacts.firstName}, ' ', coalesce(${contacts.lastName}, ''))`,
        paidTotal: sql<string>`coalesce((
          select sum(payments.amount::numeric) from payments
          where payments.invoice_id = ${invoices.id}
        ), 0)::text`,
      })
      .from(invoices)
      .innerJoin(contacts, eq(contacts.id, invoices.contactId))
      .where(where)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(invoices)
      .innerJoin(contacts, eq(contacts.id, invoices.contactId))
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

export type InvoiceRow = {
  invoice: typeof invoices.$inferSelect;
  contactName: string;
  paidTotal: string;
};

/** فاکتورهای سررسید‌گذشته برای داشبورد */
export async function getOverdueInvoices(workspaceId: string, limit = 8) {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      total: invoices.total,
      dueAt: invoices.dueAt,
      contactName: sql<string>`concat(${contacts.firstName}, ' ', coalesce(${contacts.lastName}, ''))`,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.contactId))
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        eq(invoices.status, "overdue")
      )
    )
    .orderBy(asc(invoices.dueAt))
    .limit(limit);
}

export async function getInvoice(workspaceId: string, invoiceId: string) {
  const [row] = await db
    .select({
      invoice: invoices,
      contact: contacts,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.contactId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
      item: invoiceItems,
      productName: products.name,
    })
    .from(invoiceItems)
    .leftJoin(products, eq(products.id, invoiceItems.productId))
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.id);

  const flatItems = items.map((r) => ({ ...r.item, productName: r.productName }));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.paidAt));

  return { ...row, items: flatItems, payments: pays };
}

export async function createInvoice(
  workspaceId: string,
  userId: string | null,
  raw: unknown
) {
  const input = createInvoiceSchema.parse(raw);
  const number = await nextInvoiceNumber(workspaceId);

  let total = 0;
  const items = input.items.map((it) => {
    const line = round2(num(it.quantity) * num(it.unitPrice));
    const tax = round2(line * num(it.taxRate) / 100);
    total = round2(total + line + tax);
    return {
      productId: it.productId || null,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      taxRate: String(it.taxRate),
      amount: toMoney(line),
    };
  });
  total = round2(total - num(input.discount));

  const [invoice] = await db
    .insert(invoices)
    .values({
      workspaceId,
      contactId: input.contactId,
      number,
      status: "draft",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      discount: toMoney(num(input.discount)),
      taxRate: String(input.taxRate),
      total: toMoney(total),
      notes: input.notes || null,
    })
    .returning();

  await db.insert(invoiceItems).values(
    items.map((it) => ({ ...it, invoiceId: invoice.id }))
  );

  await logActivity(workspaceId, userId, "invoice.created", invoice.id, {
    number,
    total: invoice.total,
  });
  await dispatchWebhookEvent(workspaceId, "invoice.created", {
    id: invoice.id,
    number: invoice.number,
    total: invoice.total,
  });
  await invalidateInvoiceCache(workspaceId);

  return invoice;
}

export async function updateInvoiceStatus(
  workspaceId: string,
  userId: string | null,
  invoiceId: string,
  status: InvoiceStatus
) {
  const [existing] = await db
    .select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) return null;
  const prevStatus = existing.status;

  const [invoice] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();
  if (!invoice) return null;

  if (prevStatus !== status) {
    if (status === "sent" && prevStatus !== "sent") {
      await adjustStockForInvoice(workspaceId, userId, invoiceId, -1);
    } else if (
      status === "cancelled" &&
      (prevStatus === "sent" || prevStatus === "paid")
    ) {
      await adjustStockForInvoice(workspaceId, userId, invoiceId, 1);
    }
  }

  await logActivity(workspaceId, userId, "invoice.status_changed", invoiceId, {
    status,
  });
  await dispatchWebhookEvent(workspaceId, "invoice.status_changed", {
    id: invoice.id,
    status,
  });
  await invalidateInvoiceCache(workspaceId);
  return invoice;
}

/** تبدیل پیش‌فاکتور (draft) به فاکتور رسمی (sent): کسر موجودی + ثبت خودکار در activityLog. */
export async function convertInvoice(
  workspaceId: string,
  userId: string | null,
  invoiceId: string
): Promise<{ ok: true; invoice: typeof invoices.$inferSelect } | { ok: false; error: string }> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!invoice) {
    return { ok: false, error: "فاکتور یافت نشد" };
  }
  if (invoice.status !== "draft") {
    return { ok: false, error: "فقط پیش‌فاکتور (وضعیت پیش‌نویس) قابل تبدیل به فاکتور است" };
  }

  const [countRow] = await db
    .select({ count: sql<string>`count(*)::int` })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));
  if (!countRow || Number(countRow.count) === 0) {
    return { ok: false, error: "پیش‌فاکتور بدون آیتم قابل صدور نیست" };
  }

  const sent = await updateInvoiceStatus(workspaceId, userId, invoiceId, "sent");
  if (!sent) {
    return { ok: false, error: "تبدیل فاکتور انجام نشد" };
  }

  await logActivity(workspaceId, userId, "invoice.converted", invoiceId, {
    from: "draft",
    to: "sent",
  });
  await dispatchWebhookEvent(workspaceId, "invoice.converted", {
    id: invoice.id,
    number: invoice.number,
  });
  await notifyWorkspace({
    workspaceId,
    type: "invoice",
    title: "پیش‌فاکتور به فاکتور تبدیل شد",
    body: `پیش‌فاکتور ${invoice.number} رسماً به فاکتور تبدیل و صادر شد.`,
    link: `/invoices/${invoice.id}`,
  });

  return { ok: true, invoice: sent };
}

export async function recordPayment(
  workspaceId: string,
  userId: string | null,
  invoiceId: string,
  raw: { amount: number; method?: string; reference?: string; paidAt?: string }
) {
  const schema = z.object({
    amount: z.coerce.number().positive("مبلغ باید مثبت باشد"),
    method: z.enum(["cash", "card", "transfer", "check", "other"]).default("cash"),
    reference: z.string().trim().max(200).optional().default(""),
    paidAt: z.string().datetime({ offset: true }).optional(),
  });
  const input = schema.parse(raw);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  if (!invoice) return null;

  await db.insert(payments).values({
    invoiceId,
    amount: String(input.amount),
    method: input.method,
    reference: input.reference || null,
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
  });

  const [agg] = await db
    .select({ sum: sql<string>`coalesce(sum(amount::numeric),0)::text` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const paid = num(agg?.sum);
  const total = num(invoice.total);
  const newStatus: InvoiceStatus =
    paid >= total && total > 0 ? "paid" : invoice.status === "paid" ? "paid" : invoice.status;

  if (newStatus !== invoice.status) {
    await db
      .update(invoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  await logActivity(workspaceId, userId, "payment.recorded", invoiceId, {
    amount: input.amount,
    method: input.method,
  });
  await dispatchWebhookEvent(workspaceId, "payment.recorded", {
    invoiceId,
    amount: input.amount,
  });
  dispatchRuleEvent(workspaceId, "invoice.payment_received", {
    entityId: invoiceId,
    invoiceId,
    number: invoice.number,
    amount: input.amount,
    total: total,
    status: newStatus,
    contactId: invoice.contactId,
    link: `/invoices/${invoiceId}`,
  });
  await notifyWorkspace({
    workspaceId,
    type: "payment",
    title: "پرداخت جدید ثبت شد",
    body: `مبلغ ${input.amount} برای فاکتور ${invoice.number} دریافت شد.`,
    link: `/invoices/${invoiceId}`,
    data: { amount: input.amount, method: input.method },
  });

  return { paid, total };
}

export async function deleteInvoice(workspaceId: string, invoiceId: string) {
  const [deleted] = await db
    .delete(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .returning({ id: invoices.id });
  if (deleted) await invalidateInvoiceCache(workspaceId);
  return deleted ?? null;
}
