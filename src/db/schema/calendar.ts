import {
  pgTable,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";
import { user } from "./auth";

export const appointmentType = pgEnum("appointment_type", [
  "meeting",
  "call",
  "follow_up",
  "demo",
  "other",
]);

export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);
export const taskStatus = pgEnum("task_status", [
  "open",
  "in_progress",
  "done",
  "cancelled",
]);
export const reminderChannel = pgEnum("reminder_channel", [
  "in_app",
  "email",
  "sms",
]);

export const appointments = pgTable("appointments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  type: appointmentType("type").notNull().default("meeting"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  priority: taskPriority("priority").notNull().default("medium"),
  status: taskStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const reminders = pgTable("reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, {
    onDelete: "cascade",
  }),
  appointmentId: text("appointment_id").references(() => appointments.id, {
    onDelete: "cascade",
  }),
  remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
  channel: reminderChannel("channel").notNull().default("in_app"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
