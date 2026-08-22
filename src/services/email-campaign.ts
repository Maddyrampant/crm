import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailCampaigns, campaignEmailTemplates, contacts } from "@/db/schema";
import { sendEmail } from "@/services/automation";

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export type CampaignInput = {
  name: string;
  subject: string;
  htmlBody: string;
  plainBody?: string | null;
  recipientType?: string;
  recipientIds?: string[];
};

export async function listCampaigns(workspaceId: string) {
  return db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.workspaceId, workspaceId))
    .orderBy(desc(emailCampaigns.createdAt));
}

export async function getCampaign(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(emailCampaigns)
    .where(and(eq(emailCampaigns.workspaceId, workspaceId), eq(emailCampaigns.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createCampaign(workspaceId: string, input: CampaignInput) {
  const [row] = await db
    .insert(emailCampaigns)
    .values({
      workspaceId,
      name: input.name,
      subject: input.subject,
      htmlBody: input.htmlBody,
      plainBody: input.plainBody ?? null,
      recipientType: input.recipientType ?? "all",
      recipientIds: input.recipientIds ?? null,
    })
    .returning();
  return row;
}

export async function updateCampaign(workspaceId: string, id: string, input: Partial<CampaignInput>) {
  const [row] = await db
    .update(emailCampaigns)
    .set({
      name: input.name,
      subject: input.subject,
      htmlBody: input.htmlBody,
      plainBody: input.plainBody,
      recipientType: input.recipientType,
      recipientIds: input.recipientIds,
      updatedAt: new Date(),
    })
    .where(and(eq(emailCampaigns.workspaceId, workspaceId), eq(emailCampaigns.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteCampaign(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(emailCampaigns)
    .where(and(eq(emailCampaigns.workspaceId, workspaceId), eq(emailCampaigns.id, id)))
    .returning({ id: emailCampaigns.id });
  return deleted ?? null;
}

export async function sendCampaign(workspaceId: string, id: string) {
  const campaign = await getCampaign(workspaceId, id);
  if (!campaign) return null;

  let recipientEmails: string[] = [];
  if (campaign.recipientType === "all") {
    const rows = await db
      .select({ email: contacts.email })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`));
    recipientEmails = rows.map((r) => r.email!);
  } else if (campaign.recipientIds && campaign.recipientIds.length > 0) {
    const rows = await db
      .select({ email: contacts.email })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.id} = ANY(${campaign.recipientIds})`));
    recipientEmails = rows.map((r) => r.email!).filter(Boolean);
  }

  let sentCount = 0;
  const BATCH_SIZE = 5;
  for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
    const batch = recipientEmails.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((email) =>
        sendEmail(workspaceId, {
          to: email,
          subject: campaign.subject,
          body: campaign.htmlBody,
        })
      )
    );
    sentCount += results.filter((r) => r.ok).length;
  }

  const [updated] = await db
    .update(emailCampaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      totalSent: sentCount,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, id))
    .returning();
  return updated;
}

export type CampaignTemplateInput = {
  name: string;
  subject: string;
  htmlBody: string;
  plainBody?: string | null;
  category?: string | null;
};

export async function listTemplates(workspaceId: string) {
  return db
    .select()
    .from(campaignEmailTemplates)
    .where(eq(campaignEmailTemplates.workspaceId, workspaceId))
    .orderBy(desc(campaignEmailTemplates.createdAt));
}

export async function createTemplate(workspaceId: string, input: CampaignTemplateInput) {
  const [row] = await db
    .insert(campaignEmailTemplates)
    .values({
      workspaceId,
      name: input.name,
      subject: input.subject,
      htmlBody: input.htmlBody,
      plainBody: input.plainBody ?? null,
      category: input.category ?? "general",
    })
    .returning();
  return row;
}

export async function deleteTemplate(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(campaignEmailTemplates)
    .where(and(eq(campaignEmailTemplates.workspaceId, workspaceId), eq(campaignEmailTemplates.id, id)))
    .returning({ id: campaignEmailTemplates.id });
  return deleted ?? null;
}

export async function trackOpen(campaignId: string) {
  await db
    .update(emailCampaigns)
    .set({
      totalOpened: sql`${emailCampaigns.totalOpened} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));
}

export async function trackClick(campaignId: string) {
  await db
    .update(emailCampaigns)
    .set({
      totalClicked: sql`${emailCampaigns.totalClicked} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));
}
