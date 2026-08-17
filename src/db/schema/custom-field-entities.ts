import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const customFieldEntityEnum = pgEnum("custom_field_entity", ["contact", "company", "deal"]);
export const customFieldDefTypeEnum = pgEnum("custom_field_def_type", ["text", "number", "date", "select", "multiselect", "boolean"]);

export const customFieldDefs = pgTable("custom_field_defs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  entity: customFieldEntityEnum("entity").notNull(),
  name: text("name").notNull(),
  type: customFieldDefTypeEnum("type").notNull().default("text"),
  options: jsonb("options").$type<string[]>(),
  required: boolean("required").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customFieldVals = pgTable("custom_field_vals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  entityId: uuid("entity_id").notNull(),
  entity: customFieldEntityEnum("entity").notNull(),
  fieldId: uuid("field_id").notNull(),
  value: text("value"),
});
