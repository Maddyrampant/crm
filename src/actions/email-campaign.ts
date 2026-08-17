"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as emailCampaignService from "@/services/email-campaign";

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
  const { workspaceId } = await requireWorkspace();
  const data = input as emailCampaignService.CampaignInput;
  const row = await emailCampaignService.createCampaign(workspaceId, data);
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function updateCampaignAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as Partial<emailCampaignService.CampaignInput>;
  const row = await emailCampaignService.updateCampaign(workspaceId, id, data);
  if (!row) return { ok: false, error: "کمپین یافت نشد" };
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function deleteCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await emailCampaignService.deleteCampaign(workspaceId, id);
  revalidatePath("/campaigns");
  return { ok: Boolean(row) };
}

export async function sendCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
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
  const { workspaceId } = await requireWorkspace();
  const data = input as emailCampaignService.CampaignTemplateInput;
  const row = await emailCampaignService.createTemplate(workspaceId, data);
  revalidatePath("/campaigns");
  return { ok: true, data: row };
}

export async function deleteCampaignTemplateAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await emailCampaignService.deleteTemplate(workspaceId, id);
  revalidatePath("/campaigns");
  return { ok: Boolean(row) };
}
