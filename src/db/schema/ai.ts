import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const aiRole = pgEnum("ai_role", ["user", "assistant", "tool"]);

export const toolRunStatus = pgEnum("tool_run_status", [
  "pending",
  "awaiting_confirmation",
  "approved",
  "rejected",
  "executed",
  "failed",
]);

export const aiConversations = pgTable("ai_conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("گفتگوی جدید"),
  model: text("model").notNull().default("openai/gpt-4o-mini"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: aiRole("role").notNull(),
  content: text("content"),
  toolCalls: jsonb("tool_calls").$type<unknown[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiToolRuns = pgTable("ai_tool_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => aiConversations.id, {
    onDelete: "set null",
  }),
  toolName: text("tool_name").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
  output: jsonb("output").$type<unknown>().default(null),
  status: toolRunStatus("status").notNull().default("pending"),
  approvedBy: text("approved_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type AiToolRun = typeof aiToolRuns.$inferSelect;
export type AiRole = typeof aiMessages.$inferSelect["role"];
export type ToolRunStatus = typeof aiToolRuns.$inferSelect["status"];
