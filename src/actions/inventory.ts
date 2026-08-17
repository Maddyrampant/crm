"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import {
  createProduct,
  createProductCategory,
  createPurchaseOrder,
  createSupplier,
  createWarehouse,
  deleteProduct,
  deleteProductCategory,
  deletePurchaseOrder,
  deleteSupplier,
  deleteWarehouse,
  getProduct,
  getPurchaseOrder,
  listLowStock,
  listProductCategories,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  listWarehouses,
  updateProduct,
  updatePurchaseOrderStatus,
  updateSupplier,
  updateWarehouse,
} from "@/services/inventory";

export async function listProductsAction(raw?: {
  search?: string;
  categoryId?: string;
  active?: "active" | "inactive";
  page?: number;
  sortBy?: "name" | "unitPrice" | "totalStock" | "createdAt";
  sortDir?: "asc" | "desc";
}) {
  const { workspaceId } = await requireWorkspace();
  return listProducts({
    workspaceId,
    search: raw?.search,
    categoryId: raw?.categoryId ?? null,
    active: raw?.active ?? null,
    page: raw?.page ?? 1,
    sortBy: raw?.sortBy,
    sortDir: raw?.sortDir,
  });
}

export async function getProductAction(productId: string) {
  const { workspaceId } = await requireWorkspace();
  return getProduct(workspaceId, productId);
}

export async function createProductAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createProduct(workspaceId, raw);
  revalidatePath("/products");
  return { ok: true, id: row.id };
}

export async function updateProductAction(productId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateProduct(workspaceId, productId, raw);
  revalidatePath("/products");
  return { ok: Boolean(row) };
}

export async function deleteProductAction(productId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteProduct(workspaceId, productId);
  revalidatePath("/products");
  return { ok: Boolean(row) };
}

export async function listProductCategoriesAction() {
  const { workspaceId } = await requireWorkspace();
  return listProductCategories(workspaceId);
}

export async function createProductCategoryAction(name: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createProductCategory(workspaceId, name);
  revalidatePath("/products");
  return { ok: true, id: row.id };
}

export async function deleteProductCategoryAction(categoryId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteProductCategory(workspaceId, categoryId);
  revalidatePath("/products");
  return { ok: Boolean(row) };
}

export async function listWarehousesAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  const result = await listWarehouses(workspaceId, params);
  return { items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages };
}

export async function createWarehouseAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createWarehouse(workspaceId, raw);
  revalidatePath("/warehouses");
  return { ok: true, id: row.id };
}

export async function updateWarehouseAction(warehouseId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateWarehouse(workspaceId, warehouseId, raw);
  revalidatePath("/warehouses");
  return { ok: Boolean(row) };
}

export async function deleteWarehouseAction(warehouseId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteWarehouse(workspaceId, warehouseId);
  revalidatePath("/warehouses");
  return { ok: Boolean(row) };
}

export async function listLowStockAction() {
  const { workspaceId } = await requireWorkspace();
  return listLowStock(workspaceId);
}

export async function listSuppliersAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  const result = await listSuppliers(workspaceId, params);
  return { items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages };
}

export async function createSupplierAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createSupplier(workspaceId, raw);
  revalidatePath("/purchases");
  return { ok: true, id: row.id };
}

export async function updateSupplierAction(supplierId: string, raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await updateSupplier(workspaceId, supplierId, raw);
  revalidatePath("/purchases");
  return { ok: Boolean(row) };
}

export async function deleteSupplierAction(supplierId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deleteSupplier(workspaceId, supplierId);
  revalidatePath("/purchases");
  return { ok: Boolean(row) };
}

export async function listPurchaseOrdersAction(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}) {
  const { workspaceId } = await requireWorkspace();
  const result = await listPurchaseOrders(workspaceId, params);
  return { items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages };
}

export async function getPurchaseOrderAction(orderId: string) {
  const { workspaceId } = await requireWorkspace();
  return getPurchaseOrder(workspaceId, orderId);
}

export async function createPurchaseOrderAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await createPurchaseOrder(workspaceId, raw);
  revalidatePath("/purchases");
  return { ok: true, id: row.id };
}

export async function updatePurchaseOrderStatusAction(
  orderId: string,
  status: "draft" | "ordered" | "received" | "cancelled"
) {
  const { user, workspaceId } = await requireWorkspaceRole("manager");
  const row = await updatePurchaseOrderStatus(workspaceId, user.id, orderId, status);
  revalidatePath("/purchases");
  revalidatePath(`/purchases/${orderId}`);
  return { ok: Boolean(row) };
}

export async function deletePurchaseOrderAction(orderId: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const row = await deletePurchaseOrder(workspaceId, orderId);
  revalidatePath("/purchases");
  return { ok: Boolean(row) };
}
