import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const trackingType = pgEnum("tracking_type", [
  "email_open",
  "pdf_view",
  "link_click",
]);

export const trackingTokens = pgTable("tracking_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  type: trackingType("type").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TrackingToken = typeof trackingTokens.$inferSelect;
