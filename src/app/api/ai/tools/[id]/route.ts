import { NextRequest } from "next/server";
import { getSession, getActiveWorkspace } from "@/lib/session";
import { approveToolRun } from "@/services/ai";
import { executeApprovedTool } from "@/lib/ai/approve";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    return Response.json({ error: "No workspace" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { approved?: boolean } | null;
  const approved = body?.approved === true;

  const run = await approveToolRun(
    membership.workspaceId,
    id,
    session.user.id,
    approved
  );
  if (!run) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let output: unknown = null;
  if (approved) {
    try {
      output = await executeApprovedTool(
        membership.workspaceId,
        session.user.id,
        run
      );
      await approveToolRun(
        membership.workspaceId,
        id,
        session.user.id,
        approved,
        output
      );
    } catch (err) {
      output = { error: err instanceof Error ? err.message : "execution failed" };
    }
  }

  return Response.json({ run: { ...run, output } });
}
