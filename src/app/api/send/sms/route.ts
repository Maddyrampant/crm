import { NextRequest } from "next/server";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import { sendSms } from "@/services/automation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    return Response.json({ error: "No workspace" }, { status: 403 });
  }
  if (!hasPermission(membership, "manager")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await checkRateLimit(`sms:${membership.workspaceId}`, 10, 60_000);
  if (!rl.ok) {
    return Response.json({ error: "درخواست‌ها بیش از حد مجاز است" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    to?: string;
    body?: string;
  } | null;
  if (!body?.to) {
    return Response.json({ error: "to is required" }, { status: 422 });
  }

  const result = await sendSms(membership.workspaceId, {
    to: body.to,
    body: body.body ?? "",
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
