import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/session";
import { getUsageStats, getUsageByDay, getUsageByModel } from "@/services/ai-usage";

export async function GET() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const [stats, byDay, byModel] = await Promise.all([
    getUsageStats(workspaceId),
    getUsageByDay(workspaceId),
    getUsageByModel(workspaceId),
  ]);
  return NextResponse.json({ stats, byDay, byModel });
}
