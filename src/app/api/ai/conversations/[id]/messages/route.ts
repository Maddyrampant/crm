import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { getConversation } from "@/services/ai";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspace();
  const result = await getConversation(workspaceId, id);
  if (!result) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ messages: result.messages });
}
