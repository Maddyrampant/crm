import "server-only";

import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  contacts,
  deals,
  invoices,
  invoiceItems,
  pipelines,
  products,
  productCategories,
  stages,
  stockLevels,
  warehouses,
  wooStores,
  wooSyncLogs,
} from "@/db/schema";
import {
  createWooClient,
  type WooCustomer,
  type WooOrder,
  type WooProduct,
} from "./woocommerce-api";

const ORDER_STATUS_MAP: Record<string, "open" | "won" | "lost"> = {
  pending: "open",
  processing: "open",
  "on-hold": "open",
  completed: "won",
  cancelled: "lost",
  refunded: "lost",
  failed: "lost",
};

function parsePrice(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Buffer.from(sig).toString("base64");
  return expected === signature;
}

export async function logSyncEvent(params: {
  storeId: string;
  workspaceId: string;
  topic: string;
  resource: string;
  resourceId?: string;
  action: string;
  status: string;
  error?: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(wooSyncLogs).values({
    storeId: params.storeId,
    workspaceId: params.workspaceId,
    topic: params.topic,
    resource: params.resource,
    resourceId: params.resourceId ?? null,
    action: params.action,
    status: params.status,
    error: params.error ?? null,
    payload: params.payload ?? null,
  });
}

async function getOrCreateCompany(
  workspaceId: string,
  billing: WooCustomer["billing"] | WooOrder["billing"]
): Promise<string> {
  const companyName = billing.company?.trim();
  if (!companyName) return "";

  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.workspaceId, workspaceId), eq(companies.name, companyName)))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const address = [billing.address_1, billing.city, billing.state, billing.postcode, billing.country]
    .filter(Boolean)
    .join(", ");

  const [company] = await db
    .insert(companies)
    .values({
      workspaceId,
      name: companyName,
      address: address || null,
    })
    .returning();

  return company.id;
}

async function findOrCreateContact(
  workspaceId: string,
  billing: WooCustomer["billing"] | WooOrder["billing"],
  wooId: number,
  dateCreated?: string
): Promise<string> {
  const email = billing.email?.trim().toLowerCase();

  if (email) {
    const existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.email, email)))
      .limit(1);
    if (existing[0]) return existing[0].id;
  }

  const companyId = await getOrCreateCompany(workspaceId, billing);

  const [contact] = await db
    .insert(contacts)
    .values({
      workspaceId,
      firstName: billing.first_name || "مشتری",
      lastName: billing.last_name || null,
      email: email || null,
      phone: billing.phone || null,
      companyId: companyId || null,
      source: "other",
      lifecycleStage: "customer",
      customFields: {
        wooCustomerId: wooId,
        wooRegisteredAt: dateCreated ?? null,
      },
    })
    .returning();

  return contact.id;
}

async function findOrCreateProduct(
  workspaceId: string,
  wooProduct: WooProduct
): Promise<string> {
  const sku = wooProduct.sku || `WOO-${wooProduct.id}`;
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.workspaceId, workspaceId), eq(products.sku, sku)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(products)
      .set({
        name: wooProduct.name,
        unitPrice: wooProduct.price || "0",
        active: wooProduct.stock_status === "instock",
        notes: `WooCommerce ID: ${wooProduct.id}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing[0].id));
    return existing[0].id;
  }

  let categoryId: string | null = null;
  if (wooProduct.categories?.length > 0) {
    const catName = wooProduct.categories[0].name;
    const existingCat = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.workspaceId, workspaceId), eq(productCategories.name, catName)))
      .limit(1);
    if (existingCat[0]) {
      categoryId = existingCat[0].id;
    } else {
      const [newCat] = await db
        .insert(productCategories)
        .values({ workspaceId, name: catName })
        .returning();
      categoryId = newCat.id;
    }
  }

  const [product] = await db
    .insert(products)
    .values({
      workspaceId,
      name: wooProduct.name,
      sku,
      categoryId,
      unit: "عدد",
      unitPrice: wooProduct.price || "0",
      costPrice: "0",
      taxable: true,
      active: wooProduct.stock_status === "instock",
      notes: `WooCommerce ID: ${wooProduct.id}`,
    })
    .returning();

  const defaultWarehouse = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(eq(warehouses.workspaceId, workspaceId), eq(warehouses.isDefault, true)))
    .limit(1);

  if (defaultWarehouse[0] && wooProduct.stock_quantity != null) {
    await db.insert(stockLevels).values({
      workspaceId,
      productId: product.id,
      warehouseId: defaultWarehouse[0].id,
      quantity: String(wooProduct.stock_quantity),
    });
  }

  return product.id;
}

async function findOrCreateWooPipeline(workspaceId: string): Promise<{ pipelineId: string; stageId: string }> {
  const wooPipelineName = "فروشگاه آنلاین";
  const existing = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.name, wooPipelineName)))
    .limit(1);

  if (existing[0]) {
    const pipelineStages = await db
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.pipelineId, existing[0].id))
      .orderBy(stages.orderIndex)
      .limit(1);
    return {
      pipelineId: existing[0].id,
      stageId: pipelineStages[0]?.id ?? "",
    };
  }

  const [pipeline] = await db
    .insert(pipelines)
    .values({ workspaceId, name: wooPipelineName, isDefault: false })
    .returning();

  const [stage] = await db
    .insert(stages)
    .values({
      pipelineId: pipeline.id,
      name: "سفارش جدید",
      orderIndex: "0",
      color: "#3b82f6",
      winProbability: "0",
    })
    .returning();

  return { pipelineId: pipeline.id, stageId: stage.id };
}

export async function syncWooCustomer(
  workspaceId: string,
  storeId: string,
  customer: WooCustomer,
  action: "created" | "updated"
) {
  const billing = customer.billing;
  const contactId = await findOrCreateContact(workspaceId, billing, customer.id, customer.date_created);

  await db
    .update(contacts)
    .set({
      firstName: customer.first_name || billing.first_name || "مشتری",
      lastName: customer.last_name || billing.last_name || null,
      email: customer.email || billing.email || null,
      phone: billing.phone || null,
      customFields: {
        wooCustomerId: customer.id,
        wooRegisteredAt: customer.date_created,
        isPayingCustomer: customer.is_paying_customer,
      },
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  return contactId;
}

export async function syncWooOrder(
  workspaceId: string,
  storeId: string,
  order: WooOrder,
  action: "created" | "updated" | "deleted"
) {
  if (action === "deleted") {
    const existing = await db
      .select({ id: deals.id })
      .from(deals)
      .where(
        and(
          eq(deals.workspaceId, workspaceId),
          ilike(deals.title, `%#${order.id}%`)
        )
      )
      .limit(1);
    if (existing[0]) {
      await db.delete(deals).where(eq(deals.id, existing[0].id));
    }
    return null;
  }

  const contactId = await findOrCreateContact(workspaceId, order.billing, order.customer_id, order.date_created);

  const { pipelineId, stageId } = await findOrCreateWooPipeline(workspaceId);
  const dealStatus = ORDER_STATUS_MAP[order.status] ?? "open";

  const existingDeal = await db
    .select({ id: deals.id })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        ilike(deals.title, `%#${order.id}%`)
      )
    )
    .limit(1);

  if (existingDeal[0]) {
    await db
      .update(deals)
      .set({
        title: `سفارش ووکامرس #${order.number || order.id}`,
        amount: order.total,
        status: dealStatus,
        contactId,
        closeDate: dealStatus === "won" ? new Date(order.date_created) : null,
        wonAt: dealStatus === "won" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, existingDeal[0].id));
    return existingDeal[0].id;
  }

  const [deal] = await db
    .insert(deals)
    .values({
      workspaceId,
      pipelineId,
      stageId,
      title: `سفارش ووکامرس #${order.number || order.id}`,
      amount: order.total,
      contactId,
      status: dealStatus,
      closeDate: dealStatus === "won" ? new Date(order.date_created) : null,
      wonAt: dealStatus === "won" ? new Date() : null,
    })
    .returning();

  if (dealStatus === "won" && order.line_items?.length) {
    const [invoice] = await db
      .insert(invoices)
      .values({
        workspaceId,
        contactId,
        number: `WOO-${order.number || order.id}`,
        status: "paid",
        issuedAt: new Date(order.date_created),
        discount: order.discount_total || "0",
        taxRate: "0",
        total: order.total,
      })
      .returning();

    for (const item of order.line_items) {
      const sku = item.sku || `WOO-${item.product_id}`;
      const existingProduct = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.workspaceId, workspaceId), eq(products.sku, sku)))
        .limit(1);

      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        productId: existingProduct[0]?.id ?? null,
        description: item.name,
        quantity: String(item.quantity),
        unitPrice: item.price || "0",
        taxRate: "0",
        amount: item.total || "0",
      });
    }
  }

  return deal.id;
}

export async function syncWooProduct(
  workspaceId: string,
  storeId: string,
  wooProduct: WooProduct,
  action: "created" | "updated" | "deleted"
) {
  if (action === "deleted") {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.workspaceId, workspaceId),
          eq(products.sku, `WOO-${wooProduct.id}`)
        )
      )
      .limit(1);
    if (existing[0]) {
      await db.delete(products).where(eq(products.id, existing[0].id));
    }
    return null;
  }

  return findOrCreateProduct(workspaceId, wooProduct);
}

export async function handleWooWebhook(
  storeId: string,
  topic: string,
  resource: string,
  event: string,
  signature: string,
  rawBody: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const store = await db
    .select()
    .from(wooStores)
    .where(eq(wooStores.id, storeId))
    .limit(1);

  if (!store[0]) return { ok: false, error: "Store not found" };
  if (!store[0].active) return { ok: false, error: "Store is disabled" };

  const verified = await verifyWebhookSignature(rawBody, signature, store[0].webhookSecret);
  if (!verified) return { ok: false, error: "Invalid signature" };

  try {
    if (resource === "customer") {
      const customer = payload as unknown as WooCustomer;
      await syncWooCustomer(store[0].workspaceId, storeId, customer, event as "created" | "updated");
    } else if (resource === "order") {
      const order = payload as unknown as WooOrder;
      await syncWooOrder(store[0].workspaceId, storeId, order, event as "created" | "updated" | "deleted");
    } else if (resource === "product") {
      const product = payload as unknown as WooProduct;
      await syncWooProduct(store[0].workspaceId, storeId, product, event as "created" | "updated" | "deleted");
    }

    await db
      .update(wooStores)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(wooStores.id, storeId));

    await logSyncEvent({
      storeId,
      workspaceId: store[0].workspaceId,
      topic,
      resource,
      resourceId: String((payload as Record<string, unknown>).id ?? ""),
      action: event,
      status: "success",
      payload: payload as Record<string, unknown>,
    });

    return { ok: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await logSyncEvent({
      storeId,
      workspaceId: store[0].workspaceId,
      topic,
      resource,
      resourceId: String((payload as Record<string, unknown>).id ?? ""),
      action: event,
      status: "error",
      error: errorMsg,
      payload: payload as Record<string, unknown>,
    });
    return { ok: false, error: errorMsg };
  }
}
