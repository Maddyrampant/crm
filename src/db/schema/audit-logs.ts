import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    userId: text("user_id").references(() => user.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    changes: jsonb("changes").$type<Record<string, { old: unknown; new: unknown }>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_workspace_idx").on(t.workspaceId),
    index("audit_logs_user_idx").on(t.userId),
  ]
);
