import type { ProductCategory, Product, Warehouse } from "@/db/schema";

/**
 * قرارداد مشترک ماژول انبارداری — هم‌بندی بین Part 2 (داده) و Part 1 (UI).
 * تایپ‌ها از schema می‌آیند؛ ثابت‌های نمایشی برای مصرف UI در اینجا.
 */

export const PRODUCT_UNITS = [
  "عدد",
  "کیلوگرم",
  "گرم",
  "متر",
  "مترمربع",
  "لیتر",
  "بسته",
  "کارتن",
  "سرویس",
  "ساعت",
  "جفت",
] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const STOCK_MOVEMENT_TYPES = [
  "opening",
  "purchase",
  "sale",
  "transfer",
  "adjustment",
  "return",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<
  StockMovementType,
  string
> = {
  opening: "موجودی اولیه",
  purchase: "خرید / رسید",
  sale: "فروش / خروج",
  transfer: "انتقال بین انبارها",
  adjustment: "اصلاح موجودی",
  return: "برگشت از فروش",
};

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "ordered",
  "received",
  "cancelled",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrderStatus,
  string
> = {
  draft: "پیش‌نویس",
  ordered: "سفارش‌شده",
  received: "دریافت‌شده",
  cancelled: "لغوشده",
};

/** متادیتای نمایش محصول — برای ستون‌ها و نشان‌ها */
export const PRODUCT_ACTIVE_LABEL: Record<"active" | "inactive", string> = {
  active: "فعال",
  inactive: "غیرفعال",
};

export type ProductWithStock = Product & { totalStock: number; categoryName?: string | null };
export type WarehouseWithCount = Warehouse & { productCount: number };
export type CategoryWithCount = ProductCategory & { productCount: number };
