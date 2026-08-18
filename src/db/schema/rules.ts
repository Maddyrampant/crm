import { pgTable, text, timestamp, pgEnum, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import type { RuleAction, RuleCondition } from "@/lib/rules";

export const ruleEvent = pgEnum("rule_event", [
  "deal.stage_changed",
  "deal.outcome_changed",
  "contact.created",
  "invoice.created",
  "invoice.payment_received",
  "invoice.overdue",
  "appointment.created",
]);

export const rules = pgTable(
  "rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    event: ruleEvent("event").notNull(),
    conditions: jsonb("conditions").$type<RuleCondition[]>().notNull().default([]),
    actions: jsonb("actions").$type<RuleAction[]>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("rules_workspace_idx").on(t.workspaceId)]
);

export const ruleLogs = pgTable(
  "rule_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").references(() => rules.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    entityId: text("entity_id"),
    matched: boolean("matched").notNull().default(false),
    actionsExecuted: integer("actions_executed").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("rule_logs_workspace_idx").on(t.workspaceId)]
);

export type Rule = typeof rules.$inferSelect;
export type RuleLog = typeof ruleLogs.$inferSelect;
