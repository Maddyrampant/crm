import { formatDistanceToNow } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Activity = {
  id: string;
  action: string;
  data: unknown;
  createdAt: Date;
};

const actionLabels: Record<string, string> = {
  "contact.created": "مخاطب جدید ثبت شد",
  "deal.created": "فرصت فروش ساخته شد",
  "deal.stage_changed": "مرحله فرصت تغییر کرد",
  "deal.status_changed": "وضعیت فرصت تغییر کرد",
  "invoice.created": "فاکتور صادر شد",
  "payment.created": "پرداخت ثبت شد",
  "appointment.created": "قرار جدید ثبت شد",
  "task.created": "وظیفه ساخته شد",
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">فعالیت‌های اخیر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده است</p>
        )}
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3 text-sm">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <p>{actionLabels[a.action] ?? a.action}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(a.createdAt, { locale: faIR, addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
