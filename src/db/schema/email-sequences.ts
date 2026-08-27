import { pgTable, text, timestamp, pgEnum, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const sequenceStatus = pgEnum("sequence_status", ["draft", "active", "paused", "completed"]);
export const sequenceStepStatus = pgEnum("sequence_step_status", ["pending", "sent", "skipped"]);

export const emailSequences = pgTable(
  "email_sequences",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: sequenceStatus("status").notNull().default("draft"),
    totalEnrolled: integer("total_enrolled").notNull().default(0),
    totalSent: integer("total_sent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_sequences_workspace_idx").on(t.workspaceId)]
);

export const emailSequenceSteps = pgTable(
  "email_sequence_steps",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sequenceId: text("sequence_id")
      .notNull()
      .references(() => emailSequences.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    delayDays: integer("delay_days").notNull().default(1),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_sequence_steps_sequence_idx").on(t.sequenceId)]
);

export const emailSequenceEnrollments = pgTable(
  "email_sequence_enrollments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sequenceId: text("sequence_id")
      .notNull()
      .references(() => emailSequences.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    status: sequenceStepStatus("status").notNull().default("pending"),
    nextSendAt: timestamp("next_send_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("email_seq_enrollments_seq_contact_uq").on(t.sequenceId, t.contactId),
    index("email_seq_enrollments_sequence_idx").on(t.sequenceId),
    index("email_seq_enrollments_contact_idx").on(t.contactId),
  ]
);

export const emailSequenceRelations = relations(emailSequences, ({ many }) => ({
  steps: many(emailSequenceSteps),
  enrollments: many(emailSequenceEnrollments),
}));

export const emailSequenceStepRelations = relations(emailSequenceSteps, ({ one }) => ({
  sequence: one(emailSequences, { fields: [emailSequenceSteps.sequenceId], references: [emailSequences.id] }),
}));

export const emailSequenceEnrollmentRelations = relations(emailSequenceEnrollments, ({ one }) => ({
  sequence: one(emailSequences, { fields: [emailSequenceEnrollments.sequenceId], references: [emailSequences.id] }),
  contact: one(contacts, { fields: [emailSequenceEnrollments.contactId], references: [contacts.id] }),
}));

export type EmailSequence = typeof emailSequences.$inferSelect;
export type EmailSequenceStep = typeof emailSequenceSteps.$inferSelect;
export type EmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferSelect;
