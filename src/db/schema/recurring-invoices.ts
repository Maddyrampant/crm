import { pgTable, text, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const recurrenceFrequency = pgEnum("recurrence_frequency", ["weekly", "monthly", "quarterly", "yearly"]);
export const recurrenceStatus = pgEnum("recurrence_status", ["active", "paused", "completed"]);

export const recurringInvoices = pgTable(
  "recurring_invoices",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    frequency: recurrenceFrequency("frequency").notNull().default("monthly"),
    status: recurrenceStatus("status").notNull().default("active"),
    templateItems: jsonb("template_items").$type<Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>>().notNull().default([]),
    discount: jsonb("discount").$type<{ type: "fixed" | "percent"; value: number }>(),
    taxRate: jsonb("tax_rate").$type<number>(),
    notes: text("notes"),
    nextGenerationAt: timestamp("next_generation_at", { withTimezone: true }),
    lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("recurring_invoices_workspace_idx").on(t.workspaceId),
    index("recurring_invoices_contact_idx").on(t.contactId),
  ]
);

export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
