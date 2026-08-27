import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const territories = pgTable(
  "territories",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rules: jsonb("rules").$type<{ field: string; operator: string; value: string }[]>().notNull().default([]),
    ownerId: text("owner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("territories_workspace_idx").on(t.workspaceId),
    index("territories_owner_idx").on(t.ownerId),
  ]
);

export type Territory = typeof territories.$inferSelect;
