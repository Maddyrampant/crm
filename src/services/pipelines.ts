import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pipelines, stages } from "@/db/schema";

function workspacePipelines(workspaceId: string) {
  return db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.workspaceId, workspaceId));
}

export async function listPipelines(workspaceId: string) {
  const pipelineRows = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.workspaceId, workspaceId));

  const stageRows = await db
    .select()
    .from(stages)
    .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
    .where(eq(pipelines.workspaceId, workspaceId))
    .orderBy(asc(stages.orderIndex));

  return pipelineRows.map((p) => ({
    ...p,
    stages: stageRows
      .filter((s) => s.stages.pipelineId === p.id)
      .map((s) => s.stages),
  }));
}

export async function getPipeline(workspaceId: string, id: string) {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.id, id)))
    .limit(1);

  if (!pipeline) return null;

  const pipelineStages = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, id))
    .orderBy(asc(stages.orderIndex));

  return { ...pipeline, stages: pipelineStages };
}

export async function createPipeline(workspaceId: string, name: string) {
  const existing = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.workspaceId, workspaceId))
    .limit(1);

  const [pipeline] = await db
    .insert(pipelines)
    .values({ workspaceId, name, isDefault: !existing[0] })
    .returning();

  return pipeline;
}

export async function updatePipeline(workspaceId: string, id: string, name: string) {
  const [pipeline] = await db
    .update(pipelines)
    .set({ name })
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.id, id)))
    .returning();

  return pipeline ?? null;
}

export async function deletePipeline(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(pipelines)
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.id, id)))
    .returning({ id: pipelines.id });

  return deleted ?? null;
}

export type StageInput = {
  name: string;
  color: string;
  winProbability: number;
};

export async function createStage(pipelineId: string, input: StageInput) {
  const [pipeline] = await db
    .select({ workspaceId: pipelines.workspaceId })
    .from(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .limit(1);

  if (!pipeline) return null;

  const orderRows = await db
    .select({ orderIndex: stages.orderIndex })
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId));

  const nextOrder = orderRows.reduce(
    (max, row) => Math.max(max, Number(row.orderIndex) || 0),
    -1
  ) + 1;

  const [stage] = await db
    .insert(stages)
    .values({
      pipelineId,
      name: input.name,
      color: input.color,
      winProbability: String(input.winProbability),
      orderIndex: String(nextOrder),
    })
    .returning();

  return stage;
}

export async function updateStage(
  workspaceId: string,
  id: string,
  input: Partial<StageInput>
) {
  const [stage] = await db
    .update(stages)
    .set({
      name: input.name,
      color: input.color,
      winProbability: input.winProbability !== undefined ? String(input.winProbability) : undefined,
    })
    .where(
      and(eq(stages.id, id), inArray(stages.pipelineId, workspacePipelines(workspaceId)))
    )
    .returning();

  return stage ?? null;
}

export async function deleteStage(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(stages)
    .where(and(eq(stages.id, id), inArray(stages.pipelineId, workspacePipelines(workspaceId))))
    .returning({ id: stages.id });

  return deleted ?? null;
}

/** بازچینش مرحله‌ها — ترتیب‌های جدید را ذخیره می‌کند. */
export async function reorderStages(workspaceId: string, orderedStageIds: string[]) {
  for (let i = 0; i < orderedStageIds.length; i++) {
    await db
      .update(stages)
      .set({ orderIndex: String(i) })
      .where(
        and(
          eq(stages.id, orderedStageIds[i]),
          inArray(stages.pipelineId, workspacePipelines(workspaceId))
        )
      );
  }
}
