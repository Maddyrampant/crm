import { pgTable, text, timestamp, pgEnum, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { deals } from "./pipelines";

export const salesPlaybook = pgTable(
  "sales_playbook",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    steps: jsonb("steps").$type<Array<{ title: string; description?: string; orderIndex: number }>>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sales_playbook_workspace_idx").on(t.workspaceId)]
);

export const dealChecklists = pgTable(
  "deal_checklists",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    dealId: text("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    playbookId: text("playbook_id")
      .references(() => salesPlaybook.id, { onDelete: "set null" }),
    stepTitle: text("step_title").notNull(),
    completed: boolean("completed").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("deal_checklists_workspace_idx").on(t.workspaceId),
    index("deal_checklists_deal_idx").on(t.dealId),
    index("deal_checklists_playbook_idx").on(t.playbookId),
  ]
);

export const salesPlaybookRelations = relations(salesPlaybook, ({ many }) => ({
  checklists: many(dealChecklists),
}));

export const dealChecklistRelations = relations(dealChecklists, ({ one }) => ({
  playbook: one(salesPlaybook, { fields: [dealChecklists.playbookId], references: [salesPlaybook.id] }),
}));

export type SalesPlaybook = typeof salesPlaybook.$inferSelect;
export type DealChecklist = typeof dealChecklists.$inferSelect;
