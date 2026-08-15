import type { EmailLog, SmsLog } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "sent" ? "default" : "destructive"}>
      {status === "sent" ? "موفق" : "ناموفق"}
    </Badge>
  );
}

export function LogsPanel({
  emails,
  sms,
}: {
  emails: EmailLog[];
  sms: SmsLog[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">لاگ ارسال‌ها</CardTitle>
        <CardDescription>آخرین ایمیل‌ها و پیامک‌های ارسال‌شده</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email">ایمیل ({emails.length})</TabsTrigger>
            <TabsTrigger value="sms">پیامک ({sms.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="space-y-2 pt-4">
            {emails.length === 0 && (
              <p className="text-sm text-muted-foreground">ایمیلی ارسال نشده است</p>
            )}
            {emails.map((e) => (
              <div key={e.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium" dir="ltr">
                    {e.to}
                  </p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="truncate text-muted-foreground">{e.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(e.createdAt)} — ارائه‌دهنده: {e.provider}
                  {e.error && <span className="text-destructive"> — {e.error}</span>}
                </p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="sms" className="space-y-2 pt-4">
            {sms.length === 0 && (
              <p className="text-sm text-muted-foreground">پیامکی ارسال نشده است</p>
            )}
            {sms.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium" dir="ltr">
                    {s.to}
                  </p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="truncate text-muted-foreground">{s.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(s.createdAt)} — ارائه‌دهنده: {s.provider}
                  {s.error && <span className="text-destructive"> — {s.error}</span>}
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
