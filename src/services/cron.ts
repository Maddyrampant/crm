import "server-only";

import { and, eq, inArray, lt, sql, count } from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  emailSequenceEnrollments,
  emailSequenceSteps,
  emailSequences,
  invoices,
  recurringInvoices,
  tasks,
  workspaces,
} from "@/db/schema";
import { listAllLowStock } from "./inventory";
import { notifyWorkspace, processDueReminders } from "./notifications";
import { dispatchRuleEvent } from "./rules";
import { getDueRecurringInvoices } from "./recurring-invoices";
import { createInvoice } from "./invoices";
import { sendEmail, renderTemplate, processDueDeliveries, dispatchWebhookEvent } from "./automation";
import { checkBreachedSlas } from "./sla-tracker";

function num(v: string | null | undefined) {
  return v ? Number(v) : 0;
}

export type DailyCronResult = {
  remindersProcessed: number;
  overdueInvoices: number;
  overdueTasks: number;
  lowStockWorkspaces: number;
  recurringInvoicesGenerated: number;
  sequenceEmailsSent: number;
  slaBreachesSwept: number;
  deliveriesProcessed: number;
};

function advanceNextDate(current: Date, frequency: string): Date {
  const d = new Date(current);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

async function generateRecurringInvoices(): Promise<number> {
  const due = await getDueRecurringInvoices();
  let generated = 0;

  for (const row of due) {
    try {
      const invoice = await createInvoice(row.workspaceId, null, {
        contactId: row.contactId,
        items: row.templateItems,
        discount: row.discount,
        taxRate: row.taxRate ?? 0,
        notes: row.notes ?? "",
      });

      const nextAt = advanceNextDate(row.nextGenerationAt ?? new Date(), row.frequency);

      await db
        .update(recurringInvoices)
        .set({
          nextGenerationAt: nextAt,
          lastGeneratedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recurringInvoices.id, row.id));

      await notifyWorkspace({
        workspaceId: row.workspaceId,
        type: "invoice",
        title: "فاکتور تکراری صادر شد",
        link: "/invoices",
      });

      dispatchWebhookEvent(row.workspaceId, "recurring_invoice.generated", {
        id: row.id,
        invoiceId: invoice.id,
      });

      generated++;
    } catch {
      // one failure should not block others
    }
  }

  return generated;
}

async function stepEmailSequences(): Promise<number> {
  const now = new Date();
  let sent = 0;

  const dueEnrollments = await db
    .select({
      enrollment: emailSequenceEnrollments,
      sequence: emailSequences,
    })
    .from(emailSequenceEnrollments)
    .innerJoin(
      emailSequences,
      and(
        eq(emailSequenceEnrollments.sequenceId, emailSequences.id),
        eq(emailSequences.status, "active")
      )
    )
    .where(
      and(
        eq(emailSequenceEnrollments.status, "pending"),
        lt(emailSequenceEnrollments.nextSendAt, now)
      )
    )
    .limit(100);

  for (const { enrollment, sequence } of dueEnrollments) {
    try {
      const [step] = await db
        .select()
        .from(emailSequenceSteps)
        .where(
          and(
            eq(emailSequenceSteps.sequenceId, sequence.id),
            eq(emailSequenceSteps.orderIndex, enrollment.currentStep)
          )
        )
        .limit(1);

      if (!step) {
        await db
          .update(emailSequenceEnrollments)
          .set({ status: "sent", completedAt: now })
          .where(eq(emailSequenceEnrollments.id, enrollment.id));
        continue;
      }

      const [contact] = await db
        .select({ email: contacts.email, firstName: contacts.firstName })
        .from(contacts)
        .where(eq(contacts.id, enrollment.contactId))
        .limit(1);

      if (!contact?.email) continue;

      const renderedBody = renderTemplate(step.body, {
        contactName: contact.firstName ?? "",
      });
      const renderedSubject = renderTemplate(step.subject, {
        contactName: contact.firstName ?? "",
      });

      await sendEmail(enrollment.sequenceId, {
        to: contact.email,
        subject: renderedSubject,
        body: renderedBody,
        contactId: enrollment.contactId,
      });

      const nextStep = enrollment.currentStep + 1;
      const [nextStepRow] = await db
        .select({ count: count() })
        .from(emailSequenceSteps)
        .where(
          and(
            eq(emailSequenceSteps.sequenceId, sequence.id),
            sql`${emailSequenceSteps.orderIndex} >= ${nextStep}`
          )
        );

      const hasMoreSteps = (nextStepRow?.count ?? 0) > 0;
      const nextDelayDays = step.delayDays;

      await db
        .update(emailSequenceEnrollments)
        .set({
          currentStep: nextStep,
          nextSendAt: hasMoreSteps
            ? new Date(now.getTime() + nextDelayDays * 86400000)
            : null,
          status: hasMoreSteps ? "pending" : "sent",
          ...(hasMoreSteps ? {} : { completedAt: now }),
        })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));

      await db
        .update(emailSequences)
        .set({ totalSent: sql`${emailSequences.totalSent} + 1` })
        .where(eq(emailSequences.id, sequence.id));

      sent++;
    } catch {
      // one failure should not block others
    }
  }

  return sent;
}

async function sweepBreachedSlas(): Promise<number> {
  let total = 0;
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

  for (const { id: wsId } of allWorkspaces) {
    const breached = await checkBreachedSlas(wsId);
    total += breached.length;

    for (const b of breached) {
      await notifyWorkspace({
        workspaceId: wsId,
        type: "system",
        title: "SLA نقض شد",
        body: `SLA برای ${b.entityType} نقض شده است.`,
        link: "/sla",
      });
    }
  }

  return total;
}

async function processAllDueDeliveries(): Promise<number> {
  let total = 0;
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

  for (const { id: wsId } of allWorkspaces) {
    total += await processDueDeliveries(wsId);
  }

  return total;
}

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

  const recurringInvoicesGenerated = await generateRecurringInvoices();
  const sequenceEmailsSent = await stepEmailSequences();
  const slaBreachesSwept = await sweepBreachedSlas();
  const deliveriesProcessed = await processAllDueDeliveries();

  return {
    remindersProcessed,
    overdueInvoices: overdueRows.length,
    overdueTasks,
    lowStockWorkspaces,
    recurringInvoicesGenerated,
    sequenceEmailsSent,
    slaBreachesSwept,
    deliveriesProcessed,
  };
}
