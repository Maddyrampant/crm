import { pgTable, text, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const slaStatus = pgEnum("sla_status", ["active", "breached", "met"]);

export const slaPolicies = pgTable(
  "sla_policies",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    entityType: text("entity_type").notNull().default("deal"),
    responseTimeHours: integer("response_time_hours").notNull().default(24),
    resolutionTimeHours: integer("resolution_time_hours").notNull().default(72),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sla_policies_workspace_idx").on(t.workspaceId)]
);

export const slaInstances = pgTable(
  "sla_instances",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    policyId: text("policy_id")
      .notNull()
      .references(() => slaPolicies.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    status: slaStatus("status").notNull().default("active"),
    responseDeadline: timestamp("response_deadline", { withTimezone: true }),
    resolutionDeadline: timestamp("resolution_deadline", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sla_instances_workspace_idx").on(t.workspaceId),
    index("sla_instances_policy_idx").on(t.policyId),
    index("sla_instances_entity_idx").on(t.entityType, t.entityId),
  ]
);

export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type SlaInstance = typeof slaInstances.$inferSelect;
