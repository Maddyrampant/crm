import { createHmac, randomBytes, createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  apiKeys,
  emailLogs,
  emailTemplates,
  smsLogs,
  webhookDeliveries,
  webhooks,
} from "@/db/schema";

/* ─────────────────── وب‌هاوک ─────────────────── */

export const createWebhookSchema = z.object({
  name: z.string().trim().min(1, "نام را وارد کنید").max(80),
  url: z.string().url("آدرس نامعتبر است"),
  events: z.array(z.string()).min(1, "حداقل یک رویداد انتخاب کنید"),
  active: z.boolean().default(true),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

export async function listWebhooks(workspaceId: string) {
  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.workspaceId, workspaceId))
    .orderBy(desc(webhooks.createdAt));
}

export async function createWebhook(workspaceId: string, raw: unknown) {
  const input = createWebhookSchema.parse(raw);
  const [row] = await db
    .insert(webhooks)
    .values({
      workspaceId,
      name: input.name,
      url: input.url,
      secret: randomBytes(32).toString("hex"),
      events: input.events,
      active: input.active,
    })
    .returning();
  return row;
}

export async function updateWebhook(
  workspaceId: string,
  webhookId: string,
  raw: Partial<CreateWebhookInput>
) {
  const input = createWebhookSchema.partial().parse(raw);
  const [row] = await db
    .update(webhooks)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteWebhook(workspaceId: string, webhookId: string) {
  const [row] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, workspaceId)))
    .returning({ id: webhooks.id });
  return row ?? null;
}

function signPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_BACKOFF_MS = [60_000, 120_000, 240_000, 480_000, 960_000];

async function performDelivery(
  deliveryId: string,
  secret: string,
  url: string,
  event: string,
  payload: Record<string, unknown>,
  attempt: number
) {
  const body = JSON.stringify({ event, payload });
  const retryAt =
    attempt >= MAX_DELIVERY_ATTEMPTS
      ? null
      : new Date(Date.now() + (DELIVERY_BACKOFF_MS[attempt - 1] ?? 60_000));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crm-event": event,
        "x-crm-delivery-id": deliveryId,
        "x-crm-signature": `sha256=${signPayload(secret, body)}`,
        "user-agent": "CRM-Hook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    await db
      .update(webhookDeliveries)
      .set({
        status: res.ok ? "delivered" : "failed",
        attempts: attempt,
        responseStatus: res.status,
        error: res.ok ? null : `HTTP ${res.status}`,
        nextAttemptAt: res.ok ? null : retryAt,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  } catch (err) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        attempts: attempt,
        error: err instanceof Error ? err.message : "network error",
        nextAttemptAt: retryAt,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  }
}

async function deliver(
  webhookId: string,
  secret: string,
  url: string,
  event: string,
  payload: Record<string, unknown>
) {
  const deliveryId = randomBytes(12).toString("hex");
  await db
    .insert(webhookDeliveries)
    .values({
      webhookId,
      event,
      payload,
      id: deliveryId,
      status: "pending",
      nextAttemptAt: new Date(Date.now() + 30_000),
    });

  await performDelivery(deliveryId, secret, url, event, payload, 1);
}

/** ارسال رویداد به همه وب‌هاوک‌های فعال مشترک — بدون await عمدی (fire-and-forget) */
export function dispatchWebhookEvent(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
) {
  void (async () => {
    const targets = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.active, true)));
    for (const w of targets) {
      if (!w.events.includes("*") && !w.events.includes(event)) continue;
      await deliver(w.id, w.secret, w.url, event, payload);
    }
  })();
}

/** آخرین تحویل‌های وب‌هاوک (برای صفحه تنظیمات) */
export async function listDeliveries(workspaceId: string, limit = 25) {
  return db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(eq(webhooks.workspaceId, workspaceId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

/** تلاش مجدد تحویل‌های سررسیدشده (backoff) — خروجی تعداد پردازش‌شده */
export async function processDueDeliveries(workspaceId: string) {
  const due = await db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(
      and(
        eq(webhooks.workspaceId, workspaceId),
        inArray(webhookDeliveries.status, ["pending", "failed"]),
        lt(webhookDeliveries.attempts, MAX_DELIVERY_ATTEMPTS),
        or(
          isNull(webhookDeliveries.nextAttemptAt),
          lte(webhookDeliveries.nextAttemptAt, new Date())
        )
      )
    )
    .limit(10);
  for (const { delivery, webhook } of due) {
    await performDelivery(
      delivery.id,
      webhook.secret,
      webhook.url,
      delivery.event,
      delivery.payload,
      delivery.attempts + 1
    );
  }
  return due.length;
}

/** تلاش مجدد دستی یک تحویل */
export async function retryDelivery(workspaceId: string, deliveryId: string) {
  const [item] = await db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(
      and(
        eq(webhookDeliveries.id, deliveryId),
        eq(webhooks.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!item) return null;
  await performDelivery(
    item.delivery.id,
    item.webhook.secret,
    item.webhook.url,
    item.delivery.event,
    item.delivery.payload,
    Math.min(item.delivery.attempts + 1, MAX_DELIVERY_ATTEMPTS)
  );
  return item.delivery;
}

/* ─────────────────── کلیدهای API ─────────────────── */

export const API_KEY_PREFIX = "crm_";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export async function createApiKey(workspaceId: string, name: string) {
  const raw = generateApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      workspaceId,
      name,
      keyHash: hashKey(raw),
      prefix: raw.slice(0, 10) + "…",
    })
    .returning();
  return { apiKey: row, secret: raw };
}

export async function listApiKeys(workspaceId: string) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(workspaceId: string, keyId: string) {
  const [row] = await db
    .update(apiKeys)
    .set({ active: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

/** اعتبارسنجی کلید Bearer — خروجی workspaceId یا null */
export async function verifyApiKey(token: string): Promise<string | null> {
  if (!token.startsWith(API_KEY_PREFIX)) return null;
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashKey(token)))
    .limit(1);
  if (!row || !row.active) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));
  return row.workspaceId;
}

/* ─────────────────── ایمیل ─────────────────── */

export async function sendEmail(
  workspaceId: string,
  input: { to: string; subject: string; body: string; contactId?: string }
) {
  const provider = process.env.RESEND_API_KEY
    ? "resend"
    : process.env.SMTP_HOST
      ? "smtp"
      : "log";

  try {
    let providerMessageId: string | null = null;

    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "CRM <onboarding@resend.dev>",
          to: [input.to],
          subject: input.subject,
          text: input.body,
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend: ${res.status} ${await res.text()}`);
      }
      const data = (await res.json()) as { id: string };
      providerMessageId = data.id;
    } else if (provider === "smtp") {
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transport.sendMail({
        from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
        to: input.to,
        subject: input.subject,
        text: input.body,
      });
      providerMessageId = info.messageId ?? null;
    }

    await db.insert(emailLogs).values({
      workspaceId,
      contactId: input.contactId ?? null,
      to: input.to,
      subject: input.subject,
      body: input.body,
      status: "sent",
      provider,
      providerMessageId,
    });
    return { ok: true, provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db.insert(emailLogs).values({
      workspaceId,
      contactId: input.contactId ?? null,
      to: input.to,
      subject: input.subject,
      body: input.body,
      status: "failed",
      provider,
      error: message,
    });
    return { ok: false, provider, error: message };
  }
}

/* ─────────────────── پیامک (کاوه‌نگار) ─────────────────── */

export async function sendSms(
  workspaceId: string,
  input: { to: string; body: string; contactId?: string }
) {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const provider = apiKey ? "kavenegar" : "log";

  try {
    let providerMessageId: string | null = null;

    if (provider === "kavenegar") {
      const sender = process.env.KAVENEGAR_SENDER ?? "";
      const url =
        `https://api.kavenegar.com/v1/${apiKey}/sms/send.json` +
        `?receptor=${encodeURIComponent(input.to)}` +
        `&message=${encodeURIComponent(input.body)}` +
        (sender ? `&sender=${encodeURIComponent(sender)}` : "");
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const data = (await res.json()) as {
        return?: { status: number };
        entries?: Array<{ messageid: string }>;
      };
      if (!res.ok || data.return?.status !== 200) {
        throw new Error(`Kavenegar: ${JSON.stringify(data)}`);
      }
      providerMessageId = data.entries?.[0]?.messageid ?? null;
    }

    await db.insert(smsLogs).values({
      workspaceId,
      contactId: input.contactId ?? null,
      to: input.to,
      body: input.body,
      status: "sent",
      provider,
      providerMessageId,
    });
    return { ok: true, provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db.insert(smsLogs).values({
      workspaceId,
      contactId: input.contactId ?? null,
      to: input.to,
      body: input.body,
      status: "failed",
      provider,
      error: message,
    });
    return { ok: false, provider, error: message };
  }
}

/* ─────────────────── الگوهای ایمیل ─────────────────── */

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1, "نام الگو را وارد کنید").max(80),
  subject: z.string().trim().min(1, "موضوع را وارد کنید").max(200),
  body: z.string().trim().min(1, "متن الگو را وارد کنید").max(10_000),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

export async function listEmailTemplates(workspaceId: string) {
  return db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.workspaceId, workspaceId))
    .orderBy(desc(emailTemplates.createdAt));
}

export async function createEmailTemplate(workspaceId: string, raw: unknown) {
  const input = emailTemplateSchema.parse(raw);
  const [row] = await db
    .insert(emailTemplates)
    .values({ workspaceId, name: input.name, subject: input.subject, body: input.body })
    .returning();
  return row;
}

export async function updateEmailTemplate(
  workspaceId: string,
  templateId: string,
  raw: unknown
) {
  const input = emailTemplateSchema.partial().parse(raw);
  const [row] = await db
    .update(emailTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function deleteEmailTemplate(workspaceId: string, templateId: string) {
  const [row] = await db
    .delete(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.workspaceId, workspaceId)
      )
    )
    .returning({ id: emailTemplates.id });
  return row ?? null;
}

/** درون‌سنجی متغیرهای {{key}} از object داده‌شده */
export function renderTemplate(
  text: string,
  vars: Record<string, string | number | null | undefined>
) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? match : String(value);
  });
}

/* ─────────────────── لاگ‌ها ─────────────────── */

export async function listEmailLogs(workspaceId: string, limit = 20) {
  return db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.workspaceId, workspaceId))
    .orderBy(desc(emailLogs.createdAt))
    .limit(limit);
}

export async function listSmsLogs(workspaceId: string, limit = 20) {
  return db
    .select()
    .from(smsLogs)
    .where(eq(smsLogs.workspaceId, workspaceId))
    .orderBy(desc(smsLogs.createdAt))
    .limit(limit);
}
