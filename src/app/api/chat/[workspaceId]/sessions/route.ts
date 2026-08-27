import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { liveChatSessions, workspaces } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  const rl = await checkRateLimit(`chat:${workspaceId}`, 20, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) {
    return Response.json({ error: "workspace not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const visitorName = typeof body.visitorName === "string" ? body.visitorName : null;
  const visitorEmail = typeof body.visitorEmail === "string" ? body.visitorEmail : null;

  const [session] = await db
    .insert(liveChatSessions)
    .values({
      workspaceId,
      visitorName,
      visitorEmail,
    })
    .returning();

  return Response.json({ ok: true, id: session.id });
}
