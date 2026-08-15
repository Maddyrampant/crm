"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/session";
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  listApiKeys,
  listEmailLogs,
  listSmsLogs,
  listWebhooks,
  revokeApiKey,
  sendEmail,
  sendSms,
  updateWebhook,
} from "@/services/automation";

export async function getWebhooksAction() {
  const { workspaceId } = await requireWorkspace();
  return listWebhooks(workspaceId);
}

export async function createWebhookAction(raw: unknown) {
  const { workspaceId } = await requireWorkspace();
  const row = await createWebhook(workspaceId, raw);
  revalidatePath("/settings");
  return { ok: true, id: row.id };
}

export async function deleteWebhookAction(webhookId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await deleteWebhook(workspaceId, webhookId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function toggleWebhookAction(
  webhookId: string,
  active: boolean
) {
  const { workspaceId } = await requireWorkspace();
  const row = await updateWebhook(workspaceId, webhookId, { active });
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getApiKeysAction() {
  const { workspaceId } = await requireWorkspace();
  return listApiKeys(workspaceId);
}

export async function createApiKeyAction(name: string) {
  const { workspaceId } = await requireWorkspace();
  const { apiKey, secret } = await createApiKey(workspaceId, name);
  revalidatePath("/settings");
  return { ok: true, id: apiKey.id, secret };
}

export async function revokeApiKeyAction(keyId: string) {
  const { workspaceId } = await requireWorkspace();
  const row = await revokeApiKey(workspaceId, keyId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function sendTestEmailAction(to: string) {
  const { workspaceId } = await requireWorkspace();
  const result = await sendEmail(workspaceId, {
    to,
    subject: "پیام آزمایشی CRM",
    body: "این یک پیام آزمایشی از سیستم CRM است.",
  });
  revalidatePath("/settings");
  return { ok: result.ok, provider: result.provider, error: "error" in result ? result.error : undefined };
}

export async function sendTestSmsAction(to: string) {
  const { workspaceId } = await requireWorkspace();
  const result = await sendSms(workspaceId, {
    to,
    body: "پیام آزمایشی CRM",
  });
  revalidatePath("/settings");
  return { ok: result.ok, provider: result.provider, error: "error" in result ? result.error : undefined };
}

export async function getLogsAction() {
  const { workspaceId } = await requireWorkspace();
  const [emails, sms] = await Promise.all([
    listEmailLogs(workspaceId),
    listSmsLogs(workspaceId),
  ]);
  return { emails, sms };
}
