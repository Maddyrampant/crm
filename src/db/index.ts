import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  crmPool?: Pool;
};

const pool =
  globalForDb.crmPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.crmPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
