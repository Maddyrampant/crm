import { pgTable, text, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const messengerChannel = pgEnum("messenger_channel", ["whatsapp", "telegram", "instagram", "other"]);
export const messengerIntegrationStatus = pgEnum("messenger_integration_status", ["active", "inactive"]);

export const messengerIntegrations = pgTable(
  "messenger_integrations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channel: messengerChannel("channel").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    status: messengerIntegrationStatus("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("messenger_integrations_workspace_idx").on(t.workspaceId)]
);

export const messengerMessages = pgTable(
  "messenger_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    integrationId: text("integration_id")
      .notNull()
      .references(() => messengerIntegrations.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    direction: text("direction").notNull().default("inbound"),
    content: text("content").notNull(),
    contactId: text("contact_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("messenger_messages_integration_idx").on(t.integrationId),
    index("messenger_messages_contact_idx").on(t.contactId),
  ]
);

export type MessengerIntegration = typeof messengerIntegrations.$inferSelect;
export type MessengerMessage = typeof messengerMessages.$inferSelect;
