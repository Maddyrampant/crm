import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";
import { user } from "./auth";

export const dealStatus = pgEnum("deal_status", ["open", "won", "lost"]);

export const pipelines = pgTable(
  "pipelines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("pipelines_workspace_idx").on(t.workspaceId)]
);

export const stages = pgTable(
  "stages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: numeric("order_index").notNull().default("0"),
    color: text("color").notNull().default("#64748b"),
    winProbability: numeric("win_probability").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("stages_pipeline_idx").on(t.pipelineId)]
);

export const deals = pgTable(
  "deals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
    closeDate: timestamp("close_date", { withTimezone: true }),
    status: dealStatus("status").notNull().default("open"),
    wonAt: timestamp("won_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("deals_workspace_idx").on(t.workspaceId),
    index("deals_pipeline_idx").on(t.pipelineId),
    index("deals_stage_idx").on(t.stageId),
    index("deals_contact_idx").on(t.contactId),
    index("deals_owner_idx").on(t.ownerId),
  ]
);

export const pipelineRelations = relations(pipelines, ({ many }) => ({
  stages: many(stages),
}));

export const stageRelations = relations(stages, ({ many }) => ({
  deals: many(deals),
}));

export type Pipeline = typeof pipelines.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
