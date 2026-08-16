"use server";

import { requireWorkspace } from "@/lib/session";
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

export async function listNotificationsAction(limit = 20) {
  const { user, workspaceId } = await requireWorkspace();
  const [items, unread] = await Promise.all([
    listNotifications(workspaceId, user.id, limit),
    getUnreadNotificationsCount(workspaceId, user.id),
  ]);
  return { items, unread };
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
