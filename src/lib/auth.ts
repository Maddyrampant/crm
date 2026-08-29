import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { redisDel, redisGet, redisSet, ensureConnected } from "@/lib/redis";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 روز (مطابق expiresIn)

/** fallback درون‌حافظه‌ای وقتی REDIS_URL نباشد */
const memSessions = new Map<string, { value: string; expiresAt: number }>();
const memRate = new Map<string, { count: number; expiresAt: number }>();

const secondaryStorage = {
  async get(key: string) {
    const mem = memSessions.get(key);
    if (mem && mem.expiresAt > Date.now()) return mem.value;
    if (mem) memSessions.delete(key);
    return redisGet(`sess:${key}`);
  },
  async set(key: string, value: string, ttl?: number) {
    const t = ttl ?? SESSION_TTL;
    memSessions.set(key, { value, expiresAt: Date.now() + t * 1000 });
    await redisSet(`sess:${key}`, value, t);
  },
  async delete(key: string) {
    memSessions.delete(key);
    await redisDel(`sess:${key}`);
  },
  async increment(key: string, ttlSeconds?: number) {
    const c = await ensureConnected();
    if (c) {
      const rk = `rl:${key}`;
      const count = await c.incr(rk);
      if (ttlSeconds) await c.expire(rk, ttlSeconds);
      return count;
    }
    const now = Date.now();
    const entry = memRate.get(key);
    if (!entry || entry.expiresAt <= now) {
      memRate.set(key, { count: 1, expiresAt: now + (ttlSeconds ?? 10) * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  },
};

export const auth = betterAuth({
  trustedOrigins: ["http://*"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 روز
    updateAge: 60 * 60 * 24, // تمدید روزانه
    storeSessionInDatabase: true,
  },
  secondaryStorage,
});

export type Session = typeof auth.$Infer.Session;
