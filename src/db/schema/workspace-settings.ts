import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workspaceSettings = pgTable(
  "workspace_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.key)]
);

export type WorkspaceSetting = typeof workspaceSettings.$inferSelect;
