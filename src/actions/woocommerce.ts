"use server";

import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wooStores, wooSyncLogs } from "@/db/schema";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import { createWooClient } from "@/services/woocommerce-api";

const connectStoreSchema = z.object({
  name: z.string().trim().min(1, "نام فروشگاه را وارد کنید"),
  url: z.string().url("آدرس نامعتبر است"),
  consumerKey: z.string().trim().min(1, "Consumer Key را وارد کنید"),
  consumerSecret: z.string().trim().min(1, "Consumer Secret را وارد کنید"),
  webhookSecret: z.string().trim().min(1, "Webhook Secret را وارد کنید"),
});

export type ConnectStoreInput = z.infer<typeof connectStoreSchema>;

async function getWorkspaceContext() {
  const session = await getSession();
  if (!session?.user) return null;
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return null;
  return { userId: session.user.id, workspaceId: membership.workspaceId, membership };
}

export async function listWooStores() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };

  const stores = await db
    .select({
      id: wooStores.id,
      name: wooStores.name,
      url: wooStores.url,
      active: wooStores.active,
      lastSyncAt: wooStores.lastSyncAt,
      createdAt: wooStores.createdAt,
      syncCount: sql<number>`(SELECT count(*) FROM woo_sync_logs WHERE woo_sync_logs.store_id = ${wooStores.id})::int`,
    })
    .from(wooStores)
    .where(eq(wooStores.workspaceId, ctx.workspaceId))
    .orderBy(desc(wooStores.createdAt));

  return { ok: true as const, data: stores };
}

export async function connectWooStore(input: ConnectStoreInput) {
  const parsed = connectStoreSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };

  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };
  if (!hasPermission(ctx.membership, "admin"))
    return { ok: false as const, error: "عدم دسترسی" };

  const client = createWooClient(
    parsed.data.url,
    parsed.data.consumerKey,
    parsed.data.consumerSecret
  );
  const connected = await client.testConnection();
  if (!connected) return { ok: false as const, error: "اتصال به فروشگاه برقرار نشد — آدرس و کلیدها را بررسی کنید" };

  const [store] = await db
    .insert(wooStores)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      url: parsed.data.url,
      consumerKey: parsed.data.consumerKey,
      consumerSecret: parsed.data.consumerSecret,
      webhookSecret: parsed.data.webhookSecret,
    })
    .returning();

  revalidatePath("/settings/integrations/woocommerce");
  return { ok: true as const, data: { id: store.id, url: store.url } };
}

export async function disconnectWooStore(storeId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };
  if (!hasPermission(ctx.membership, "admin"))
    return { ok: false as const, error: "عدم دسترسی" };

  await db
    .delete(wooStores)
    .where(and(eq(wooStores.id, storeId), eq(wooStores.workspaceId, ctx.workspaceId)));

  revalidatePath("/settings/integrations/woocommerce");
  return { ok: true as const };
}

export async function toggleWooStore(storeId: string, active: boolean) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };
  if (!hasPermission(ctx.membership, "admin"))
    return { ok: false as const, error: "عدم دسترسی" };

  await db
    .update(wooStores)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(wooStores.id, storeId), eq(wooStores.workspaceId, ctx.workspaceId)));

  revalidatePath("/settings/integrations/woocommerce");
  return { ok: true as const };
}

export async function getWooSyncLogs(storeId: string, limit = 50) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };

  const logs = await db
    .select()
    .from(wooSyncLogs)
    .where(
      and(eq(wooSyncLogs.storeId, storeId), eq(wooSyncLogs.workspaceId, ctx.workspaceId))
    )
    .orderBy(desc(wooSyncLogs.createdAt))
    .limit(limit);

  return { ok: true as const, data: logs };
}

export async function testWooConnection(url: string, consumerKey: string, consumerSecret: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false as const, error: "ورک‌اسپیس یافت نشد" };

  const client = createWooClient(url, consumerKey, consumerSecret);
  const connected = await client.testConnection();
  if (!connected) return { ok: false as const, error: "اتصال برقرار نشد" };
  return { ok: true as const };
}
