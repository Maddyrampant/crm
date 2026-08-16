import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, contacts, deals, pipelines, stages } from "@/db/schema";
import { createTask } from "@/services/tasks";
import { createInvoice } from "@/services/invoices";
import {
  dispatchWebhookEvent,
  sendEmail,
  sendSms,
} from "@/services/automation";
import type { AiToolRun } from "@/db/schema";

export async function executeApprovedTool(
  workspaceId: string,
  userId: string,
  run: AiToolRun
): Promise<unknown> {
  const input = (run.input ?? {}) as Record<string, unknown>;

  if (run.toolName === "createTask") {
    const task = await createTask(workspaceId, userId, {
      title: String(input.title ?? "تسک"),
      dueAt: input.dueAt ? String(input.dueAt) : undefined,
      priority: (input.priority as "low" | "medium" | "high") ?? "medium",
    });
    return { id: task.id, title: task.title };
  }

  if (run.toolName === "createContact") {
    const [row] = await db
      .insert(contacts)
      .values({
        workspaceId,
        ownerId: userId,
        firstName: String(input.firstName ?? "بدون نام"),
        lastName: input.lastName ? String(input.lastName) : null,
        email: input.email ? String(input.email) : null,
        phone: input.phone ? String(input.phone) : null,
        notes: input.notes ? String(input.notes) : null,
      })
      .returning();

    await db.insert(activityLog).values({
      workspaceId,
      entityType: "contact",
      entityId: row.id,
      action: "contact.created",
      userId,
      data: { name: row.firstName },
    });
    dispatchWebhookEvent(workspaceId, "contact.created", { id: row.id });
    return { id: row.id, name: row.firstName };
  }

  if (run.toolName === "createDeal") {
    const [stage] = await db
      .select({ id: stages.id, pipelineId: stages.pipelineId })
      .from(stages)
      .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
      .where(
        and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.isDefault, true))
      )
      .orderBy(asc(stages.orderIndex))
      .limit(1);
    if (!stage) throw new Error("فانل فروشی برای ورک‌اسپیس تعریف نشده است");

    const [row] = await db
      .insert(deals)
      .values({
        workspaceId,
        pipelineId: stage.pipelineId,
        stageId: stage.id,
        title: String(input.title),
        amount: String(input.amount ?? 0),
        contactId: input.contactId ? String(input.contactId) : null,
        closeDate: input.closeDate ? new Date(String(input.closeDate)) : null,
      })
      .returning();

    await db.insert(activityLog).values({
      workspaceId,
      entityType: "deal",
      entityId: row.id,
      action: "deal.created",
      userId,
      data: { title: row.title },
    });
    dispatchWebhookEvent(workspaceId, "deal.created", { id: row.id });
    return { id: row.id, title: row.title };
  }

  if (run.toolName === "updateDealStage") {
    const [stage] = await db
      .select({ id: stages.id })
      .from(stages)
      .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
      .where(
        and(
          eq(pipelines.workspaceId, workspaceId),
          eq(stages.name, String(input.stageName ?? ""))
        )
      )
      .limit(1);
    if (!stage) throw new Error("مرحله موردنظر یافت نشد");

    const [row] = await db
      .update(deals)
      .set({ stageId: stage.id, updatedAt: new Date() })
      .where(
        and(eq(deals.id, String(input.dealId ?? "")), eq(deals.workspaceId, workspaceId))
      )
      .returning();
    if (!row) throw new Error("فرصت فروش یافت نشد");

    await db.insert(activityLog).values({
      workspaceId,
      entityType: "deal",
      entityId: row.id,
      action: "deal.stage_changed",
      userId,
      data: { stage: input.stageName },
    });
    dispatchWebhookEvent(workspaceId, "deal.stage_changed", { id: row.id });
    return { id: row.id };
  }

  if (run.toolName === "createInvoice") {
    const items = Array.isArray(input.items)
      ? (input.items as Array<Record<string, unknown>>).map((it) => ({
          description: String(it.description),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRate: Number(it.taxRate ?? 0),
        }))
      : [];
    const invoice = await createInvoice(workspaceId, userId, {
      contactId: String(input.contactId),
      dueAt: input.dueAt ? String(input.dueAt) : undefined,
      discount: Number(input.discount ?? 0),
      taxRate: Number(input.taxRate ?? 0),
      notes: input.notes ? String(input.notes) : undefined,
      items,
    });
    return { id: invoice.id, number: invoice.number, total: invoice.total };
  }

  if (run.toolName === "sendEmail") {
    return sendEmail(workspaceId, {
      to: String(input.to),
      subject: String(input.subject),
      body: String(input.body),
      contactId: input.contactId ? String(input.contactId) : undefined,
    });
  }

  if (run.toolName === "sendSms") {
    return sendSms(workspaceId, {
      to: String(input.to),
      body: String(input.body),
      contactId: input.contactId ? String(input.contactId) : undefined,
    });
  }

  throw new Error(`Unknown tool: ${run.toolName}`);
}
