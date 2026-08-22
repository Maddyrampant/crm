"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import * as smsService from "@/services/sms";

const smsCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  message: z.string().min(1).max(1600),
  recipientType: z.string().max(50).optional(),
  recipientIds: z.array(z.string()).optional(),
});

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
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = smsCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await smsService.createSmsCampaign(workspaceId, parsed.data);
  revalidatePath("/sms");
  return { ok: true, data: row };
}

export async function updateSmsCampaignAction(id: string, input: unknown) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const parsed = smsCampaignSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  const row = await smsService.updateSmsCampaign(workspaceId, id, parsed.data);
  if (!row) return { ok: false, error: "کمپین پیامکی یافت نشد" };
  revalidatePath("/sms");
  return { ok: true, data: row };
}

export async function deleteSmsCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await smsService.deleteSmsCampaign(workspaceId, id);
  revalidatePath("/sms");
  return { ok: Boolean(row) };
}

export async function sendSmsCampaignAction(id: string) {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const row = await smsService.sendSmsCampaign(workspaceId, id);
  if (!row) return { ok: false, error: "کمپین پیامکی یافت نشد" };
  revalidatePath("/sms");
  return { ok: true };
}
