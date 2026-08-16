"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import * as dealsService from "@/services/deals";
import { logActivity } from "@/services/activity";
import { toDealRow, toKanbanBoardRow } from "@/lib/serialize";

const dealSchema = z.object({
  title: z.string().trim().min(1, "عنوان فروش را وارد کنید").max(200),
  amount: z.coerce.number().min(0, "مبلغ نمی‌تواند منفی باشد").max(1e15),
  pipelineId: z.string().min(1, "فانل فروش انتخاب کنید"),
  stageId: z.string().min(1, "مرحله را انتخاب کنید"),
  contactId: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
  lostReason: z.string().trim().max(1000).nullable().optional(),
});

const listQuerySchema = z.object({
  pipelineId: z.string().nullable().optional(),
  stageId: z.string().nullable().optional(),
  status: z.enum(["open", "won", "lost"]).nullable().optional(),
  ownerId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  closeDateFrom: z.string().nullable().optional(),
  closeDateTo: z.string().nullable().optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function parseDateOnly(value: string | null | undefined, endOfDay: boolean) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

async function getWorkspaceContext() {
  const session = await getSession();
  if (!session?.user) return null;
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return null;
  return { userId: session.user.id, workspaceId: membership.workspaceId, membership };
}

export async function getKanbanBoardAction(pipelineId?: string | null) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const board = await dealsService.getKanbanBoard(ctx.workspaceId, pipelineId);
  return { ok: true, data: toKanbanBoardRow(board) };
}

export async function listDealsAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = listQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const result = await dealsService.listDeals({
    ...parsed.data,
    workspaceId: ctx.workspaceId,
    closeDateFrom: parseDateOnly(parsed.data.closeDateFrom, false),
    closeDateTo: parseDateOnly(parsed.data.closeDateTo, true),
  });

  return {
    ok: true,
    data: {
      items: result.items.map((r) =>
        toDealRow({
          ...r.deal,
          stageName: r.stageName,
          stageColor: r.stageColor,
          contactName: r.contactName,
          contactLastName: r.contactLastName,
          contactEmail: r.contactEmail,
          companyName: r.companyName,
          ownerName: r.ownerName,
        })
      ),
      total: result.total,
    },
  };
}

export async function createDealAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ایجاد فروش ندارید" };
  }

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const deal = await dealsService.createDeal(ctx.workspaceId, {
    title: parsed.data.title,
    amount: parsed.data.amount,
    pipelineId: parsed.data.pipelineId,
    stageId: parsed.data.stageId,
    contactId: parsed.data.contactId ?? null,
    ownerId: parsed.data.ownerId ?? ctx.userId,
    closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
    lostReason: parsed.data.lostReason ?? null,
  });

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: deal.id,
    action: "created",
    userId: ctx.userId,
    data: { title: deal.title },
  });

  revalidatePath("/pipeline");
  return { ok: true, data: toDealRow(deal) };
}

export async function updateDealAction(id: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ویرایش فروش ندارید" };
  }

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const deal = await dealsService.updateDeal(ctx.workspaceId, id, {
    title: parsed.data.title,
    amount: parsed.data.amount,
    pipelineId: parsed.data.pipelineId,
    stageId: parsed.data.stageId,
    contactId: parsed.data.contactId ?? null,
    ownerId: parsed.data.ownerId ?? null,
    closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
    lostReason: parsed.data.lostReason ?? null,
  });

  if (!deal) return { ok: false, error: "فروش یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: id,
    action: "updated",
    userId: ctx.userId,
    data: { title: deal.title },
  });

  revalidatePath("/pipeline");
  return { ok: true, data: toDealRow(deal) };
}

/** انتقال دیل به مرحله دیگر (درگ‌اند‌دراپ). */
export async function moveDealAction(id: string, stageId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه تغییر مرحله فروش را ندارید" };
  }

  const deal = await dealsService.moveDeal(ctx.workspaceId, id, stageId);
  if (!deal) return { ok: false, error: "فروش یافت نشد" };

  return { ok: true, data: toDealRow(deal) };
}

export async function setDealOutcomeAction(
  id: string,
  outcome: "won" | "lost",
  lostReason?: string | null
) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ثبت برد/باخت ندارید" };
  }

  const deal = await dealsService.setDealOutcome(ctx.workspaceId, id, outcome, lostReason);
  if (!deal) return { ok: false, error: "فروش یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: id,
    action: outcome === "won" ? "won" : "lost",
    userId: ctx.userId,
    data: { title: deal.title, lostReason: lostReason ?? null },
  });

  revalidatePath("/pipeline");
  return { ok: true, data: toDealRow(deal) };
}

export async function deleteDealAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف فروش را ندارید" };
  }

  const deleted = await dealsService.deleteDeal(ctx.workspaceId, id);
  if (!deleted) return { ok: false, error: "فروش یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: id,
    action: "deleted",
    userId: ctx.userId,
  });

  revalidatePath("/pipeline");
  return { ok: true };
}
