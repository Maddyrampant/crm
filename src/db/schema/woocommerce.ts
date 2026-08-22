import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const wooStores = pgTable(
  "woo_stores",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    consumerKey: text("consumer_key").notNull(),
    consumerSecret: text("consumer_secret").notNull(),
    webhookSecret: text("webhook_secret").notNull(),
    active: boolean("active").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("woo_stores_workspace_url_idx").on(t.workspaceId, t.url),
    index("woo_stores_workspace_idx").on(t.workspaceId),
  ]
);

export const wooSyncLogs = pgTable(
  "woo_sync_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => wooStores.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    action: text("action").notNull(),
    status: text("status").notNull().default("success"),
    error: text("error"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("woo_sync_logs_store_idx").on(t.storeId),
    index("woo_sync_logs_workspace_idx").on(t.workspaceId),
    index("woo_sync_logs_created_idx").on(t.createdAt),
  ]
);

export type WooStore = typeof wooStores.$inferSelect;
export type WooSyncLog = typeof wooSyncLogs.$inferSelect;
