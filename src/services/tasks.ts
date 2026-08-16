import {
  and,
  asc,
  desc,
  eq,
  isNull,
  lte,
  ne,
  or,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, tasks } from "@/db/schema";
import { dispatchWebhookEvent } from "./automation";
import { createNotification } from "./notifications";

const taskSchema = z.object({
  title: z.string().trim().min(1, "عنوان را وارد کنید").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  contactId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).default("open"),
});

export type TaskInput = z.infer<typeof taskSchema>;

export async function listTasks(workspaceId: string, openOnly = false) {
  const query = db
    .select()
    .from(tasks)
    .where(
      openOnly
        ? and(
            eq(tasks.workspaceId, workspaceId),
            eq(tasks.status, "open")
          )
        : eq(tasks.workspaceId, workspaceId)
    );
  return query.orderBy(desc(tasks.dueAt));
}

/** وظایف سررسید‌شده یا امروز (برای داشبورد) */
export async function getDueTasks(workspaceId: string, limit = 8) {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        ne(tasks.status, "done"),
        ne(tasks.status, "cancelled"),
        or(isNull(tasks.dueAt), lte(tasks.dueAt, endOfDay))
      )
    )
    .orderBy(asc(tasks.dueAt))
    .limit(limit);
}

export async function createTask(workspaceId: string, userId: string, raw: unknown) {
  const input = taskSchema.parse(raw);
  const [row] = await db
    .insert(tasks)
    .values({
      workspaceId,
      title: input.title,
      description: input.description || null,
      contactId: input.contactId || null,
      userId: input.userId || null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      priority: input.priority,
      status: input.status,
    })
    .returning();

  await db.insert(activityLog).values({
    workspaceId,
    entityType: "task",
    entityId: row.id,
    action: "task.created",
    userId,
    data: { title: row.title },
  });
  dispatchWebhookEvent(workspaceId, "task.created", { id: row.id });
  if (row.userId) {
    await createNotification({
      workspaceId,
      userId: row.userId,
      type: "task",
      title: "تسک جدید به شما واگذار شد",
      body: row.title,
      link: "/calendar",
      data: { taskId: row.id, priority: row.priority },
    });
  }
  return row;
}

export async function updateTaskStatus(
  workspaceId: string,
  taskId: string,
  status: TaskInput["status"]
) {
  const [row] = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();
  if (row) {
    dispatchWebhookEvent(workspaceId, "task.status_changed", {
      id: row.id,
      status,
    });
  }
  return row ?? null;
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  raw: Partial<TaskInput>
) {
  const input = taskSchema.partial().parse(raw);
  const [row] = await db
    .update(tasks)
    .set({
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteTask(workspaceId: string, taskId: string) {
  const [row] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning({ id: tasks.id });
  return row ?? null;
}
