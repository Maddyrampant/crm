import { pgTable, text, timestamp, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const knowledgeCategory = pgEnum("knowledge_category", [
  "sales_advice",
  "product_info",
  "support_faq",
  "objection_handling",
  "follow_up",
  "custom",
]);

export const aiKnowledge = pgTable("ai_knowledge", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  category: knowledgeCategory("category").notNull().default("custom"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AiKnowledge = typeof aiKnowledge.$inferSelect;
