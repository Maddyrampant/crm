import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { user } from "./auth";

export const stockMovementType = pgEnum("stock_movement_type", [
  "opening",
  "purchase",
  "sale",
  "transfer",
  "adjustment",
  "return",
]);

export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "received",
  "cancelled",
]);

export const productCategories = pgTable("product_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    unit: text("unit").notNull().default("عدد"),
    unitPrice: numeric("unit_price", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    costPrice: numeric("cost_price", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    taxable: boolean("taxable").notNull().default(true),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("products_workspace_sku_idx").on(t.workspaceId, t.sku),
    index("products_workspace_idx").on(t.workspaceId),
  ]
);

export const warehouses = pgTable(
  "warehouses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    location: text("location"),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("warehouses_workspace_idx").on(t.workspaceId)]
);

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 18, scale: 3 })
      .notNull()
      .default("0"),
    reorderLevel: numeric("reorder_level", { precision: 18, scale: 3 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("stock_levels_product_warehouse_idx").on(t.productId, t.warehouseId),
    index("stock_levels_workspace_idx").on(t.workspaceId),
  ]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    warehouseId: text("warehouse_id").references(() => warehouses.id, {
      onDelete: "set null",
    }),
    type: stockMovementType("type").notNull().default("adjustment"),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
    reference: text("reference"),
    notes: text("notes"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)]
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("suppliers_workspace_idx").on(t.workspaceId)]
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    number: text("number").notNull(),
    status: purchaseOrderStatus("status").notNull().default("draft"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    expectedAt: timestamp("expected_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("purchase_orders_workspace_idx").on(t.workspaceId)]
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    quantity: numeric("quantity", { precision: 18, scale: 3 })
      .notNull()
      .default("1"),
    unitPrice: numeric("unit_price", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("purchase_order_items_purchase_order_idx").on(t.purchaseOrderId)]
);

export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type StockLevel = typeof stockLevels.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type StockMovementTypeEnum = typeof stockMovements.$inferSelect["type"];
export type PurchaseOrderStatusEnum = typeof purchaseOrders.$inferSelect["status"];
