import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { smsCampaigns, contacts } from "@/db/schema";
import { sendSms } from "./automation";

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
  const campaign = await getSmsCampaign(workspaceId, id);
  if (!campaign) return null;

  const [updating] = await db
    .update(smsCampaigns)
    .set({ status: "sending" })
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .returning();
  if (!updating) return null;

  let targetContacts: { id: string; phone: string | null }[] = [];

  if (campaign.recipientType === "specific" && campaign.recipientIds?.length) {
    targetContacts = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          inArray(contacts.id, campaign.recipientIds as string[])
        )
      );
  } else if (campaign.recipientType === "segment" && campaign.recipientIds?.length) {
    targetContacts = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          inArray(contacts.id, campaign.recipientIds as string[])
        )
      );
  } else {
    targetContacts = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId));
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const contact of targetContacts) {
    if (!contact.phone) {
      totalFailed++;
      continue;
    }
    try {
      const result = await sendSms(workspaceId, {
        to: contact.phone,
        body: campaign.message,
        contactId: contact.id,
      });
      if (result.ok) {
        totalSent++;
      } else {
        totalFailed++;
      }
    } catch {
      totalFailed++;
    }
  }

  const [result] = await db
    .update(smsCampaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      totalSent,
    })
    .where(and(eq(smsCampaigns.workspaceId, workspaceId), eq(smsCampaigns.id, id)))
    .returning();
  return result ?? null;
}
