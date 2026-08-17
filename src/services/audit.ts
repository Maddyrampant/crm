import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(
  workspaceId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  changes?: Record<string, { old: unknown; new: unknown }>
) {
  const [row] = await db
    .insert(auditLogs)
    .values({
      workspaceId,
      userId,
      action,
      entity,
      entityId,
      changes: changes ?? null,
    })
    .returning();
  return row;
}

export async function getAuditLogs(workspaceId: string, entity?: string, entityId?: string) {
  const conditions = [eq(auditLogs.workspaceId, workspaceId)];
  if (entity) conditions.push(eq(auditLogs.entity, entity));
  if (entityId) conditions.push(eq(auditLogs.entityId, entityId));

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);
}
