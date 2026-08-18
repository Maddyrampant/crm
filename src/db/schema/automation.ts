import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const deliveryStatus = pgEnum("delivery_status", [
  "pending",
  "delivered",
  "failed",
]);

export const emailStatus = pgEnum("email_status", ["sent", "failed"]);
export const smsStatus = pgEnum("sms_status", ["sent", "failed"]);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("webhooks_workspace_idx").on(t.workspaceId)]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: deliveryStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    responseStatus: integer("response_status"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("webhook_deliveries_webhook_idx").on(t.webhookId)]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("api_keys_workspace_idx").on(t.workspaceId)]
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("email_templates_workspace_idx").on(t.workspaceId)]
);

export const emailLogs = pgTable(
  "email_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: emailStatus("status").notNull(),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("email_logs_workspace_idx").on(t.workspaceId)]
);

export const smsLogs = pgTable(
  "sms_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    to: text("to").notNull(),
    body: text("body").notNull(),
    status: smsStatus("status").notNull(),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("sms_logs_workspace_idx").on(t.workspaceId)]
);

export type Webhook = typeof webhooks.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SmsLog = typeof smsLogs.$inferSelect;
