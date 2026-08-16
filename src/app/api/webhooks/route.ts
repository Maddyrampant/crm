import { NextRequest } from "next/server";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { verifyApiKey } from "@/services/automation";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const workspaceId = await verifyApiKey(token);
  if (!workspaceId) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await db.insert(activityLog).values({
    workspaceId,
    entityType: "email",
    entityId: "webhook",
    action: "webhook.inbound",
    data: { event: body.event ?? "unknown", payload: body },
  });

  return Response.json({ ok: true, receivedAt: new Date().toISOString() });
}
