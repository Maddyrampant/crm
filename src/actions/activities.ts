"use server";

import { requireWorkspace } from "@/lib/session";
import { getDealTimeline } from "@/services/deal-timeline";
import { getStalledDeals } from "@/services/forecast";

export async function getDealTimelineAction(dealId: string) {
  const { workspaceId } = await requireWorkspace();
  return getDealTimeline(workspaceId, dealId);
}

export async function getOverdueFollowUpsAction(daysThreshold = 14) {
  const { workspaceId } = await requireWorkspace();
  return getStalledDeals(workspaceId, daysThreshold);
}
