import "server-only";

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

/** پاک‌سازی دوره‌ای باکت‌های قدیمی (برای جلوگیری از رشد بی‌نهایت حافظه) */
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

export function checkRateLimit(
  key: string,
  max = 60,
  windowMs = 60_000
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
