import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messengerIntegrations, messengerMessages } from "@/db/schema";
import { logAudit } from "@/services/audit";

export type MessengerIntegrationRow = typeof messengerIntegrations.$inferSelect;

export async function listIntegrations(workspaceId: string) {
  return db.select().from(messengerIntegrations).where(eq(messengerIntegrations.workspaceId, workspaceId)).orderBy(desc(messengerIntegrations.createdAt));
}

export async function getIntegration(workspaceId: string, id: string) {
  const [row] = await db.select().from(messengerIntegrations).where(and(eq(messengerIntegrations.id, id), eq(messengerIntegrations.workspaceId, workspaceId))).limit(1);
  return row ?? null;
}

export async function createIntegration(workspaceId: string, input: { channel: "whatsapp" | "telegram" | "instagram" | "other"; name: string; config?: Record<string, unknown> }) {
  const [row] = await db.insert(messengerIntegrations).values({ workspaceId, channel: input.channel, name: input.name, config: input.config ?? {} }).returning();
  void logAudit(workspaceId, null, "create", "messenger_integration", row.id).catch(() => {});
  return row;
}

export async function updateIntegration(workspaceId: string, id: string, input: Partial<{ name: string; config: Record<string, unknown>; status: "active" | "inactive" }>) {
  const [row] = await db.update(messengerIntegrations).set({ ...input, updatedAt: new Date() }).where(and(eq(messengerIntegrations.id, id), eq(messengerIntegrations.workspaceId, workspaceId))).returning();
  return row ?? null;
}

export async function deleteIntegration(workspaceId: string, id: string) {
  const [row] = await db.delete(messengerIntegrations).where(and(eq(messengerIntegrations.id, id), eq(messengerIntegrations.workspaceId, workspaceId))).returning({ id: messengerIntegrations.id });
  if (row) void logAudit(workspaceId, null, "delete", "messenger_integration", id).catch(() => {});
  return row ?? null;
}

export async function logMessengerMessage(integrationId: string, input: { externalId?: string; direction: string; content: string; contactId?: string }) {
  const [row] = await db.insert(messengerMessages).values({ integrationId, externalId: input.externalId ?? null, direction: input.direction, content: input.content, contactId: input.contactId ?? null }).returning();
  return row;
}

export async function listMessengerMessages(integrationId: string) {
  return db.select().from(messengerMessages).where(eq(messengerMessages.integrationId, integrationId)).orderBy(messengerMessages.createdAt);
}
