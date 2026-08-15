import "server-only";
import { db } from "@/db";
import { activityLog, contacts } from "@/db/schema";
import { createTask } from "@/services/tasks";
import { dispatchWebhookEvent } from "@/services/automation";
import type { AiToolRun } from "@/db/schema";

export async function executeApprovedTool(
  workspaceId: string,
  userId: string,
  run: AiToolRun
): Promise<unknown> {
  const input = (run.input ?? {}) as Record<string, unknown>;

  if (run.toolName === "createTask") {
    const task = await createTask(workspaceId, userId, {
      title: String(input.title ?? "تسک"),
      dueAt: input.dueAt ? String(input.dueAt) : undefined,
      priority: (input.priority as "low" | "medium" | "high") ?? "medium",
    });
    return { id: task.id, title: task.title };
  }

  if (run.toolName === "createContact") {
    const [row] = await db
      .insert(contacts)
      .values({
        workspaceId,
        ownerId: userId,
        firstName: String(input.firstName ?? "بدون نام"),
        lastName: input.lastName ? String(input.lastName) : null,
        email: input.email ? String(input.email) : null,
        phone: input.phone ? String(input.phone) : null,
        notes: input.notes ? String(input.notes) : null,
      })
      .returning();

    await db.insert(activityLog).values({
      workspaceId,
      entityType: "contact",
      entityId: row.id,
      action: "contact.created",
      userId,
      data: { name: row.firstName },
    });
    dispatchWebhookEvent(workspaceId, "contact.created", { id: row.id });
    return { id: row.id, name: row.firstName };
  }

  throw new Error(`Unknown tool: ${run.toolName}`);
}
