import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";
import { user } from "./auth";

export const contentType = pgEnum("content_type", [
  "video_link",
  "document",
  "image",
  "custom",
]);

export const contentStatus = pgEnum("content_status", [
  "assigned",
  "viewed",
  "completed",
]);

export const aiContent = pgTable("ai_content", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  type: contentType("type").notNull().default("video_link"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiContentAssignments = pgTable("ai_content_assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  contentId: text("content_id")
    .notNull()
    .references(() => aiContent.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  assignedBy: text("assigned_by").references(() => user.id, {
    onDelete: "set null",
  }),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  notes: text("notes"),
  status: contentStatus("status").notNull().default("assigned"),
});

export type AiContent = typeof aiContent.$inferSelect;
export type AiContentAssignment = typeof aiContentAssignments.$inferSelect;
