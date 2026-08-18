import { NextRequest } from "next/server";
import { handleWooWebhook } from "@/services/woocommerce-sync";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  if (!checkRateLimit(`woo:${storeId}`, 100, 60_000)) {
    return Response.json({ error: "درخواست‌ها بیش از حد مجاز است" }, { status: 429 });
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
    const status = result.error?.includes("یافت نشد") ? 404 : 401;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json({ ok: true });
}
