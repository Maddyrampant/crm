import { RULE_EVENTS } from "@/lib/rules";

export const ACTION_LABELS: Record<string, string> = {
  email: "ارسال ایمیل",
  task: "ساخت تسک",
  notification: "اعلان درون‌برنامه‌ای",
  sms: "ارسال پیامک",
  move_deal: "انتقال به مرحله",
};

export function eventLabel(key: string): string {
  return RULE_EVENTS.find((e) => e.key === key)?.label ?? key;
}
