"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getDeliveriesAction, retryDeliveryAction } from "@/actions/automation";
import type { Webhook, WebhookDelivery } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";

type DeliveryItem = {
  delivery: WebhookDelivery;
  webhook: Webhook;
};

const statusMeta: Record<
  WebhookDelivery["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  delivered: { label: "تحویل شد", variant: "default" },
  pending: { label: "در انتظار", variant: "secondary" },
  failed: { label: "ناموفق", variant: "destructive" },
};

export function DeliveriesPanel({ deliveries }: { deliveries: DeliveryItem[] }) {
  const [items, setItems] = useState<DeliveryItem[]>(deliveries);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    const res = await getDeliveriesAction();
    setItems(res);
    setRefreshing(false);
  }

  async function retry(deliveryId: string) {
    setRetrying(deliveryId);
    const res = await retryDeliveryAction(deliveryId);
    setRetrying(null);
    if (res.ok) {
      toast.success("تلاش مجدد انجام شد");
      await refresh();
    } else {
      toast.error("خطا در تلاش مجدد");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">آخرین تحویل‌ها</CardTitle>
          <CardDescription>
            وضعیت ارسال رویدادها؛ تلاش مجدد خودکار با backoff تا ۵ بار
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
          به‌روزرسانی
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            هنوز تحویلی ثبت نشده است — با ساخت وب‌هاوک و ایجاد یک رویداد شروع کنید
          </p>
        )}
        {items.map(({ delivery, webhook }) => {
          const meta = statusMeta[delivery.status];
          const canRetry =
            delivery.status !== "delivered" && delivery.attempts < 5;
          return (
            <div
              key={delivery.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="font-medium">{webhook.name}</span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {delivery.event}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  تلاش {formatNumber(delivery.attempts)} — {formatDateTime(delivery.createdAt)}
                </p>
                {delivery.responseStatus && (
                  <p className="text-xs text-muted-foreground">
                    HTTP {formatNumber(delivery.responseStatus)}
                  </p>
                )}
                {delivery.error && (
                  <p className="text-xs text-destructive">{delivery.error}</p>
                )}
              </div>
              {canRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retrying === delivery.id}
                  onClick={() => retry(delivery.id)}
                >
                  <RotateCcw
                    className={retrying === delivery.id ? "size-3.5 animate-spin" : "size-3.5"}
                  />
                  تلاش مجدد
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
