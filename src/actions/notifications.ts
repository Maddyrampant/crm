"use server";

import { requireWorkspace } from "@/lib/session";
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

export async function listNotificationsAction(params?: {
  page?: number;
  pageSize?: number;
  type?: string;
}) {
  const { user, workspaceId } = await requireWorkspace();
  const [result, unread] = await Promise.all([
    listNotifications(workspaceId, user.id, params),
    getUnreadNotificationsCount(workspaceId, user.id),
  ]);
  return { items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages, unread };
}

export async function markNotificationReadAction(notificationId: string) {
  const { user, workspaceId } = await requireWorkspace();
  const row = await markNotificationRead(
    workspaceId,
    user.id,
    notificationId
  );
  return { ok: Boolean(row) };
}

export async function markAllNotificationsReadAction() {
  const { user, workspaceId } = await requireWorkspace();
  const count = await markAllNotificationsRead(workspaceId, user.id);
  return { ok: true, count };
}

export async function getUnreadNotificationsCountAction() {
  const { user, workspaceId } = await requireWorkspace();
  return { unread: await getUnreadNotificationsCount(workspaceId, user.id) };
}
