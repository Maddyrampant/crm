import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/db/schema";

const statusMap: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "bg-muted text-muted-foreground" },
  sent: { label: "ارسال‌شده", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  paid: { label: "پرداخت‌شده", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  overdue: { label: "سررسید گذشته", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  cancelled: { label: "لغو شده", className: "bg-muted text-muted-foreground line-through" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = statusMap[status];
  return <Badge className={s.className}>{s.label}</Badge>;
}
