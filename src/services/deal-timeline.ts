import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, notes } from "@/db/schema";

export type TimelineEntry = {
  id: string;
  type: "activity" | "note";
  title: string;
  detail: string | null;
  createdAt: Date;
};

/** تایم‌لاین یک دیل: فعالیتها + یادداشتها */
export async function getDealTimeline(
  workspaceId: string,
  dealId: string
): Promise<TimelineEntry[]> {
  const [activities, dealNotes] = await Promise.all([
    db
      .select({
        id: activityLog.id,
        title: activityLog.action,
        detail: sql<string>`coalesce(${activityLog.data}->>'detail', ${activityLog.action})`,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.workspaceId, workspaceId),
          eq(activityLog.entityType, "deal"),
          eq(activityLog.entityId, dealId)
        )
      ),

    db
      .select({
        id: notes.id,
        title: sql<string>`'یادداشت'`,
        detail: notes.body,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .where(
        and(eq(notes.workspaceId, workspaceId), eq(notes.entityId, dealId))
      ),
  ]);

  const entries: TimelineEntry[] = [
    ...activities.map((a) => ({ ...a, type: "activity" as const })),
    ...dealNotes.map((n) => ({ ...n, type: "note" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return entries;
}
