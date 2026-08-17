"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportDataAction } from "@/actions/export";
import { Button } from "@/components/ui/button";

type Props = {
  entity: "contacts" | "deals" | "invoices";
  label?: string;
};

export function ExportButton({ entity, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportDataAction(entity);
      if (!result.ok || !result.data) {
        toast.error("خطا در دریافت خروجی");
        return;
      }

      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("خروجی با موفقیت دانلود شد");
    } catch {
      toast.error("خطا در دریافت خروجی");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {label ?? "خروجی CSV"}
    </Button>
  );
}
