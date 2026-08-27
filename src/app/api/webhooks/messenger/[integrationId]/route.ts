import { NextRequest } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { messengerIntegrations, messengerMessages, contacts } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;

  const rl = await checkRateLimit(`messenger:${integrationId}`, 30, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const [integration] = await db
    .select()
    .from(messengerIntegrations)
    .where(and(eq(messengerIntegrations.id, integrationId), eq(messengerIntegrations.status, "active")))
    .limit(1);

  if (!integration) {
    return Response.json({ error: "integration not found or inactive" }, { status: 404 });
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = integration.config as Record<string, unknown> | null;
  const webhookSecret = config?.webhookSecret;
  if (typeof webhookSecret === "string" && webhookSecret.length > 0) {
    const signature = req.headers.get("x-messenger-secret") ?? "";
    if (signature !== webhookSecret) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const from = typeof payload.from === "string" ? payload.from : null;
  const content = typeof payload.content === "string" ? payload.content : "";
  const messageId = typeof payload.messageId === "string" ? payload.messageId : null;
  const timestamp = typeof payload.timestamp === "string" ? payload.timestamp : null;

  if (!content) {
    return Response.json({ error: "missing content" }, { status: 400 });
  }

  let contactId: string | null = null;
  if (from) {
    const [match] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, integration.workspaceId),
          or(eq(contacts.phone, from), eq(contacts.email, from))
        )
      )
      .limit(1);
    contactId = match?.id ?? null;
  }

  await db.insert(messengerMessages).values({
    integrationId,
    externalId: messageId,
    direction: "inbound",
    content,
    contactId,
    ...(timestamp ? { createdAt: new Date(timestamp) } : {}),
  });

  return Response.json({ ok: true });
}
