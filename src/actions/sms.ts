"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import * as smsService from "@/services/sms";

export async function listSmsCampaignsAction() {
  const { workspaceId } = await requireWorkspace();
  const data = await smsService.listSmsCampaigns(workspaceId);
  return { ok: true, data };
}

export async function getSmsCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const data = await smsService.getSmsCampaign(workspaceId, id);
  if (!data) return { ok: false, error: "کمپین پیامکی یافت نشد" };
  return { ok: true, data };
}

export async function createSmsCampaignAction(input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as smsService.SmsCampaignInput;
  const row = await smsService.createSmsCampaign(workspaceId, data);
  revalidatePath("/sms");
  return { ok: true, data: row };
}

export async function updateSmsCampaignAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspace();
  const data = input as Partial<smsService.SmsCampaignInput>;
  const row = await smsService.updateSmsCampaign(workspaceId, id, data);
  if (!row) return { ok: false, error: "کمپین پیامکی یافت نشد" };
  revalidatePath("/sms");
  return { ok: true, data: row };
}

export async function deleteSmsCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await smsService.deleteSmsCampaign(workspaceId, id);
  revalidatePath("/sms");
  return { ok: Boolean(row) };
}

export async function sendSmsCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await smsService.sendSmsCampaign(workspaceId, id);
  if (!row) return { ok: false, error: "کمپین پیامکی یافت نشد" };
  revalidatePath("/sms");
  return { ok: true };
}
