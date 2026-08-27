import { pgTable, text, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";
import { user } from "./auth";

export const callOutcome = pgEnum("call_outcome", ["connected", "no_answer", "voicemail", "busy", "wrong_number"]);

export const callLogs = pgTable(
  "call_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    direction: text("direction").notNull().default("outbound"),
    duration: integer("duration"),
    outcome: callOutcome("outcome").notNull().default("connected"),
    notes: text("notes"),
    phone: text("phone"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("call_logs_workspace_idx").on(t.workspaceId),
    index("call_logs_contact_idx").on(t.contactId),
    index("call_logs_user_idx").on(t.userId),
  ]
);

export type CallLog = typeof callLogs.$inferSelect;
export type CallOutcome = typeof callLogs.$inferSelect["outcome"];
