const { createClient } = require("redis");

const PREFIX = "next-cache:";
const TAG_SET = "next-cache:revalidated-tags";

function noRedisStore() {
  const cache = new Map();
  const pendingSets = new Map();
  const localTags = new Map();

  async function getExpirationImpl(tags) {
    const timestamps = tags.map((t) => localTags.get(t) || 0);
    return Math.max(...timestamps, 0);
  }

  return {
    async get(cacheKey, softTags) {
      try {
        const pending = pendingSets.get(cacheKey);
        if (pending) await pending;
        const entry = cache.get(cacheKey);
        if (!entry) return undefined;
        if (Date.now() > entry.timestamp + entry.revalidate * 1000) return undefined;
        if ((await getExpirationImpl(softTags)) > entry.timestamp) return undefined;
        return entry;
      } catch {
        return undefined;
      }
    },
    async set(cacheKey, pendingEntry) {
      let resolvePending;
      const pendingPromise = new Promise((resolve) => { resolvePending = resolve; });
      pendingSets.set(cacheKey, pendingPromise);
      try {
        cache.set(cacheKey, await pendingEntry);
      } finally {
        resolvePending();
        pendingSets.delete(cacheKey);
      }
    },
    async refreshTags() {},
    getExpiration: getExpirationImpl,
    async updateTags(tags) {
      const now = Date.now();
      for (const tag of tags) localTags.set(tag, now);
    },
  };
}

function redisStore() {
  const url = process.env.REDIS_URL;
  let client = null;
  let connectErrorAt = 0;
  const localTags = new Map();

  if (url) {
    client = createClient({ url });
    client.on("error", () => { connectErrorAt = Date.now(); });
  }

  async function available() {
    if (!client) return false;
    if (Date.now() - connectErrorAt < 5000) return false;
    if (client.isOpen) return true;
    try {
      await client.connect();
      return true;
    } catch {
      connectErrorAt = Date.now();
      return false;
    }
  }

  async function getExpirationImpl(tags) {
    const timestamps = tags.map((t) => localTags.get(t) || 0);
    return Math.max(...timestamps, 0);
  }

  return {
    async get(cacheKey, softTags) {
      try {
        if (!(await available())) return undefined;
        const stored = await client.get(PREFIX + cacheKey);
        if (!stored) return undefined;
        const data = JSON.parse(stored);
        if (Date.now() > data.timestamp + data.revalidate * 1000) return undefined;
        if ((await getExpirationImpl(softTags)) > data.timestamp) return undefined;
        return {
          value: new ReadableStream({
            start(controller) {
              controller.enqueue(Buffer.from(data.value, "base64"));
              controller.close();
            },
          }),
          tags: data.tags,
          stale: data.stale,
          timestamp: data.timestamp,
          expire: data.expire,
          revalidate: data.revalidate,
        };
      } catch {
        return undefined;
      }
    },

    async set(cacheKey, pendingEntry) {
      try {
        if (!(await available())) return;
        const entry = await pendingEntry;
        const reader = entry.value.getReader();
        const chunks = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const data = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        const ttl = Math.max(entry.expire, entry.revalidate + entry.stale);
        await client.set(
          PREFIX + cacheKey,
          JSON.stringify({
            value: data.toString("base64"),
            tags: entry.tags,
            stale: entry.stale,
            timestamp: entry.timestamp,
            expire: entry.expire,
            revalidate: entry.revalidate,
          }),
          { EX: Math.max(ttl, 60) }
        );
      } catch {
        /* set شکست = همان رندر تازه سرو می‌شود */
      }
    },

    async refreshTags() {
      try {
        if (!(await available())) return;
        const tagKeys = await client.sMembers(TAG_SET);
        if (tagKeys.length > 0) {
          const values = await client.mGet(tagKeys.map((k) => `tag:${k}`));
          for (let i = 0; i < tagKeys.length; i++) {
            localTags.set(tagKeys[i], Number(values[i]));
          }
        }
      } catch {
        /* بی‌صدا */
      }
    },

    getExpiration: getExpirationImpl,

    async updateTags(tags) {
      try {
        const now = Date.now();
        for (const tag of tags) localTags.set(tag, now);
        if (!(await available())) return;
        const pipeline = client.multi();
        for (const tag of tags) {
          pipeline.set(`tag:${tag}`, String(now));
          pipeline.sAdd(TAG_SET, tag);
        }
        await pipeline.exec();
      } catch {
        /* بی‌صدا */
      }
    },
  };
}

module.exports = process.env.REDIS_URL ? redisStore() : noRedisStore();
