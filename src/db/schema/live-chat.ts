import { pgTable, text, timestamp, pgEnum, boolean, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const chatMessageRole = pgEnum("chat_message_role", ["visitor", "agent"]);

export const liveChatSessions = pgTable(
  "live_chat_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    visitorName: text("visitor_name"),
    visitorEmail: text("visitor_email"),
    status: text("status").notNull().default("active"),
    assignedTo: text("assigned_to"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("live_chat_sessions_workspace_idx").on(t.workspaceId),
    index("live_chat_sessions_status_idx").on(t.status),
    index("live_chat_sessions_contact_idx").on(t.contactId),
  ]
);

export const liveChatMessages = pgTable(
  "live_chat_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => liveChatSessions.id, { onDelete: "cascade" }),
    role: chatMessageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("live_chat_messages_session_idx").on(t.sessionId)]
);

export type LiveChatSession = typeof liveChatSessions.$inferSelect;
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;
