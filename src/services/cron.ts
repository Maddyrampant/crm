import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { invoices, tasks, workspaces } from "@/db/schema";
import { listAllLowStock } from "./inventory";
import { notifyWorkspace, processDueReminders } from "./notifications";
import { dispatchRuleEvent } from "./rules";

function num(v: string | null | undefined) {
  return v ? Number(v) : 0;
}

export type DailyCronResult = {
  remindersProcessed: number;
  overdueInvoices: number;
  overdueTasks: number;
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

  if (overdueRows.length > 0) {
    const overdueIds = overdueRows.map((r) => r.id);
    await db
      .update(invoices)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(inArray(invoices.id, overdueIds));
  }

  for (const row of overdueRows) {
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
  const lowStockByWs = await listAllLowStock(20);
  for (const [wsId, lowItems] of lowStockByWs) {
    lowStockWorkspaces += 1;
    const names = lowItems.map((p) => p.name).join("، ");
    await notifyWorkspace({
      workspaceId: wsId,
      type: "system",
      title: "هشدار کمبود موجودی",
      body:
        lowItems.length <= 5
          ? `کالاهای زیر به حد هشدار رسیده‌اند: ${names}`
          : `بیش از ۵ کالا به حد هشدار موجودی رسیده‌اند (نمونه: ${names}).`,
      link: "/stock",
    });
  }

  // ── تسکهای سررسید شده ──
  let overdueTasks = 0;
  const now = new Date();
  const allOverdue = await db
    .select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, workspaceId: tasks.workspaceId })
    .from(tasks)
    .where(and(eq(tasks.status, "open"), lt(tasks.dueAt, now)))
    .limit(500);

  const overdueByWorkspace = new Map<string, typeof allOverdue>();
  for (const t of allOverdue) {
    const list = overdueByWorkspace.get(t.workspaceId) || [];
    list.push(t);
    overdueByWorkspace.set(t.workspaceId, list);
  }

  for (const [wsId, overdue] of overdueByWorkspace) {
    overdueTasks += overdue.length;
    const titles = overdue.slice(0, 5).map((t) => t.title).join("، ");
    await notifyWorkspace({
      workspaceId: wsId,
      type: "task",
      title: "تسکهای سررسید شده",
      body:
        overdue.length <= 5
          ? `${overdue.length} تسک از موعد گذشته: ${titles}`
          : `${overdue.length} تسک از موعد گذشته (نمونه: ${titles}).`,
      link: "/tasks",
    });
  }

  return { remindersProcessed, overdueInvoices: overdueRows.length, overdueTasks, lowStockWorkspaces };
}
