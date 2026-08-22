import { NextResponse } from "next/server";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import { renameConversation, deleteConversation } from "@/services/ai";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspaceRole("manager");
  const body = await req.json();
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const row = await renameConversation(workspaceId, id, body.title.trim());
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteConversation(workspaceId, id);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
