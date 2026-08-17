import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listFieldsAction } from "@/actions/custom-fields";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsPanel } from "./custom-fields-panel";

export const metadata: Metadata = { title: "فیلدهای سفارشی" };

export default async function CustomFieldsPage() {
  const { workspaceId } = await requireWorkspace();
  const fields = await listFieldsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="فیلدهای سفارشی"
        description="تعریف فیلدهای دلخواه برای مخاطبین، شرکت‌ها و فروش‌ها"
      />
      <CustomFieldsPanel fields={fields.data ?? []} />
    </div>
  );
}
