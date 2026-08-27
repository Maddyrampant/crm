import { pgTable, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { deals } from "./pipelines";
import { products } from "./inventory";

export const dealProducts = pgTable(
  "deal_products",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    dealId: text("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull().default("1"),
    unitPrice: numeric("unit_price", { precision: 18, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 18, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("deal_products_workspace_idx").on(t.workspaceId),
    index("deal_products_deal_idx").on(t.dealId),
    index("deal_products_product_idx").on(t.productId),
  ]
);

export type DealProduct = typeof dealProducts.$inferSelect;
