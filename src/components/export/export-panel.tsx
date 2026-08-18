"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Users, Handshake, FileText, Package, Store } from "lucide-react";
import { exportDataAction } from "@/actions/export";

type Props = Record<string, never>;

export function ExportPanel(_props: Props) {
  const [pending, startTransition] = useTransition();

  function handleExport(entity: string, label: string) {
    startTransition(async () => {
      const res = await exportDataAction(entity);
      if (res.ok && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`خروجی ${label} دانلود شد`);
      } else {
        toast.error("error" in res ? res.error : "خطا در خروجی");
      }
    });
  }

  const items = [
    { entity: "contacts", label: "مخاطبین", icon: Users },
    { entity: "deals", label: "فروش‌ها", icon: Handshake },
    { entity: "invoices", label: "فاکتورها", icon: FileText },
    { entity: "products", label: "کالاها", icon: Package },
    { entity: "suppliers", label: "تأمین‌کنندگان", icon: Store },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map(({ entity, label, icon: Icon }) => (
        <Card key={entity}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5 text-muted-foreground" />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => handleExport(entity, label)}
            >
              <Download className="ml-2 h-4 w-4" />
              {pending ? "در حال خروجی..." : "دانلود CSV"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
