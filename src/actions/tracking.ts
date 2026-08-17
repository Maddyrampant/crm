"use server";

import { requireWorkspace } from "@/lib/session";
import { getTrackingStats } from "@/services/tracking";

export async function getTrackingStatsAction(entityType?: string, entityId?: string) {
  const { workspaceId } = await requireWorkspace();
  return getTrackingStats(workspaceId, entityType, entityId);
}
