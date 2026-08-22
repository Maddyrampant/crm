"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

type Props = {
  csvContent: string;
  filename: string;
  label?: string;
};

export function ReportExportButton({
  csvContent,
  filename,
  label = "خروجی CSV",
}: Props) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("خروجی دانلود شد");
    } catch {
      toast.error("خطا در خروجی CSV");
    }
    setExporting(false);
  }

  return (
    <Button variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
      <Download className="ml-2 h-4 w-4" />
      {exporting ? "در حال خروجی..." : label}
    </Button>
  );
}
