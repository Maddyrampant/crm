import "server-only";

import { and, count, desc, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  contacts,
  invoices,
  notifications,
  reminders,
  tasks,
  workspaceMembers,
  type Notification,
  type NotificationType,
} from "@/db/schema";
import { sendEmail, sendSms } from "./automation";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

export type NotificationInput = {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Record<string, unknown>;
};

/** ایجاد اعلان برای یک کاربر مشخص. */
export async function createNotification(
  input: NotificationInput
): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      data: input.data ?? {},
    })
    .returning();
  return row;
}

/** اعلان دسته‌ای برای همه اعضای ورک‌اسپیس (بدون userId). */
export async function notifyWorkspace(
  input: Omit<NotificationInput, "userId">
) {
  const members = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));
  if (members.length === 0) return 0;

  const rows = await db
    .insert(notifications)
    .values(
      members.map((m) => ({
        workspaceId: input.workspaceId,
        userId: m.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        data: input.data ?? {},
      }))
    )
    .returning();
  return rows.length;
}

/** فهرست اعلان‌های یک کاربر — جدیدترین اول. */
export async function listNotifications(
  workspaceId: string,
  userId: string,
  params?: { page?: number; pageSize?: number; type?: string }
): Promise<PaginatedResult<Notification>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions = [
    eq(notifications.workspaceId, workspaceId),
    eq(notifications.userId, userId),
  ];
  if (params?.type) {
    conditions.push(eq(notifications.type, params.type as typeof notifications.$inferSelect.type));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(notifications)
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

/** علامت‌گذاری یک اعلان به‌عنوان خوانده. */
export async function markNotificationRead(
  workspaceId: string,
  userId: string,
  notificationId: string
) {
  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId)
      )
    )
    .returning({ id: notifications.id });
  return row ?? null;
}

/** علامت‌گذاری همه اعلان‌های یک کاربر به‌عنوان خوانده. */
export async function markAllNotificationsRead(
  workspaceId: string,
  userId: string
) {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      )
    )
    .returning({ id: notifications.id });
  return rows.length;
}

/** تعداد اعلان‌های خوانده‌نشده یک کاربر. */
export async function getUnreadNotificationsCount(
  workspaceId: string,
  userId: string
): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      )
    );
  return Number(row?.value ?? 0);
}

/** فاکتورهای سررسیدشده را علامت‌گذاری و به تیم اعلان بده — خروجی تعداد جدید. */
export async function processOverdueInvoices(): Promise<number> {
  const now = new Date();
  const overdue = await db
    .select({ id: invoices.id, workspaceId: invoices.workspaceId })
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["draft", "sent"]),
        lte(invoices.dueAt, now)
      )
    );

  const byWorkspace = new Map<string, string[]>();
  for (const inv of overdue) {
    const list = byWorkspace.get(inv.workspaceId) ?? [];
    list.push(inv.id);
    byWorkspace.set(inv.workspaceId, list);
  }

  let count = 0;
  for (const [workspaceId, ids] of byWorkspace) {
    const updated = await db
      .update(invoices)
      .set({ status: "overdue", updatedAt: now })
      .where(and(inArray(invoices.id, ids), ne(invoices.status, "overdue")))
      .returning({ id: invoices.id });
    if (updated.length === 0) continue;
    count += updated.length;
    await notifyWorkspace({
      workspaceId,
      type: "invoice",
      title: "فاکتورهای سررسید‌شده",
      body: `${updated.length} فاکتور سررسید شده است و نیاز به پیگیری دارد.`,
      link: "/invoices",
      data: { count: updated.length },
    });
  }
  return count;
}

/** پردازش یادآورهای سررسیدشده — اعلان درون‌برنامه‌ای + ایمیل/پیامک — خروجی تعداد پردازش‌شده. */
export async function processDueReminders(): Promise<number> {
  const now = new Date();
  const due = await db
    .select()
    .from(reminders)
    .where(and(lte(reminders.remindAt, now), isNull(reminders.sentAt)))
    .limit(50);

  let processed = 0;
  for (const reminder of due) {
    const marked = await db
      .update(reminders)
      .set({ sentAt: now })
      .where(and(eq(reminders.id, reminder.id), isNull(reminders.sentAt)))
      .returning({ id: reminders.id });
    if (marked.length === 0) continue;

    let userId: string | null = null;
    let title = "یادآور";
    let contactId: string | null = null;

    if (reminder.taskId) {
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, reminder.taskId))
        .limit(1);
      if (task) {
        userId = task.userId;
        title = `یادآور تسک: ${task.title}`;
        contactId = task.contactId;
      }
    } else if (reminder.appointmentId) {
      const [appt] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, reminder.appointmentId))
        .limit(1);
      if (appt) {
        userId = appt.userId;
        title = `یادآور قرار ملاقات: ${appt.title}`;
        contactId = appt.contactId;
      }
    }

    if (userId) {
      await createNotification({
        workspaceId: reminder.workspaceId,
        userId,
        type: "appointment",
        title,
        body: reminder.channel === "in_app" ? "یادآوری در برنامه" : undefined,
        link: "/calendar",
        data: { reminderId: reminder.id, channel: reminder.channel },
      });
    }

    if (reminder.channel !== "in_app" && contactId) {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);
      if (contact) {
        if (reminder.channel === "email" && contact.email) {
          await sendEmail(reminder.workspaceId, {
            to: contact.email,
            subject: title,
            body: title,
            contactId,
          });
        } else if (reminder.channel === "sms" && contact.phone) {
          await sendSms(reminder.workspaceId, {
            to: contact.phone,
            body: title,
            contactId,
          });
        }
      }
    }

    processed++;
  }
  return processed;
}
