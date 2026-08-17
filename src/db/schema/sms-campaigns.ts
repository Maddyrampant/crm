import { pgTable, text, timestamp, uuid, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const smsCampaignStatusEnum = pgEnum("sms_campaign_status", ["draft", "scheduled", "sending", "sent", "failed"]);

export const smsCampaigns = pgTable("sms_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  message: text("message").notNull(),
  recipientType: text("recipient_type").notNull().default("all"),
  recipientIds: jsonb("recipient_ids").$type<string[]>(),
  status: smsCampaignStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  totalSent: integer("total_sent").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
