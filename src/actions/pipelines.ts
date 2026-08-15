"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import * as pipelinesService from "@/services/pipelines";
import { logActivity } from "@/services/activity";

async function getWorkspaceContext() {
  const session = await getSession();
  if (!session?.user) return null;
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return null;
  return { userId: session.user.id, workspaceId: membership.workspaceId, membership };
}

export async function listPipelinesAction() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  const pipelines = await pipelinesService.listPipelines(ctx.workspaceId);
  return { ok: true, data: pipelines };
}

const pipelineSchema = z.object({
  name: z.string().trim().min(1, "نام فانل را وارد کنید").max(100),
});

export async function createPipelineAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه ساخت فانل فروش را ندارید" };
  }

  const parsed = pipelineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const pipeline = await pipelinesService.createPipeline(ctx.workspaceId, parsed.data.name);

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: pipeline.id,
    action: "pipeline_created",
    userId: ctx.userId,
    data: { title: pipeline.name },
  });

  revalidatePath("/pipeline");
  return { ok: true, data: pipeline };
}

export async function updatePipelineAction(id: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه ویرایش فانل را ندارید" };
  }

  const parsed = pipelineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const pipeline = await pipelinesService.updatePipeline(ctx.workspaceId, id, parsed.data.name);
  if (!pipeline) return { ok: false, error: "فانل یافت نشد" };

  revalidatePath("/pipeline");
  return { ok: true, data: pipeline };
}

export async function deletePipelineAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف فانل را ندارید" };
  }

  const deleted = await pipelinesService.deletePipeline(ctx.workspaceId, id);
  if (!deleted) return { ok: false, error: "فانل یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "deal",
    entityId: id,
    action: "pipeline_deleted",
    userId: ctx.userId,
  });

  revalidatePath("/pipeline");
  return { ok: true };
}

const stageSchema = z.object({
  name: z.string().trim().min(1, "نام مرحله را وارد کنید").max(100),
  color: z.string().trim().max(20).default("#7367f0"),
  winProbability: z.coerce.number().min(0).max(100).default(0),
});

export async function createStageAction(pipelineId: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه مدیریت مراحل را ندارید" };
  }

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const stage = await pipelinesService.createStage(pipelineId, {
    name: parsed.data.name,
    color: parsed.data.color,
    winProbability: parsed.data.winProbability,
  });
  if (!stage) return { ok: false, error: "فانل یافت نشد" };

  revalidatePath("/pipeline");
  return { ok: true, data: stage };
}

export async function updateStageAction(id: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه مدیریت مراحل را ندارید" };
  }

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const stage = await pipelinesService.updateStage(ctx.workspaceId, id, {
    name: parsed.data.name,
    color: parsed.data.color,
    winProbability: parsed.data.winProbability,
  });
  if (!stage) return { ok: false, error: "مرحله یافت نشد" };

  revalidatePath("/pipeline");
  return { ok: true, data: stage };
}

export async function deleteStageAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه مدیریت مراحل را ندارید" };
  }

  const deleted = await pipelinesService.deleteStage(ctx.workspaceId, id);
  if (!deleted) return { ok: false, error: "مرحله یافت نشد" };

  revalidatePath("/pipeline");
  return { ok: true };
}
