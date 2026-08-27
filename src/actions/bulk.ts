"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { db } from "@/db";
import { contacts, deals, invoices, products } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

export async function bulkDeleteContactsAction(ids: string[]) {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف گروهی مشتریان را ندارید" };
  }
  if (!ids.length) return { ok: false, error: "هیچ آیتمی انتخاب نشده" };

  await db
    .delete(contacts)
    .where(and(inArray(contacts.id, ids), eq(contacts.workspaceId, workspaceId)));

  revalidatePath("/contacts");
  return { ok: true, deleted: ids.length };
}

export async function bulkDeleteDealsAction(ids: string[]) {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف گروهی فروش‌ها را ندارید" };
  }
  if (!ids.length) return { ok: false, error: "هیچ آیتمی انتخاب نشده" };

  await db
    .delete(deals)
    .where(and(inArray(deals.id, ids), eq(deals.workspaceId, workspaceId)));

  revalidatePath("/pipeline");
  return { ok: true, deleted: ids.length };
}

export async function bulkDeleteInvoicesAction(ids: string[]) {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف گروهی فاکتورها را ندارید" };
  }
  if (!ids.length) return { ok: false, error: "هیچ آیتمی انتخاب نشده" };

  await db
    .delete(invoices)
    .where(and(inArray(invoices.id, ids), eq(invoices.workspaceId, workspaceId)));

  revalidatePath("/invoices");
  return { ok: true, deleted: ids.length };
}

export async function bulkDeleteProductsAction(ids: string[]) {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف گروهی کالاها را ندارید" };
  }
  if (!ids.length) return { ok: false, error: "هیچ آیتمی انتخاب نشده" };

  await db
    .delete(products)
    .where(and(inArray(products.id, ids), eq(products.workspaceId, workspaceId)));

  revalidatePath("/products");
  return { ok: true, deleted: ids.length };
}
