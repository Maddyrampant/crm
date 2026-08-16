import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, appointments } from "@/db/schema";
import { dispatchWebhookEvent } from "./automation";
import { createNotification } from "./notifications";
import { dispatchRuleEvent } from "./rules";

const appointmentSchema = z.object({
  title: z.string().trim().min(1, "عنوان را وارد کنید").max(200),
  contactId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  type: z
    .enum(["meeting", "call", "follow_up", "demo", "other"])
    .default("meeting"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export async function listAppointments(
  workspaceId: string,
  range?: { from: Date; to: Date }
) {
  const query = db
    .select()
    .from(appointments)
    .where(eq(appointments.workspaceId, workspaceId));

  if (range) {
    return db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.workspaceId, workspaceId),
          gte(appointments.startsAt, range.from),
          lte(appointments.startsAt, range.to)
        )
      )
      .orderBy(appointments.startsAt);
  }
  return query.orderBy(desc(appointments.startsAt));
}

export async function createAppointment(
  workspaceId: string,
  userId: string,
  raw: unknown
) {
  const input = appointmentSchema.parse(raw);
  const [row] = await db
    .insert(appointments)
    .values({
      workspaceId,
      title: input.title,
      contactId: input.contactId || null,
      userId: input.userId || null,
      type: input.type,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      notes: input.notes || null,
    })
    .returning();

  await db.insert(activityLog).values({
    workspaceId,
    entityType: "appointment",
    entityId: row.id,
    action: "appointment.created",
    userId,
    data: { title: row.title },
  });
  dispatchWebhookEvent(workspaceId, "appointment.created", { id: row.id });
  dispatchRuleEvent(workspaceId, "appointment.created", {
    entityId: row.id,
    appointmentId: row.id,
    title: row.title,
    type: row.type,
    startsAt: row.startsAt.toISOString(),
    contactId: row.contactId,
    userId: row.userId,
    link: "/calendar",
  });
  if (row.userId) {
    await createNotification({
      workspaceId,
      userId: row.userId,
      type: "appointment",
      title: "قرار ملاقات جدید برای شما",
      body: row.title,
      link: "/calendar",
      data: { appointmentId: row.id, startsAt: row.startsAt.toISOString() },
    });
  }
  return row;
}

export async function updateAppointment(
  workspaceId: string,
  appointmentId: string,
  raw: Partial<AppointmentInput>
) {
  const input = appointmentSchema.partial().parse(raw);
  const [row] = await db
    .update(appointments)
    .set({
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function deleteAppointment(
  workspaceId: string,
  appointmentId: string
) {
  const [row] = await db
    .delete(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.workspaceId, workspaceId)
      )
    )
    .returning({ id: appointments.id });
  return row ?? null;
}
