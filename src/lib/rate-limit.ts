import "server-only";
import { getRedis } from "@/lib/redis";

/**
 * Rate limiting با سطل توکن (Token Bucket).
 * - با Redis: اتمیک (Lua) و مشترک بین همهٔ اینستنس‌ها.
 * - بدون Redis: fallback درون‌حافظه‌ای (مثل قبل، فقط برای یک اینستنس).
 */

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

/** پاک‌سازی دوره‌ای باکت‌های قدیمی (fallback درون‌حافظه‌ای) */
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key);
  }
}, 5 * 60 * 1000);

function refill(bucket: Bucket, max: number, windowMs: number) {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(max, bucket.tokens + (elapsed / windowMs) * max);
  bucket.lastRefill = now;
}

function inMemoryCheck(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: max - 1, lastRefill: now });
    return { ok: true, retryAfterMs: 0 };
  }

  refill(bucket, max, windowMs);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { ok: true, retryAfterMs: 0 };
  }

  const tokensNeeded = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((tokensNeeded / max) * windowMs);
  return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1_000) };
}

const LUA_SCRIPT = `
local data = redis.call('GET', KEYS[1])
local now = tonumber(ARGV[1])
local max = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local tokens = max
local last = now
if data then
  local bucket = cjson.decode(data)
  tokens = tonumber(bucket.t)
  last = tonumber(bucket.r)
end
local elapsed = (now - last) / window
tokens = math.min(max, tokens + elapsed * max)
local ok = 0
local retry = 0
if tokens >= 1 then
  tokens = tokens - 1
  ok = 1
else
  local needed = 1 - tokens
  retry = math.ceil((needed / max) * window)
end
redis.call('SET', KEYS[1], cjson.encode({t = tokens, r = now}), 'EX', ttl)
return {ok, retry}
`;

export async function checkRateLimit(
  key: string,
  max = 60,
  windowMs = 60_000
): Promise<{ ok: boolean; retryAfterMs: number }> {
  const redis = getRedis();
  if (redis) {
    try {
      const ttl = Math.max(Math.ceil(windowMs / 1000) * 2, 60);
      const [ok, retry] = (await redis.eval(
        LUA_SCRIPT,
        { keys: [`rl:${key}`], arguments: [String(Date.now()), String(max), String(windowMs), String(ttl)] }
      )) as [number, number];
      return { ok: ok === 1, retryAfterMs: retry > 0 ? Math.max(retry, 1) : 0 };
    } catch {
      /* خطای Redis → fallback درون‌حافظه‌ای */
    }
  }
  return inMemoryCheck(key, max, windowMs);
}
