import type { ContactSource, LifecycleStage, DealStatus } from "@/lib/api-types";

export const SOURCE_LABELS: Record<ContactSource, string> = {
  website: "وب‌سایت",
  referral: "معرفی",
  social: "شبکه‌های اجتماعی",
  cold_call: "تماس سرد",
  advertisement: "تبلیغات",
  other: "سایر",
};

export const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, label]) => ({
  value: value as ContactSource,
  label,
}));

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: "سرنخ",
  prospect: "مشتری بالقوه",
  customer: "مشتری",
  inactive: "غیرفعال",
};

export const STAGE_OPTIONS = Object.entries(STAGE_LABELS).map(([value, label]) => ({
  value: value as LifecycleStage,
  label,
}));

export const STAGE_VARIANT: Record<
  LifecycleStage,
  "default" | "secondary" | "destructive" | "outline"
> = {
  lead: "secondary",
  prospect: "outline",
  customer: "default",
  inactive: "destructive",
};

export const STATUS_LABELS: Record<DealStatus, string> = {
  open: "در جریان",
  won: "برنده شده",
  lost: "باخته شده",
};

export const ENTITY_LABELS: Record<string, string> = {
  contact: "مشتری",
  company: "شرکت",
  deal: "فروش",
  note: "یادداشت",
  invoice: "فاکتور",
  appointment: "قرار ملاقات",
  task: "وظیفه",
  payment: "پرداخت",
  email: "ایمیل",
  sms: "پیامک",
};

export const ACTION_LABELS: Record<string, string> = {
  created: "ساخته شد",
  updated: "ویرایش شد",
  deleted: "حذف شد",
  won: "برنده شد",
  lost: "باخته شد",
  moved: "منتقل شد",
  note_added: "یادداشت اضافه شد",
};
