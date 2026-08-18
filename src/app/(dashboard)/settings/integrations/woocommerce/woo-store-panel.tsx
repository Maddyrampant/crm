"use client";

import { useState } from "react";
import { Package, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WooStoreCard } from "@/components/integrations/woo-store-card";
import { WooConnectForm } from "@/components/integrations/woo-connect-form";
import { WooSyncLogTable } from "@/components/integrations/woo-sync-log-table";

type Store = {
  id: string;
  name: string;
  url: string;
  active: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  syncCount: number;
};

type Props = {
  stores: Store[];
};

export function WooStorePanel({ stores }: Props) {
  const [connectOpen, setConnectOpen] = useState(false);
  const [logsStoreId, setLogsStoreId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {stores.length} فروشگاه متصل
        </p>
        <Button onClick={() => setConnectOpen(true)}>
          <Plus className="ml-1 h-4 w-4" />
          اتصال فروشگاه جدید
        </Button>
      </div>

      {stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Store className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">هنوز فروشگاهی متصل نشده</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            برای شروع همگام‌سازی مشتریان، سفارشات و محصولات، یک فروشگاه ووکامرس متصل کنید.
          </p>
          <Button className="mt-4" onClick={() => setConnectOpen(true)}>
            <Plus className="ml-1 h-4 w-4" />
            اتصال فروشگاه
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => (
            <WooStoreCard
              key={store.id}
              store={store}
              onLogs={setLogsStoreId}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border p-4 text-sm text-muted-foreground space-y-2">
        <h4 className="font-medium text-foreground">راهنمای تنظیم Webhook</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>در پنل وردپرس به <strong>WooCommerce &rarr; Settings &rarr; Advanced &rarr; Webhooks</strong> بروید</li>
          <li>روی <strong>Add webhook</strong> کلیک کنید</li>
          <li>نام دلخواه وارد کنید و وضعیت را روی <strong>Active</strong> تنظیم کنید</li>
          <li>Topic را روی <strong>Order created</strong> یا <strong>All</strong> تنظیم کنید</li>
          <li>آدرس Webhook از کارت فروشگاه بالا کپی کنید</li>
          <li>Secret را روی Webhook Secret وارد شده تنظیم کنید</li>
          <li>ذخیره کنید — فروشگاه آماده همگام‌سازی است</li>
        </ol>
      </div>

      <WooConnectForm open={connectOpen} onOpenChange={setConnectOpen} />
      <WooSyncLogTable
        storeId={logsStoreId}
        open={logsStoreId !== null}
        onOpenChange={(open) => { if (!open) setLogsStoreId(null); }}
      />
    </div>
  );
}
