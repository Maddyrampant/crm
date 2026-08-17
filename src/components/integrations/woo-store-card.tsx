"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { disconnectWooStore, toggleWooStore } from "@/actions/woocommerce";

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
  store: Store;
  onLogs: (storeId: string) => void;
};

export function WooStoreCard({ store, onLogs }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleWooStore(store.id, !store.active);
      if (res.ok) {
        toast.success(store.active ? "فروشگاه غیرفعال شد" : "فروشگاه فعال شد");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDisconnect() {
    if (!confirm(`آیا از قطع اتصال فروشگاه «${store.name}» اطمینان دارید؟`)) return;
    startTransition(async () => {
      const res = await disconnectWooStore(store.id);
      if (res.ok) {
        toast.success("اتصال قطع شد");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {store.active ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              {store.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <span dir="ltr" className="font-mono text-xs">{store.url}</span>
              <a
                href={`${store.url}/wp-admin/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </div>
          <Badge variant={store.active ? "default" : "secondary"}>
            {store.active ? "فعال" : "غیرفعال"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">آخرین همگام‌سازی:</span>
            <p className="text-xs">
              {store.lastSyncAt
                ? new Date(store.lastSyncAt).toLocaleString("fa-IR")
                : "هنوز انجام نشده"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">تعداد رویدادها:</span>
            <p className="text-xs">{store.syncCount.toLocaleString("fa-IR")}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">آدرس Webhook:</p>
          <code
            dir="ltr"
            className="block break-all rounded bg-muted px-2 py-1 text-[10px]"
          >
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/webhooks/woocommerce/${store.id}`
              : `/api/webhooks/woocommerce/${store.id}`}
          </code>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="ml-1 h-3 w-3 animate-spin" />
            ) : store.active ? (
              <PowerOff className="ml-1 h-3 w-3" />
            ) : (
              <Power className="ml-1 h-3 w-3" />
            )}
            {store.active ? "غیرفعال" : "فعال"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogs(store.id)}
          >
            <RefreshCw className="ml-1 h-3 w-3" />
            لاگ همگام‌سازی
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={pending}
          >
            <Trash2 className="ml-1 h-3 w-3" />
            قطع اتصال
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
