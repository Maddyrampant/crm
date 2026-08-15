import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const activityEntity = pgEnum("activity_entity", [
  "contact",
  "company",
  "deal",
  "invoice",
  "appointment",
  "task",
  "payment",
  "note",
  "email",
  "sms",
]);

export const activityLog = pgTable("activity_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: activityEntity("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notes = pgTable("notes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: activityEntity("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type Note = typeof notes.$inferSelect;
