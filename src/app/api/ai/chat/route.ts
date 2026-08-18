import { streamText, toUIMessageStream, createUIMessageStreamResponse, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getActiveWorkspace } from "@/lib/session";
import { getChatModel } from "@/lib/ai/provider";
import { readTools, writeTools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createConversation,
  getConversation,
  saveMessage,
} from "@/services/ai";

/** حداکثر تعداد گام‌های مدل در هر پیام (جلوگیری از حلقه‌های طولانی ابزار) */
const MAX_STEPS = 4;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    return Response.json({ error: "No workspace" }, { status: 403 });
  }
  const workspaceId = membership.workspaceId;
  const userId = session.user.id;

  const rl = await checkRateLimit(`ai:${workspaceId}`, 30, 60_000);
  if (!rl.ok) {
    return Response.json({ error: "درخواست‌ها بیش از حد مجاز است" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: Array<{ role: string; content: string }>;
    conversationId?: string;
    model?: string;
  } | null;
  const messages = body?.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const requestedModel = body?.model?.trim() || undefined;

  let conversationId = body?.conversationId;
  let history = conversationId
    ? await getConversation(workspaceId, conversationId)
    : null;

  if (!history) {
    if (conversationId) {
      await db
        .insert(aiConversations)
        .values({
          id: conversationId,
          workspaceId,
          userId,
          title: lastUser?.content?.slice(0, 60) || "گفتگوی جدید",
        })
        .onConflictDoNothing();
    } else {
      const conv = await createConversation(
        workspaceId,
        userId,
        lastUser?.content?.slice(0, 60) || "گفتگوی جدید"
      );
      conversationId = conv.id;
    }
    history = await getConversation(workspaceId, conversationId);
  }

  if (!history) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const convId = conversationId!;

  if (lastUser?.content) {
    await saveMessage(convId, "user", lastUser.content);
  }

  if (requestedModel) {
    await db
      .update(aiConversations)
      .set({ model: requestedModel })
      .where(eq(aiConversations.id, convId));
  }

  const ctx = { workspaceId, userId, conversationId: convId };

  // بارگذاری مجدد تاریخچه تا پیام جاری کاربر هم در پرامپت مدل باشد
  // (در غیر این صورت در اولین پیام، messages خالی و مدل خطا میدهد)
  const updatedHistory = await getConversation(workspaceId, convId);
  if (!updatedHistory) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const modelId = requestedModel ?? updatedHistory.conversation.model;

  const result = streamText({
    model: getChatModel(modelId),
    system: await buildSystemPrompt(workspaceId),
    messages: updatedHistory.messages.map((m) => ({
      role: m.role === "tool" ? "assistant" : m.role,
      content: m.content ?? "",
    })),
    tools: { ...readTools(ctx), ...writeTools(ctx) },
    stopWhen: stepCountIs(MAX_STEPS),
    maxRetries: 1,
    onFinish: async ({ text, toolResults, usage, steps, finishReason }) => {
      await saveMessage(
        convId,
        "assistant",
        text,
        toolResults.map((r) => ({
          tool: r.toolName,
          input: r.input,
          result: r.output,
        })),
        {
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
          stepCount: steps?.length ?? 0,
          finishReason,
        }
      );
    },
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    tools: { ...readTools(ctx), ...writeTools(ctx) },
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { usage: part.totalUsage, finishReason: part.finishReason };
      }
      return undefined;
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
