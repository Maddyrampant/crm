"use server";

import { requireWorkspaceRole } from "@/lib/session";
import { getAuditLogs } from "@/services/audit";

export async function getAuditLogsAction(entity?: string, entityId?: string) {
  const { workspaceId } = await requireWorkspaceRole("admin");
  const data = await getAuditLogs(workspaceId, entity, entityId);
  return { ok: true, data };
}
