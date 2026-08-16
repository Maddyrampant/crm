"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  createApiKey,
  createEmailTemplate,
  createWebhook,
  deleteEmailTemplate,
  deleteWebhook,
  listApiKeys,
  listDeliveries,
  listEmailLogs,
  listEmailTemplates,
  listSmsLogs,
  listWebhooks,
  processDueDeliveries,
  renderTemplate,
  retryDelivery,
  revokeApiKey,
  sendEmail,
  sendSms,
  updateEmailTemplate,
  updateWebhook,
} from "@/services/automation";

export async function getWebhooksAction() {
  const { workspaceId } = await requireWorkspace();
  return listWebhooks(workspaceId);
}

export async function createWebhookAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createWebhook(workspaceId, raw);
  revalidatePath("/settings");
  return { ok: true, id: row.id };
}

export async function deleteWebhookAction(webhookId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteWebhook(workspaceId, webhookId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function toggleWebhookAction(
  webhookId: string,
  active: boolean
) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateWebhook(workspaceId, webhookId, { active });
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getApiKeysAction() {
  const { workspaceId } = await requireWorkspace();
  return listApiKeys(workspaceId);
}

export async function createApiKeyAction(name: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const { apiKey, secret } = await createApiKey(workspaceId, name);
  revalidatePath("/settings");
  return { ok: true, id: apiKey.id, secret };
}

export async function revokeApiKeyAction(keyId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await revokeApiKey(workspaceId, keyId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function sendTestEmailAction(to: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const result = await sendEmail(workspaceId, {
    to,
    subject: "پیام آزمایشی CRM",
    body: "این یک پیام آزمایشی از سیستم CRM است.",
  });
  revalidatePath("/settings");
  return { ok: result.ok, provider: result.provider, error: "error" in result ? result.error : undefined };
}

export async function sendTestSmsAction(to: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
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

export async function getDeliveriesAction() {
  const { workspaceId } = await requireWorkspace();
  await processDueDeliveries(workspaceId);
  return listDeliveries(workspaceId);
}

export async function retryDeliveryAction(deliveryId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await retryDelivery(workspaceId, deliveryId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function getEmailTemplatesAction() {
  const { workspaceId } = await requireWorkspace();
  return listEmailTemplates(workspaceId);
}

export async function createEmailTemplateAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createEmailTemplate(workspaceId, raw);
  revalidatePath("/settings");
  return { ok: true, id: row.id };
}

export async function updateEmailTemplateAction(templateId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateEmailTemplate(workspaceId, templateId, raw);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function deleteEmailTemplateAction(templateId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteEmailTemplate(workspaceId, templateId);
  revalidatePath("/settings");
  return { ok: Boolean(row) };
}

export async function sendMessageAction(
  channel: "email" | "sms",
  raw: {
    to?: string;
    subject?: string;
    body?: string;
    contactId?: string;
    templateVars?: Record<string, string | number | null | undefined>;
  }
) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  if (!raw.to?.trim() || !raw.body?.trim()) {
    return { ok: false, error: "گیرنده و متن پیام الزامی است" };
  }
  if (channel === "email" && !raw.subject?.trim()) {
    return { ok: false, error: "موضوع ایمیل الزامی است" };
  }
  const vars = raw.templateVars ?? {};
  if (channel === "email") {
    return sendEmail(workspaceId, {
      to: raw.to.trim(),
      subject: renderTemplate(raw.subject!, vars),
      body: renderTemplate(raw.body, vars),
      contactId: raw.contactId,
    });
  }
  return sendSms(workspaceId, {
    to: raw.to.trim(),
    body: renderTemplate(raw.body, vars),
    contactId: raw.contactId,
  });
}
