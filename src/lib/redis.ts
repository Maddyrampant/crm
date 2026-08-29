import "server-only";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let lastConnectError = 0;

/**
 * کلاینت Redis لازی و مقاوم به خطا.
 * اگر `REDIS_URL` تنظیم نشده باشد، `null` برمی‌گرداند تا مصرف‌کننده
 * به fallback درون‌حافظه‌ای برسد (اپ بدون Redis هم کار می‌کند).
 */
export function getRedis(): RedisClient | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    client = createClient({ url });
    client.on("error", () => {
      lastConnectError = Date.now();
    });
  }
  return client;
}

/** آیا Redis در دسترس است؟ (بعد از خطای اخیر چند ثانیه خنک می‌ماند) */
export function isRedisAvailable(): boolean {
  const c = getRedis();
  if (!c) return false;
  if (c.isOpen) return true;
  return Date.now() - lastConnectError > 5_000;
}

async function ensureConnected(): Promise<RedisClient | null> {
  const c = getRedis();
  if (!c || !isRedisAvailable()) return null;
  try {
    if (!c.isOpen) await c.connect();
    return c;
  } catch {
    lastConnectError = Date.now();
    return null;
  }
}
export { ensureConnected };

export async function redisGet(key: string): Promise<string | null> {
  const c = await ensureConnected();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  const c = await ensureConnected();
  if (!c) return;
  try {
    await c.set(key, value, { EX: ttlSeconds });
  } catch {
    /* بی‌صدا — کش اختیاری است */
  }
}

export async function redisDel(key: string): Promise<void> {
  const c = await ensureConnected();
  if (!c) return;
  try {
    await c.del(key);
  } catch {
    /* بی‌صدا */
  }
}

/** پاک‌سازی همزمان چند کلید (برای invalidate با پیشوند — غیربلوکه‌شده با SCAN) */
export async function redisDelByPrefix(prefix: string): Promise<void> {
  const c = await ensureConnected();
  if (!c) return;
  try {
    let cursor = "0";
    do {
      const result = await c.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) await c.del(result.keys);
    } while (cursor !== "0");
  } catch {
    /* بی‌صدا */
  }
}
