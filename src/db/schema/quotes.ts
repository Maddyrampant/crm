import { pgTable, text, timestamp, uuid, numeric, date, pgEnum, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { contacts } from "./contacts";

export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "accepted", "rejected", "expired"]);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    contactId: text("contact_id").notNull().references(() => contacts.id),
    number: text("number").notNull(),
    status: quoteStatusEnum("status").notNull().default("draft"),
    validUntil: date("valid_until"),
    subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("quotes_workspace_idx").on(t.workspaceId),
    index("quotes_contact_idx").on(t.contactId),
  ]
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull().default("1"),
    unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  },
  (t) => [index("quote_items_quote_idx").on(t.quoteId)]
);

export type Quote = typeof quotes.$inferSelect;
export type QuoteItem = typeof quoteItems.$inferSelect;
