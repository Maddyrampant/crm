import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listFieldsAction } from "@/actions/custom-fields";
import { CustomFieldsManager } from "@/components/custom-fields/custom-fields-manager";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فیلدهای سفارشی" };

export default async function CustomFieldsPage() {
  await requireWorkspace();
  const result = await listFieldsAction();
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "تنظیمات", href: "/settings" }, { label: "فیلدهای سفارشی" }]} />
      <PageHeader
        title="فیلدهای سفارشی"
        description="فیلدهای دلخواه برای مخاطبین، شرکت‌ها و فروش‌ها."
      />
      <CustomFieldsManager initialData={result.data ?? []} />
    </div>
  );
}
