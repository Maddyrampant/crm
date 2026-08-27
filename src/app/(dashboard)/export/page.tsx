import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ExportPanel } from "@/components/export/export-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خروجی داده" };

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="خروجی داده"
        description="دانلود خروجی CSV از اطلاعات سیستم"
      />
      <ExportPanel />
    </div>
  );
}
