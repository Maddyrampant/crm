import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, invoices, payments, invoiceItems } from "@/db/schema";

function escapeCsv(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function toCsv(header: string[], rows: string[][]): string {
  return [header.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
}

export function exportToCsv(data: Record<string, unknown>[], filename: string): string {
  if (data.length === 0) return "";
  const header = Object.keys(data[0]);
  const rows = data.map((row) => header.map((h) => String(row[h] ?? "")));
  return toCsv(header, rows);
}

export async function exportContacts(workspaceId: string) {
  const rows = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      source: contacts.source,
      lifecycleStage: contacts.lifecycleStage,
      leadScore: contacts.leadScore,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));

  return toCsv(
    ["نام", "نام خانوادگی", "ایمیل", "موبایل", "منبع", "مرحله", "امتیاز", "تاریخ ایجاد"],
    rows.map((r) => [
      r.firstName,
      r.lastName ?? "",
      r.email ?? "",
      r.phone ?? "",
      r.source,
      r.lifecycleStage,
      String(r.leadScore ?? 0),
      r.createdAt?.toISOString() ?? "",
    ])
  );
}

export async function exportDeals(workspaceId: string) {
  const rows = await db
    .select({
      title: deals.title,
      amount: deals.amount,
      status: deals.status,
      createdAt: deals.createdAt,
      wonAt: deals.wonAt,
    })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));

  return toCsv(
    ["عنوان", "مبلغ", "وضعیت", "تاریخ ایجاد", "تاریخ برد"],
    rows.map((r) => [
      r.title,
      r.amount,
      r.status,
      r.createdAt?.toISOString() ?? "",
      r.wonAt?.toISOString() ?? "",
    ])
  );
}

export async function exportInvoices(workspaceId: string) {
  const rows = await db
    .select({
      number: invoices.number,
      total: invoices.total,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId));

  return toCsv(
    ["شماره", "مبلغ کل", "وضعیت", "تاریخ صدور", "تاریخ سررسید"],
    rows.map((r) => [
      r.number,
      r.total,
      r.status,
      r.issuedAt?.toISOString() ?? "",
      r.dueAt?.toISOString() ?? "",
    ])
  );
}
