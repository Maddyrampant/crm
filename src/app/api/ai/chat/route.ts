import { streamText, toUIMessageStream, createUIMessageStreamResponse } from "ai";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getActiveWorkspace } from "@/lib/session";
import { getChatModel } from "@/lib/ai/provider";
import { readTools, writeTools } from "@/lib/ai/tools";
import {
  createConversation,
  getConversation,
  saveMessage,
} from "@/services/ai";

const SYSTEM_PROMPT = `تو دستیار هوش مصنوعی CRM فارسی هستی. کاربرها را با زبان فارسی و لحن حرفه‌ای راهنمایی می‌کنی.

قوانین:
- اطلاعات را بر اساس ابزارهای موجود از پایگاه داده بخوان و گزارش کن؛ هرگز عدد را حدس نزن.
- عملیات نوشتنی (ساخت مخاطب یا تسک) ابتدا به‌صورت درخواست تأیید ثبت می‌شوند؛ اگر نتیجه ابزار needsApproval=true بود، به کاربر اطلاع بده که عملیات در انتظار تأیید اوست و در پنل «در انتظار تأیید» قابل تأیید است.
- در پاسخ‌های عددی از اعداد فارسی استفاده کن.
- اگر ابزار خطا داد یا داده‌ای نبود، صادقانه بگو.`;

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

  const body = (await req.json().catch(() => null)) as {
    messages?: Array<{ role: string; content: string }>;
    conversationId?: string;
  } | null;
  const messages = body?.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

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

  const ctx = { workspaceId, userId, conversationId: convId };

  const result = streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    messages: history.messages.map((m) => ({
      role: m.role === "tool" ? "assistant" : m.role,
      content: m.content ?? "",
    })),
    tools: { ...readTools(ctx), ...writeTools(ctx) },
    maxRetries: 1,
    onFinish: async ({ text, toolResults }) => {
      await saveMessage(
        convId,
        "assistant",
        text,
        toolResults.map((r) => ({
          tool: r.toolName,
          input: r.input,
          result: r.output,
        }))
      );
    },
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    tools: { ...readTools(ctx), ...writeTools(ctx) },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
