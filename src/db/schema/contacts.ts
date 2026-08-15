import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const leadSource = pgEnum("lead_source", [
  "website",
  "referral",
  "social",
  "cold_call",
  "advertisement",
  "other",
]);

export const lifecycleStage = pgEnum("lifecycle_stage", [
  "lead",
  "prospect",
  "customer",
  "inactive",
]);

export const customFieldType = pgEnum("custom_field_type", [
  "text",
  "number",
  "date",
  "select",
]);

export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  website: text("website"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  companyId: text("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  source: leadSource("source").notNull().default("other"),
  lifecycleStage: lifecycleStage("lifecycle_stage")
    .notNull()
    .default("lead"),
  ownerId: text("owner_id").references(() => user.id, {
    onDelete: "set null",
  }),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tags = pgTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.tagId] })]
);

export const customFields = pgTable("custom_fields", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull(),
  type: customFieldType("type").notNull().default("text"),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contactRelations = relations(contacts, ({ many, one }) => ({
  tags: many(contactTags),
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
}));

export const companyRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
}));

export type Contact = typeof contacts.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CustomField = typeof customFields.$inferSelect;
