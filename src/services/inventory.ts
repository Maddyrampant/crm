import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  productCategories,
  products,
  purchaseOrderItems,
  purchaseOrders,
  stockLevels,
  stockMovements,
  suppliers,
  warehouses,
  type StockMovementTypeEnum,
} from "@/db/schema";
import { notifyWorkspace } from "./notifications";
import type { ProductWithStock } from "@/lib/inventory";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";
import { invalidateInventoryCache, invalidateWorkspaceCache } from "@/lib/cache-invalidate";

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/* ─────────────────── کالاها ─────────────────── */

export const productSchema = z.object({
  name: z.string().trim().min(1, "نام کالا را وارد کنید").max(200),
  sku: z.string().trim().min(1, "کد کالا را وارد کنید").max(100),
  categoryId: z.string().nullable().optional(),
  barcode: z.string().trim().max(100).nullable().optional(),
  unit: z.string().trim().min(1).max(30).default("عدد"),
  unitPrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  taxable: z.boolean().default(true),
  active: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type ProductInput = z.infer<typeof productSchema>;

export type ProductFilters = {
  workspaceId: string;
  search?: string;
  categoryId?: string | null;
  active?: "active" | "inactive" | null;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "unitPrice" | "totalStock" | "createdAt";
  sortDir?: "asc" | "desc";
};

export async function listProducts(filters: ProductFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const conditions: SQL[] = [eq(products.workspaceId, filters.workspaceId)];
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.active) conditions.push(eq(products.active, filters.active === "active"));
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(products.name, q), ilike(products.sku, q), ilike(products.barcode, q))!
    );
  }

  const sortCol =
    filters.sortBy === "name"
      ? products.name
      : filters.sortBy === "unitPrice"
        ? products.unitPrice
        : filters.sortBy === "totalStock"
          ? sql`coalesce(sum(${stockLevels.quantity}::numeric), 0)`
          : products.createdAt;
  const sortOrder = filters.sortDir === "asc" ? asc(sortCol) : desc(sortCol);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        product: products,
        categoryName: productCategories.name,
        totalStock: sql<string>`coalesce(sum(${stockLevels.quantity}::numeric), 0)::text`,
      })
      .from(products)
      .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
      .leftJoin(stockLevels, eq(stockLevels.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.id, productCategories.name)
      .orderBy(sortOrder)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions)),
  ]);

  const items: ProductWithStock[] = rows.map((r) => ({
    ...r.product,
    totalStock: num(r.totalStock),
    categoryName: r.categoryName,
  }));

  return { items, total: Number(totalRow[0]?.value ?? 0) };
}

export async function getProduct(workspaceId: string, productId: string) {
  const [row] = await db
    .select({
      product: products,
      categoryName: productCategories.name,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(
      and(eq(products.id, productId), eq(products.workspaceId, workspaceId))
    )
    .limit(1);
  if (!row) return null;

  const stockRows = await db
    .select({ level: stockLevels, warehouseName: warehouses.name })
    .from(stockLevels)
    .leftJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
    .where(eq(stockLevels.productId, productId));

  const movements = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(20);

  return {
    ...row.product,
    categoryName: row.categoryName,
    stock: stockRows.map((s) => ({
      ...s.level,
      quantity: num(s.level.quantity),
      warehouseName: s.warehouseName,
    })),
    totalStock: stockRows.reduce((acc, s) => acc + num(s.level.quantity), 0),
    movements,
  };
}

export async function createProduct(workspaceId: string, raw: unknown) {
  const input = productSchema.parse(raw);
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.workspaceId, workspaceId),
        eq(products.sku, input.sku)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw new Error("کد کالا (SKU) تکراری است");
  }
  const [row] = await db
    .insert(products)
    .values({
      workspaceId,
      name: input.name,
      sku: input.sku,
      categoryId: input.categoryId || null,
      barcode: input.barcode || null,
      unit: input.unit,
      unitPrice: String(round2(input.unitPrice)),
      costPrice: String(round2(input.costPrice)),
      taxable: input.taxable,
      active: input.active,
      notes: input.notes || null,
    })
    .returning();
  await invalidateInventoryCache(workspaceId);
  return row;
}

export async function updateProduct(
  workspaceId: string,
  productId: string,
  raw: unknown
) {
  const input = productSchema.partial().parse(raw);
  if (input.sku !== undefined) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.workspaceId, workspaceId),
          eq(products.sku, input.sku),
          ne(products.id, productId)
        )
      )
      .limit(1);
    if (existing[0]) throw new Error("کد کالا (SKU) تکراری است");
  }
  const [row] = await db
    .update(products)
    .set({
      name: input.name,
      sku: input.sku,
      categoryId: input.categoryId !== undefined ? input.categoryId || null : undefined,
      barcode: input.barcode,
      unit: input.unit,
      unitPrice: input.unitPrice !== undefined ? String(round2(input.unitPrice)) : undefined,
      costPrice: input.costPrice !== undefined ? String(round2(input.costPrice)) : undefined,
      taxable: input.taxable,
      active: input.active,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.workspaceId, workspaceId)))
    .returning();
  if (row) await invalidateInventoryCache(workspaceId);
  return row ?? null;
}

export async function deleteProduct(workspaceId: string, productId: string) {
  const [row] = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.workspaceId, workspaceId)))
    .returning({ id: products.id });
  if (row) await invalidateInventoryCache(workspaceId);
  return row ?? null;
}

/* ─────────────────── دسته‌بندی‌ها ─────────────────── */

export async function listProductCategories(workspaceId: string) {
  const rows = await db
    .select({
      category: productCategories,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(productCategories)
    .leftJoin(products, eq(products.categoryId, productCategories.id))
    .where(eq(productCategories.workspaceId, workspaceId))
    .groupBy(productCategories.id)
    .orderBy(desc(productCategories.createdAt));
  return rows.map((r) => ({ ...r.category, productCount: Number(r.productCount) }));
}

export async function createProductCategory(workspaceId: string, name: string) {
  const clean = name.trim();
  if (!clean) throw new Error("نام دسته‌بندی را وارد کنید");
  const [row] = await db
    .insert(productCategories)
    .values({ workspaceId, name: clean })
    .returning();
  return row;
}

export async function deleteProductCategory(workspaceId: string, categoryId: string) {
  const [row] = await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.workspaceId, workspaceId)
      )
    )
    .returning({ id: productCategories.id });
  return row ?? null;
}

/* ─────────────────── انبارها ─────────────────── */

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "نام انبار را وارد کنید").max(120),
  code: z.string().trim().max(50).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

async function clearDefaultWarehouse(workspaceId: string, exceptId?: string) {
  const conditions: SQL[] = [
    eq(warehouses.workspaceId, workspaceId),
    eq(warehouses.isDefault, true),
  ];
  if (exceptId) conditions.push(ne(warehouses.id, exceptId));
  await db
    .update(warehouses)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(...conditions));
}

export async function listWarehouses(
  workspaceId: string,
  params?: { page?: number; pageSize?: number; search?: string }
): Promise<PaginatedResult<typeof warehouses.$inferSelect & { productCount: number }>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions: SQL[] = [eq(warehouses.workspaceId, workspaceId)];
  if (params?.search?.trim()) {
    conditions.push(ilike(warehouses.name, `%${params.search.trim()}%`));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select({
        warehouse: warehouses,
        productCount: sql<number>`count(distinct ${stockLevels.productId})::int`,
      })
      .from(warehouses)
      .leftJoin(stockLevels, eq(stockLevels.warehouseId, warehouses.id))
      .where(where)
      .groupBy(warehouses.id)
      .orderBy(desc(warehouses.isDefault))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(warehouses)
      .where(where),
  ]);

  const mapped = items.map((r) => ({
    ...r.warehouse,
    productCount: Number(r.productCount),
  }));

  return buildPaginatedResult(mapped, totalRow[0]?.count ?? 0, page, pageSize);
}

export async function createWarehouse(workspaceId: string, raw: unknown) {
  const input = warehouseSchema.parse(raw);
  if (input.isDefault) await clearDefaultWarehouse(workspaceId);
  const [row] = await db
    .insert(warehouses)
    .values({
      workspaceId,
      name: input.name,
      code: input.code || null,
      location: input.location || null,
      isDefault: input.isDefault,
      active: input.active,
    })
    .returning();
  return row;
}

export async function updateWarehouse(
  workspaceId: string,
  warehouseId: string,
  raw: unknown
) {
  const input = warehouseSchema.partial().parse(raw);
  if (input.isDefault) await clearDefaultWarehouse(workspaceId, warehouseId);
  const [row] = await db
    .update(warehouses)
    .set({
      name: input.name,
      code: input.code,
      location: input.location,
      isDefault: input.isDefault,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function deleteWarehouse(workspaceId: string, warehouseId: string) {
  const [row] = await db
    .delete(warehouses)
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.workspaceId, workspaceId)
      )
    )
    .returning({ id: warehouses.id });
  return row ?? null;
}

/* ─────────────────── موجودی ─────────────────── */

export type AdjustStockInput = {
  productId: string;
  warehouseId: string;
  quantity: number;
  type: StockMovementTypeEnum;
  reference?: string;
  notes?: string;
};

/** تغییر موجودی یک کالا در یک انبار (مقدار مثبت = ورود، منفی = خروج) + ثبت گردش. */
export async function adjustStock(
  workspaceId: string,
  userId: string | null,
  input: AdjustStockInput
) {
  const qty = round3(input.quantity);
  if (qty === 0) return null;

  const [existing] = await db
    .select()
    .from(stockLevels)
    .where(
      and(
        eq(stockLevels.productId, input.productId),
        eq(stockLevels.warehouseId, input.warehouseId)
      )
    )
    .limit(1);

  const prevTotal = existing ? num(existing.quantity) : 0;
  const newTotal = round3(prevTotal + qty);

  if (existing) {
    await db
      .update(stockLevels)
      .set({ quantity: String(newTotal), updatedAt: new Date() })
      .where(eq(stockLevels.id, existing.id));
  } else {
    await db.insert(stockLevels).values({
      workspaceId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: String(newTotal),
    });
  }

  await db.insert(stockMovements).values({
    workspaceId,
    productId: input.productId,
    warehouseId: input.warehouseId,
    type: input.type,
    quantity: String(qty),
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    userId,
  });

  await checkLowStock(workspaceId, input.productId, prevTotal);
  await invalidateInventoryCache(workspaceId);
  return { prevTotal, newTotal };
}

/** بررسی کسری موجودی نسبت به نقطه سفارش مجدد — فقط هنگام عبور از آستانه اعلان می‌دهد. */
async function checkLowStock(
  workspaceId: string,
  productId: string,
  prevTotal: number
) {
  const [agg] = await db
    .select({
      total: sql<string>`coalesce(sum(${stockLevels.quantity}::numeric), 0)::text`,
    })
    .from(stockLevels)
    .where(eq(stockLevels.productId, productId));
  const total = num(agg?.total);

  const [level] = await db
    .select({ reorderLevel: stockLevels.reorderLevel })
    .from(stockLevels)
    .where(eq(stockLevels.productId, productId))
    .limit(1);

  if (!level?.reorderLevel) return;
  const threshold = num(level.reorderLevel);
  if (prevTotal > threshold && total <= threshold) {
    const [product] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    await notifyWorkspace({
      workspaceId,
      type: "system",
      title: "موجودی کالا کمتر از حد مجاز شد",
      body: `موجودی «${product?.name ?? ""}» به ${total} رسید.`,
      link: "/products",
      data: { productId, total },
    });
  }
}

/** موجودی هر کالا به‌تفکیک انبار. */
export async function getStockLevels(workspaceId: string, productId: string) {
  return db
    .select({ level: stockLevels, warehouseName: warehouses.name })
    .from(stockLevels)
    .leftJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
    .where(
      and(
        eq(stockLevels.productId, productId),
        eq(stockLevels.workspaceId, workspaceId)
      )
    )
    .orderBy(warehouses.isDefault);
}

/** کالاهایی که موجودی آن‌ها کمتر/مساوی نقطه سفارش مجدد است. */
export async function listLowStock(workspaceId: string, limit = 50) {
  const rows = await db
    .select({
      product: products,
      totalStock: sql<string>`coalesce(sum(${stockLevels.quantity}::numeric), 0)::text`,
    })
    .from(stockLevels)
    .innerJoin(products, eq(products.id, stockLevels.productId))
    .where(
      and(
        eq(stockLevels.workspaceId, workspaceId),
        sql`${stockLevels.reorderLevel} is not null`
      )
    )
    .groupBy(products.id)
    .having(
      sql`coalesce(sum(${stockLevels.quantity}::numeric), 0) <= min(${stockLevels.reorderLevel}::numeric)`
    )
    .orderBy(sql`coalesce(sum(${stockLevels.quantity}::numeric), 0)`)
    .limit(limit);
  return rows.map((r) => ({
    ...r.product,
    totalStock: num(r.totalStock),
  })) as ProductWithStock[];
}

/** کالاهای کم‌موجودی به تفکیک ورک‌اسپیس — یک query برای همه (نه N query). */
export async function listAllLowStock(limit = 20) {
  const rows = await db
    .select({
      workspaceId: stockLevels.workspaceId,
      productName: products.name,
      totalStock: sql<string>`coalesce(sum(${stockLevels.quantity}::numeric), 0)::text`,
    })
    .from(stockLevels)
    .innerJoin(products, eq(products.id, stockLevels.productId))
    .where(sql`${stockLevels.reorderLevel} is not null`)
    .groupBy(stockLevels.workspaceId, products.id)
    .having(
      sql`coalesce(sum(${stockLevels.quantity}::numeric), 0) <= min(${stockLevels.reorderLevel}::numeric)`
    )
    .orderBy(sql`coalesce(sum(${stockLevels.quantity}::numeric), 0)`)
    .limit(limit);

  const byWorkspace = new Map<string, { name: string; totalStock: number }[]>();
  for (const r of rows) {
    const list = byWorkspace.get(r.workspaceId) ?? [];
    list.push({ name: r.productName, totalStock: num(r.totalStock) });
    byWorkspace.set(r.workspaceId, list);
  }
  return byWorkspace;
}

/* ─────────────────── تأمین‌کنندگان ─────────────────── */

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "نام تأمین‌کننده را وارد کنید").max(200),
  contactName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(200).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export async function listSuppliers(
  workspaceId: string,
  params?: { page?: number; pageSize?: number; search?: string }
): Promise<PaginatedResult<typeof suppliers.$inferSelect>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions: SQL[] = [eq(suppliers.workspaceId, workspaceId)];
  if (params?.search?.trim()) {
    conditions.push(ilike(suppliers.name, `%${params.search.trim()}%`));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(desc(suppliers.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(suppliers)
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

export async function createSupplier(workspaceId: string, raw: unknown) {
  const input = supplierSchema.parse(raw);
  const [row] = await db
    .insert(suppliers)
    .values({
      workspaceId,
      name: input.name,
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
    })
    .returning();
  return row;
}

export async function updateSupplier(
  workspaceId: string,
  supplierId: string,
  raw: unknown
) {
  const input = supplierSchema.partial().parse(raw);
  const [row] = await db
    .update(suppliers)
    .set({
      name: input.name,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(suppliers.id, supplierId),
        eq(suppliers.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function deleteSupplier(workspaceId: string, supplierId: string) {
  const [row] = await db
    .delete(suppliers)
    .where(
      and(
        eq(suppliers.id, supplierId),
        eq(suppliers.workspaceId, workspaceId)
      )
    )
    .returning({ id: suppliers.id });
  return row ?? null;
}

/* ─────────────────── سفارش خرید ─────────────────── */

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "کالا را انتخاب کنید"),
  quantity: z.coerce.number().positive("تعداد باید مثبت باشد").default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().nullable().optional(),
  expectedAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(2000).optional().default(""),
  items: z.array(purchaseOrderItemSchema).min(1, "حداقل یک آیتم لازم است"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

async function nextPurchaseOrderNumber(workspaceId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.workspaceId, workspaceId));
  return `PO-${String((row?.count ?? 0) + 1).padStart(5, "0")}`;
}

export async function listPurchaseOrders(
  workspaceId: string,
  params?: { page?: number; pageSize?: number; status?: string; search?: string }
): Promise<PaginatedResult<typeof purchaseOrders.$inferSelect & { supplierName: string | null; itemCount: number }>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions: SQL[] = [eq(purchaseOrders.workspaceId, workspaceId)];
  if (params?.status) {
    conditions.push(eq(purchaseOrders.status, params.status as typeof purchaseOrders.$inferSelect.status));
  }
  if (params?.search?.trim()) {
    conditions.push(ilike(purchaseOrders.number, `%${params.search.trim()}%`));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select({
        order: purchaseOrders,
        supplierName: suppliers.name,
        itemCount: sql<number>`count(${purchaseOrderItems.id})::int`,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(purchaseOrderItems, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(where)
      .groupBy(purchaseOrders.id, suppliers.name)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(where),
  ]);

  const mapped = items.map((r) => ({
    ...r.order,
    supplierName: r.supplierName,
    itemCount: Number(r.itemCount),
  }));

  return buildPaginatedResult(mapped, totalRow[0]?.count ?? 0, page, pageSize);
}

export async function getPurchaseOrder(workspaceId: string, orderId: string) {
  const [row] = await db
    .select({ order: purchaseOrders, supplierName: suppliers.name })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .where(
      and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.workspaceId, workspaceId))
    )
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
      item: purchaseOrderItems,
      productName: products.name,
      unit: products.unit,
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(products.id, purchaseOrderItems.productId))
    .where(eq(purchaseOrderItems.purchaseOrderId, orderId));
  return { ...row.order, supplierName: row.supplierName, items };
}

export async function createPurchaseOrder(
  workspaceId: string,
  raw: unknown
) {
  const input = purchaseOrderSchema.parse(raw);
  const number = await nextPurchaseOrderNumber(workspaceId);
  const [order] = await db
    .insert(purchaseOrders)
    .values({
      workspaceId,
      supplierId: input.supplierId || null,
      number,
      status: "draft",
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
      notes: input.notes || null,
    })
    .returning();

  await db.insert(purchaseOrderItems).values(
    input.items.map((it) => ({
      purchaseOrderId: order.id,
      productId: it.productId,
      quantity: String(round3(it.quantity)),
      unitPrice: String(round2(it.unitPrice)),
    }))
  );
  return order;
}

export async function updatePurchaseOrderStatus(
  workspaceId: string,
  userId: string | null,
  orderId: string,
  status: "draft" | "ordered" | "received" | "cancelled"
) {
  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.workspaceId, workspaceId))
    )
    .limit(1);
  if (!order) return null;

  const [updated] = await db
    .update(purchaseOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, orderId))
    .returning();

  if (status === "received" && order.status !== "received") {
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    const [defaultWh] = await db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.workspaceId, workspaceId),
          eq(warehouses.isDefault, true)
        )
      )
      .limit(1);
    if (defaultWh) {
      for (const it of items) {
        if (!it.productId) continue;
        await adjustStock(
          workspaceId,
          userId,
          {
            productId: it.productId,
            warehouseId: defaultWh.id,
            quantity: num(it.quantity),
            type: "purchase",
            reference: order.number,
          }
        );
      }
    }
  }
  return updated;
}

export async function deletePurchaseOrder(workspaceId: string, orderId: string) {
  const [row] = await db
    .delete(purchaseOrders)
    .where(
      and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.workspaceId, workspaceId))
    )
    .returning({ id: purchaseOrders.id });
  return row ?? null;
}

/* ─────────────────── ایمپورت CSV ─────────────────── */

import { parse } from "csv-parse/sync";

function escapeCsvValue(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function parseSimpleCsv(csv: string): { headers: string[]; rows: string[][] } {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  const delimChar = [",", ";", "\t"]
    .map((d) => ({ d, n: firstLine.split(d).length - 1 }))
    .reduce((a, b) => (b.n > a.n ? b : a), { d: ",", n: 0 });
  const delimiter = delimChar.n > 0 ? delimChar.d : ",";

  const raw = parse(csv, {
    bom: true,
    delimiter,
    skipEmptyLines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    columns: false,
  }) as string[][];

  if (raw.length === 0) return { headers: [], rows: [] };
  return { headers: raw[0], rows: raw.slice(1) };
}

function normalizeHeader(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ProductsImportSummary = {
  totalRows: number;
  created: number;
  errors: { row: number; message: string }[];
};

const PRODUCT_HEADER_MAP: Record<string, keyof typeof productSchema.shape> = {
  "نام": "name",
  "name": "name",
  "کد کالا": "sku",
  "sku": "sku",
  "بارکد": "barcode",
  "barcode": "barcode",
  "واحد": "unit",
  "unit": "unit",
  "قیمت فروش": "unitPrice",
  "unit price": "unitPrice",
  "unitprice": "unitPrice",
  "قیمت تمام شده": "costPrice",
  "cost price": "costPrice",
  "costprice": "costPrice",
  "مشمول مالیات": "taxable",
  "taxable": "taxable",
  "وضعیت": "active",
  "active": "active",
  "یادداشت": "notes",
  "notes": "notes",
};

export async function importProductsCsv(workspaceId: string, csv: string): Promise<ProductsImportSummary> {
  const { headers, rows } = parseSimpleCsv(csv);
  const normalizedHeaders = headers.map(normalizeHeader);

  const colMap = new Map<string, number>();
  normalizedHeaders.forEach((h, i) => {
    if (h && !colMap.has(h)) colMap.set(h, i);
  });

  const mapped = new Map<string, number>();
  for (const [label, key] of Object.entries(PRODUCT_HEADER_MAP)) {
    const idx = colMap.get(normalizeHeader(label));
    if (idx !== undefined) mapped.set(key, idx);
  }

  if (!mapped.has("name")) {
    throw new Error("ستون «نام» یافت نشد");
  }
  if (!mapped.has("sku")) {
    throw new Error("ستون «کد کالا» یافت نشد");
  }

  const summary: ProductsImportSummary = { totalRows: rows.length, created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const cells = rows[i];
    const name = (cells[mapped.get("name")!] ?? "").trim();
    const sku = (cells[mapped.get("sku")!] ?? "").trim();

    if (!name || !sku) {
      summary.errors.push({ row: rowNum, message: "نام یا کد کالا خالی است" });
      continue;
    }

    const raw: Record<string, unknown> = { name, sku };
    const barcode = cells[mapped.get("barcode")!] ?? "";
    const unit = cells[mapped.get("unit")!] ?? "";
    const unitPrice = cells[mapped.get("unitPrice")!] ?? "";
    const costPrice = cells[mapped.get("costPrice")!] ?? "";
    const taxable = cells[mapped.get("taxable")!] ?? "";
    const active = cells[mapped.get("active")!] ?? "";
    const notes = cells[mapped.get("notes")!] ?? "";

    if (barcode) raw.barcode = barcode.trim();
    if (unit) raw.unit = unit.trim();
    if (unitPrice) raw.unitPrice = Number(unitPrice.replace(/[^\d.\-]/g, "")) || 0;
    if (costPrice) raw.costPrice = Number(costPrice.replace(/[^\d.\-]/g, "")) || 0;
    if (taxable) raw.taxable = taxable.trim() === "بله" || taxable.trim().toLowerCase() === "yes" || taxable.trim() === "true";
    if (active) raw.active = !(active.trim() === "غیرفعال" || active.trim().toLowerCase() === "inactive" || active.trim() === "false");
    if (notes) raw.notes = notes.trim();

    try {
      await createProduct(workspaceId, raw);
      summary.created++;
    } catch (e) {
      summary.errors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : "خطای ناشناخته",
      });
    }
  }

  return summary;
}

export type SuppliersImportSummary = {
  totalRows: number;
  created: number;
  errors: { row: number; message: string }[];
};

const SUPPLIER_HEADER_MAP: Record<string, keyof typeof supplierSchema.shape> = {
  "نام": "name",
  "name": "name",
  "شخص تماس": "contactName",
  "contact person": "contactName",
  "contactname": "contactName",
  "موبایل": "phone",
  "تلفن": "phone",
  "phone": "phone",
  "mobile": "phone",
  "ایمیل": "email",
  "email": "email",
  "آدرس": "address",
  "address": "address",
  "یادداشت": "notes",
  "notes": "notes",
};

export async function importSuppliersCsv(workspaceId: string, csv: string): Promise<SuppliersImportSummary> {
  const { headers, rows } = parseSimpleCsv(csv);
  const normalizedHeaders = headers.map(normalizeHeader);

  const colMap = new Map<string, number>();
  normalizedHeaders.forEach((h, i) => {
    if (h && !colMap.has(h)) colMap.set(h, i);
  });

  const mapped = new Map<string, number>();
  for (const [label, key] of Object.entries(SUPPLIER_HEADER_MAP)) {
    const idx = colMap.get(normalizeHeader(label));
    if (idx !== undefined) mapped.set(key, idx);
  }

  if (!mapped.has("name")) {
    throw new Error("ستون «نام» یافت نشد");
  }

  const summary: SuppliersImportSummary = { totalRows: rows.length, created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const cells = rows[i];
    const name = (cells[mapped.get("name")!] ?? "").trim();

    if (!name) {
      summary.errors.push({ row: rowNum, message: "نام تأمین‌کننده خالی است" });
      continue;
    }

    const raw: Record<string, unknown> = { name };
    const contactName = cells[mapped.get("contactName")!] ?? "";
    const phone = cells[mapped.get("phone")!] ?? "";
    const email = cells[mapped.get("email")!] ?? "";
    const address = cells[mapped.get("address")!] ?? "";
    const notes = cells[mapped.get("notes")!] ?? "";

    if (contactName) raw.contactName = contactName.trim();
    if (phone) raw.phone = phone.trim();
    if (email) raw.email = email.trim();
    if (address) raw.address = address.trim();
    if (notes) raw.notes = notes.trim();

    try {
      await createSupplier(workspaceId, raw);
      summary.created++;
    } catch (e) {
      summary.errors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : "خطای ناشناخته",
      });
    }
  }

  return summary;
}
