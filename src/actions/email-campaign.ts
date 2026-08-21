"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import * as emailCampaignService from "@/services/email-campaign";

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1),
  plainBody: z.string().nullable().optional(),
  recipientType: z.string().max(50).optional(),
  recipientIds: z.array(z.string()).optional(),
});

const campaignTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1),
  plainBody: z.string().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
});

export async function listCampaignsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await emailCampaignService.listCampaigns(workspaceId);
  return { ok: true, data };
}

export async function getCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await emailCampaignService.getCampaign(workspaceId, id);
  if (!data) return { ok: false, error: "کمپین یافت نشد" };
  return { ok: true, data };
}

export async function createCampaignAction(input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await emailCampaignService.createCampaign(workspaceId, parsed.data);
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function updateCampaignAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = campaignSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await emailCampaignService.updateCampaign(workspaceId, id, parsed.data);
  if (!row) return { ok: false, error: "کمپین یافت نشد" };
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function deleteCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await emailCampaignService.deleteCampaign(workspaceId, id);
  revalidatePath("/campaigns");
  return { ok: Boolean(row) };
}

export async function sendCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await emailCampaignService.sendCampaign(workspaceId, id);
  if (!row) return { ok: false, error: "کمپین یافت نشد" };
  revalidatePath("/campaigns");
  return { ok: true };
}

export async function listCampaignTemplatesAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await emailCampaignService.listTemplates(workspaceId);
  return { ok: true, data };
}

export async function createCampaignTemplateAction(input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = campaignTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await emailCampaignService.createTemplate(workspaceId, parsed.data);
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function deleteCampaignTemplateAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await emailCampaignService.deleteTemplate(workspaceId, id);
  revalidatePath("/campaigns");
  return { ok: Boolean(row) };
}
