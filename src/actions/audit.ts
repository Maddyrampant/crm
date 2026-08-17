"use server";

import { requireWorkspace } from "@/lib/session";
import { getAuditLogs } from "@/services/audit";

export async function getAuditLogsAction(entity?: string, entityId?: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await getAuditLogs(workspaceId, entity, entityId);
  return { ok: true, data };
}
