import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getAiSettings } from "@/services/workspace-settings";
import { PageHeader } from "@/components/ui/page-header";
import { AiSettingsForm } from "@/components/ai/ai-settings-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "تنظیمات هوش مصنوعی" };

export default async function AiSettingsPage() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const settings = await getAiSettings(workspaceId);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "تنظیمات", href: "/settings" },
          { label: "هوش مصنوعی" },
        ]}
      />
      <PageHeader
        title="تنظیمات هوش مصنوعی"
        description="مدل پیش‌فرض، رفتار و پرامپت سیستم AI"
      />
      <AiSettingsForm settings={settings} />
    </div>
  );
}
