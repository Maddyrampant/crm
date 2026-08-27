import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { redisDel, redisGet, redisSet } from "@/lib/redis";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 روز (مطابق expiresIn)

/** fallback درون‌حافظه‌ای وقتی REDIS_URL نباشد */
const memSessions = new Map<string, { value: string; expiresAt: number }>();

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
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      disabled: !process.env.GITHUB_CLIENT_ID,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 روز
    updateAge: 60 * 60 * 24, // تمدید روزانه
    storeSessionInDatabase: true,
  },
  secondaryStorage,
});

export type Session = typeof auth.$Infer.Session;
