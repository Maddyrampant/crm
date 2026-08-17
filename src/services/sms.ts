import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { smsCampaigns } from "@/db/schema";

export type SmsCampaignInput = {
  name: string;
  message: string;
  recipientType?: string;
  recipientIds?: string[];
};

export async function listSmsCampaigns(workspaceId: string) {
  return db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.workspaceId, workspaceId))
    .orderBy(desc(smsCampaigns.createdAt));
}

export async function getSmsCampaign(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(smsCampaigns)
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createSmsCampaign(workspaceId: string, input: SmsCampaignInput) {
  const [row] = await db
    .insert(smsCampaigns)
    .values({
      workspaceId,
      name: input.name,
      message: input.message,
      recipientType: input.recipientType ?? "all",
      recipientIds: input.recipientIds ?? null,
    })
    .returning();
  return row;
}

export async function updateSmsCampaign(workspaceId: string, id: string, input: Partial<SmsCampaignInput>) {
  const [row] = await db
    .update(smsCampaigns)
    .set({
      name: input.name,
      message: input.message,
      recipientType: input.recipientType,
      recipientIds: input.recipientIds,
    })
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteSmsCampaign(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(smsCampaigns)
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .returning({ id: smsCampaigns.id });
  return deleted ?? null;
}

export async function sendSmsCampaign(workspaceId: string, id: string) {
  const [updated] = await db
    .update(smsCampaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      totalSent: sql`${smsCampaigns.totalSent}`,
    })
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .returning();
  return updated ?? null;
}
