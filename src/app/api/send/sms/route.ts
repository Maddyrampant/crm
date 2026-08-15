import { NextRequest } from "next/server";
import { getSession, getActiveWorkspace } from "@/lib/session";
import { sendSms } from "@/services/automation";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    return Response.json({ error: "No workspace" }, { status: 403 });
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
