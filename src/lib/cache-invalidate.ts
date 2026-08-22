import "server-only";
import { cacheDel, cacheDelByPrefix } from "@/lib/cache";

/**
 * پاک‌سازی کش مرتبط با یک ورک‌اسپیس.
 * بعد از هر عملیات نوشتن (INSERT/UPDATE/DELETE) فراخوانی شود.
 */
export async function invalidateWorkspaceCache(workspaceId: string): Promise<void> {
  await Promise.all([
    cacheDelByPrefix(`kpis:${workspaceId}`),
    cacheDelByPrefix(`dashboard:${workspaceId}`),
    cacheDelByPrefix(`members:${workspaceId}`),
    cacheDelByPrefix(`pipeline:${workspaceId}`),
  ]);
}

/** پاک‌سازی کش یک مخاطب خاص */
export async function invalidateContactCache(workspaceId: string, contactId: string): Promise<void> {
  await Promise.all([
    cacheDelByPrefix(`contact:${workspaceId}:${contactId}`),
    invalidateWorkspaceCache(workspaceId),
  ]);
}

/** پاک‌سازی کش یک فرصت فروش خاص */
export async function invalidateDealCache(workspaceId: string, dealId: string): Promise<void> {
  await Promise.all([
    cacheDelByPrefix(`deal:${workspaceId}:${dealId}`),
    invalidateWorkspaceCache(workspaceId),
  ]);
}

/** پاک‌سازی کش فاکتور */
export async function invalidateInvoiceCache(workspaceId: string): Promise<void> {
  await invalidateWorkspaceCache(workspaceId);
}

/** پاک‌سازی کش موجودی */
export async function invalidateInventoryCache(workspaceId: string): Promise<void> {
  await cacheDelByPrefix(`stock:${workspaceId}`);
}
