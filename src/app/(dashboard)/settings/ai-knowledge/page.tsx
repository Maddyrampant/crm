import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { listKnowledge } from "@/services/ai-knowledge";
import { PageHeader } from "@/components/ui/page-header";
import { KnowledgePanel } from "@/components/ai/knowledge-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "پایگاه دانش AI" };

export default async function AiKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const params = await searchParams;

  const result = await listKnowledge(workspaceId, {
    page: typeof params.page === "string" ? Number(params.page) : undefined,
    pageSize: typeof params.pageSize === "string" ? Number(params.pageSize) : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "تنظیمات", href: "/settings" },
          { label: "پایگاه دانش AI" },
        ]}
      />
      <PageHeader
        title="پایگاه دانش AI"
        description="اطلاعات فروش، محصول و پشتیبانی برای پاسخ‌دهی هوشمند"
      />
      <KnowledgePanel items={result.items} />
    </div>
  );
}
