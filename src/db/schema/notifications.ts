import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const notificationType = pgEnum("notification_type", [
  "invoice",
  "payment",
  "deal",
  "task",
  "appointment",
  "ai",
  "contact",
  "system",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull().default("system"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userId, t.readAt),
    index("notifications_workspace_idx").on(t.workspaceId),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NotificationType = Notification["type"];
