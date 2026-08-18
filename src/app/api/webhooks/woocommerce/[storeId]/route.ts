import { NextRequest } from "next/server";
import { handleWooWebhook } from "@/services/woocommerce-sync";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  const rl = await checkRateLimit(`webhook:${storeId}`, 30, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const topic = req.headers.get("x-wc-webhook-topic") ?? "";
  const resource = req.headers.get("x-wc-webhook-resource") ?? "";
  const event = req.headers.get("x-wc-webhook-event") ?? "";
  const signature = req.headers.get("x-wc-webhook-signature") ?? "";

  if (!topic || !resource || !event || !signature) {
    return Response.json({ error: "Missing required headers" }, { status: 400 });
  }

  const rawBody = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await handleWooWebhook(
    storeId,
    topic,
    resource,
    event,
    signature,
    rawBody,
    payload
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 401 });
  }

  return Response.json({ ok: true });
}
