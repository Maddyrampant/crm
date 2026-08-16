import type { NotificationType } from "@/db/schema";

/**
 * قرارداد مشترک اعلان‌ها — هم‌بندی بین Part 2 (سرویس/اکشن) و Part 1 (UI).
 * نوع‌ها از schema می‌آیند؛ متادیتای نمایش در اینجا برای مصرف UI.
 */

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; icon: string }
> = {
  invoice: { label: "فاکتور", icon: "file-text" },
  payment: { label: "پرداخت", icon: "banknote" },
  deal: { label: "فرصت فروش", icon: "trophy" },
  task: { label: "تسک", icon: "check-square" },
  appointment: { label: "قرار ملاقات", icon: "calendar" },
  ai: { label: "دستیار هوش مصنوعی", icon: "smart-toy" },
  contact: { label: "مخاطب", icon: "user" },
  system: { label: "سیستم", icon: "settings" },
};

export const NOTIFICATION_TYPES = Object.keys(
  NOTIFICATION_TYPE_META
) as NotificationType[];
