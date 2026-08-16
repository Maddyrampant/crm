import { getSession, getActiveWorkspace } from "@/lib/session";
import { listPendingToolRuns } from "@/services/ai";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    return Response.json({ error: "No workspace" }, { status: 403 });
  }

  const runs = await listPendingToolRuns(membership.workspaceId);
  return Response.json({ runs });
}
