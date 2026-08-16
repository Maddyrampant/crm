"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from "@/services/appointments";
import {
  createTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
} from "@/services/tasks";

export async function createAppointmentAction(raw: unknown) {
  const { user, workspaceId } = await requireWorkspace();
  const row = await createAppointment(workspaceId, user.id, raw);
  revalidatePath("/calendar");
  return { ok: true, id: row.id };
}

export async function updateAppointmentAction(
  appointmentId: string,
  raw: unknown
) {
  const { workspaceId } = await requireWorkspace();
  const row = await updateAppointment(
    workspaceId,
    appointmentId,
    raw as Parameters<typeof updateAppointment>[2]
  );
  revalidatePath("/calendar");
  return { ok: Boolean(row) };
}

export async function deleteAppointmentAction(appointmentId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await deleteAppointment(workspaceId, appointmentId);
  revalidatePath("/calendar");
  return { ok: Boolean(row) };
}

export async function createTaskAction(raw: unknown) {
  const { user, workspaceId } = await requireWorkspace();
  const row = await createTask(workspaceId, user.id, raw);
  revalidatePath("/calendar");
  return { ok: true, id: row.id };
}

export async function updateTaskAction(taskId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspace();
  const row = await updateTask(
    workspaceId,
    taskId,
    raw as Parameters<typeof updateTask>[2]
  );
  revalidatePath("/calendar");
  return { ok: Boolean(row) };
}

export async function updateTaskStatusAction(
  taskId: string,
  status: "open" | "in_progress" | "done" | "cancelled"
) {
  const { workspaceId } = await requireWorkspace();
  const row = await updateTaskStatus(workspaceId, taskId, status);
  revalidatePath("/calendar");
  return { ok: Boolean(row) };
}

export async function deleteTaskAction(taskId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await deleteTask(workspaceId, taskId);
  revalidatePath("/calendar");
  return { ok: Boolean(row) };
}
