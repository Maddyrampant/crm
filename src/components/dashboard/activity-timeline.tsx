import { formatDistanceToNow } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import {
  CalendarCheck,
  CreditCard,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  UserPlus,
  Zap,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityLog } from "@/db/schema/activity";

const ACTION_ICONS: Record<string, typeof Zap> = {
  "contact.created": UserPlus,
  "deal.created": Zap,
  "deal.stage_changed": Zap,
  "deal.status_changed": Zap,
  "invoice.created": FileText,
  "payment.created": CreditCard,
  "appointment.created": CalendarCheck,
  "task.created": StickyNote,
  "email.sent": Mail,
  "sms.sent": MessageSquare,
  "call.logged": Phone,
};

const ACTION_LABELS: Record<string, string> = {
  "contact.created": "مخاطب جدید ثبت شد",
  "deal.created": "فرصت فروش ساخته شد",
  "deal.stage_changed": "مرحله فرصت تغییر کرد",
  "deal.status_changed": "وضعیت فرصت تغییر کرد",
  "invoice.created": "فاکتور صادر شد",
  "payment.created": "پرداخت ثبت شد",
  "appointment.created": "قرار جدید ثبت شد",
  "task.created": "وظیفه ساخته شد",
  "email.sent": "ایمیل ارسال شد",
  "sms.sent": "پیامک ارسال شد",
  "call.logged": "تماس ثبت شد",
};

type Props = {
  activities: ActivityLog[];
};

export function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="فعالیتی ثبت نشده"
        description="بعد از ثبت فعالیت، اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((a) => {
        const Icon = ACTION_ICONS[a.action] || Zap;
        const label = ACTION_LABELS[a.action] || a.action;
        return (
          <div key={a.id} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(a.createdAt, {
                  locale: faIR,
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
