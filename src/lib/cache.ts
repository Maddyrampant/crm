import "server-only";
import { redisDel, redisDelByPrefix, redisGet, redisSet } from "@/lib/redis";

const PREFIX = "cache:";

type MemEntry = { value: string; expiresAt: number };

/** fallback درون‌حافظه‌ای وقتی REDIS_URL تنظیم نشده باشد */
const memStore = new Map<string, MemEntry>();

export function cacheKey(...parts: (string | number)[]): string {
  return `${PREFIX}${parts.join(":")}`;
}

export async function cacheGet(key: string): Promise<string | null> {
  const mem = memStore.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.value;
  if (mem) memStore.delete(key);

  return redisGet(key);
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  await redisSet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  memStore.delete(key);
  await redisDel(key);
}

export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const memPrefix = `${PREFIX}${prefix}`;
  for (const key of memStore.keys()) {
    if (key.startsWith(memPrefix)) memStore.delete(key);
  }
  await redisDelByPrefix(prefix);
}

/**
 * اجرای fn و کش کردن نتیجه تا TTL ثانیه.
 * - در صورت خطای کش، مستقیماً fn اجرا می‌شود (کش اختیاری است).
 * - مقدار `null` هم کش می‌شود (negative cache).
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      /* داده خراب → بازخوانی */
    }
  }

  const value = await fn();

  try {
    await cacheSet(key, JSON.stringify(value), ttlSeconds);
  } catch {
    /* بی‌صدا */
  }
  return value;
}
