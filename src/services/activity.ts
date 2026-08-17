import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, notes, type ActivityLog } from "@/db/schema";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

export type ActivityEntity = ActivityLog["entityType"];

type LogActivityInput = {
  workspaceId: string;
  entityType: ActivityEntity;
  entityId: string;
  action: string;
  userId?: string | null;
  data?: Record<string, unknown>;
};

/**
 * ثبت رویداد در لاگ فعالیت (append-only audit log).
 * سرویس مشترک — هر دو بخش (۱ و ۲) از همین تابع استفاده می‌کنند.
 */
export async function logActivity(input: LogActivityInput): Promise<ActivityLog> {
  const [log] = await db
    .insert(activityLog)
    .values({
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.userId ?? null,
      data: input.data ?? {},
    })
    .returning();

  return log;
}

type ActivityFeedOptions = {
  workspaceId: string;
  entityType?: ActivityEntity;
  entityId?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

/** فید فعالیت یک موجودیت (یا کل ورک‌اسپیس) — جدیدترین اول. */
export async function getActivityFeed(
  options: ActivityFeedOptions
): Promise<PaginatedResult<ActivityLog>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize ?? options.limit);
  const offset = calculateOffset(page, pageSize);

  const conditions = [eq(activityLog.workspaceId, options.workspaceId)];
  if (options.entityType) conditions.push(eq(activityLog.entityType, options.entityType));
  if (options.entityId) conditions.push(eq(activityLog.entityId, options.entityId));
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(activityLog)
      .where(where)
      .orderBy(desc(activityLog.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(activityLog)
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

/** افزودن یادداشت به یک موجودیت. */
export async function addNote(input: {
  workspaceId: string;
  entityType: ActivityEntity;
  entityId: string;
  authorId: string;
  body: string;
}) {
  const [note] = await db
    .insert(notes)
    .values({
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorId: input.authorId,
      body: input.body,
    })
    .returning();

  return note;
}

/** فهرست یادداشت‌های یک موجودیت. */
export async function getNotes(input: {
  workspaceId: string;
  entityType: ActivityEntity;
  entityId: string;
}) {
  return db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.workspaceId, input.workspaceId),
        eq(notes.entityType, input.entityType),
        eq(notes.entityId, input.entityId)
      )
    )
    .orderBy(desc(notes.createdAt));
}
