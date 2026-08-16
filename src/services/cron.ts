import "server-only";

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { invoices, workspaces } from "@/db/schema";
import { listLowStock } from "./inventory";
import { notifyWorkspace, processDueReminders } from "./notifications";
import { dispatchRuleEvent } from "./rules";

function num(v: string | null | undefined) {
  return v ? Number(v) : 0;
}

export type DailyCronResult = {
  remindersProcessed: number;
  overdueInvoices: number;
  lowStockWorkspaces: number;
};

/** اجرای نگهداری روزانه: یادآورها، فاکتورهای سررسیدشده و هشدار کمبود موجودی. */
export async function runDailyMaintenance(): Promise<DailyCronResult> {
  const remindersProcessed = await processDueReminders();

  const overdueRows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      workspaceId: invoices.workspaceId,
      contactId: invoices.contactId,
      total: invoices.total,
    })
    .from(invoices)
    .where(and(eq(invoices.status, "sent"), lt(invoices.dueAt, new Date())))
    .limit(500);

  for (const row of overdueRows) {
    await db
      .update(invoices)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(eq(invoices.id, row.id));
    dispatchRuleEvent(row.workspaceId, "invoice.overdue", {
      entityId: row.id,
      invoiceId: row.id,
      number: row.number,
      total: num(row.total),
      contactId: row.contactId,
      link: `/invoices/${row.id}`,
    });
    await notifyWorkspace({
      workspaceId: row.workspaceId,
      type: "invoice",
      title: "فاکتور سررسید شد",
      body: `فاکتور ${row.number} به وضعیت «سررسید شده» تغییر کرد.`,
      link: `/invoices/${row.id}`,
    });
  }

  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);
  let lowStockWorkspaces = 0;
  for (const ws of allWorkspaces) {
    const low = await listLowStock(ws.id, 5);
    if (low.length === 0) continue;
    lowStockWorkspaces += 1;
    const names = low.map((p) => p.name).join("، ");
    await notifyWorkspace({
      workspaceId: ws.id,
      type: "system",
      title: "هشدار کمبود موجودی",
      body:
        low.length <= 5
          ? `کالاهای زیر به حد هشدار رسیده‌اند: ${names}`
          : `بیش از ۵ کالا به حد هشدار موجودی رسیده‌اند (نمونه: ${names}).`,
      link: "/stock",
    });
  }

  return { remindersProcessed, overdueInvoices: overdueRows.length, lowStockWorkspaces };
}
