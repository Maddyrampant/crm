import { NextRequest } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { liveChatMessages, liveChatSessions } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!sessionId || !content) {
    return Response.json({ error: "sessionId and content are required" }, { status: 400 });
  }

  const rl = await checkRateLimit(`chat-msg:${sessionId}`, 30, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const [session] = await db
    .select({ id: liveChatSessions.id })
    .from(liveChatSessions)
    .where(and(eq(liveChatSessions.id, sessionId), eq(liveChatSessions.workspaceId, workspaceId)))
    .limit(1);

  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const [message] = await db
    .insert(liveChatMessages)
    .values({ sessionId, role: "visitor", content })
    .returning();

  return Response.json({ ok: true, id: message.id });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("sessionId");
  const after = searchParams.get("after");

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const [session] = await db
    .select({ id: liveChatSessions.id })
    .from(liveChatSessions)
    .where(and(eq(liveChatSessions.id, sessionId), eq(liveChatSessions.workspaceId, workspaceId)))
    .limit(1);

  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const conditions = [eq(liveChatMessages.sessionId, sessionId)];
  if (after) {
    const afterDate = new Date(after);
    if (!isNaN(afterDate.getTime())) {
      conditions.push(gt(liveChatMessages.createdAt, afterDate));
    }
  }

  const messages = await db
    .select()
    .from(liveChatMessages)
    .where(and(...conditions))
    .orderBy(liveChatMessages.createdAt)
    .limit(100);

  return Response.json({ messages });
}
