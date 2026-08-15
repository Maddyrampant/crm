import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aiConversations,
  aiMessages,
  aiToolRuns,
  activityLog,
  type AiRole,
} from "@/db/schema";

export async function listConversations(workspaceId: string, userId: string) {
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.workspaceId, workspaceId),
        eq(aiConversations.userId, userId)
      )
    )
    .orderBy(desc(aiConversations.updatedAt));
}

export async function createConversation(
  workspaceId: string,
  userId: string,
  title = "گفتگوی جدید"
) {
  const [row] = await db
    .insert(aiConversations)
    .values({ workspaceId, userId, title })
    .returning();
  return row;
}

export async function getConversation(
  workspaceId: string,
  conversationId: string
) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!conversation) return null;

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt);
  return { conversation, messages };
}

export async function saveMessage(
  conversationId: string,
  role: AiRole,
  content: string,
  toolCalls?: unknown[],
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    stepCount?: number;
    finishReason?: string;
  }
) {
  const [row] = await db
    .insert(aiMessages)
    .values({
      conversationId,
      role,
      content,
      toolCalls: toolCalls ?? [],
      usage: usage ?? null,
    })
    .returning();
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));
  return row;
}

export async function renameConversation(
  workspaceId: string,
  conversationId: string,
  title: string
) {
  const [row] = await db
    .update(aiConversations)
    .set({ title })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function deleteConversation(
  workspaceId: string,
  conversationId: string
) {
  const [row] = await db
    .delete(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.workspaceId, workspaceId)
      )
    )
    .returning({ id: aiConversations.id });
  return row ?? null;
}

/** درخواست اجرای ابزار — در انتظار تأیید انسانی */
export async function requestToolRun(
  workspaceId: string,
  userId: string,
  conversationId: string,
  toolName: string,
  input: Record<string, unknown>
) {
  const [row] = await db
    .insert(aiToolRuns)
    .values({
      workspaceId,
      conversationId,
      toolName,
      input,
      status: "awaiting_confirmation",
    })
    .returning();
  return row;
}

export async function listPendingToolRuns(workspaceId: string) {
  return db
    .select()
    .from(aiToolRuns)
    .where(
      and(
        eq(aiToolRuns.workspaceId, workspaceId),
        eq(aiToolRuns.status, "awaiting_confirmation")
      )
    )
    .orderBy(desc(aiToolRuns.createdAt));
}

/** تأییدهای در انتظار برای داشبورد */
export async function getPendingApprovals(workspaceId: string, limit = 6) {
  return db
    .select()
    .from(aiToolRuns)
    .where(
      and(
        eq(aiToolRuns.workspaceId, workspaceId),
        eq(aiToolRuns.status, "awaiting_confirmation")
      )
    )
    .orderBy(desc(aiToolRuns.createdAt))
    .limit(limit);
}

export async function approveToolRun(
  workspaceId: string,
  toolRunId: string,
  approverId: string,
  approved: boolean,
  output?: unknown
) {
  const [row] = await db
    .update(aiToolRuns)
    .set({
      status: approved ? "approved" : "rejected",
      approvedBy: approverId,
      output: output ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiToolRuns.id, toolRunId),
        eq(aiToolRuns.workspaceId, workspaceId)
      )
    )
    .returning();

  if (row) {
    await db.insert(activityLog).values({
      workspaceId,
      entityType: "contact",
      entityId: "ai",
      action: approved ? "ai.tool_approved" : "ai.tool_rejected",
      userId: approverId,
      data: { toolName: row.toolName, toolRunId: row.id },
    });
  }
  return row ?? null;
}
