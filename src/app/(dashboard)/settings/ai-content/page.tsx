import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { listContent } from "@/services/ai-content";
import { PageHeader } from "@/components/ui/page-header";
import { ContentLibrary } from "@/components/ai/content-library";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "کتابخانه محتوا" };

export default async function AiContentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const params = await searchParams;

  const result = await listContent(workspaceId, {
    page: typeof params.page === "string" ? Number(params.page) : undefined,
    pageSize: typeof params.pageSize === "string" ? Number(params.pageSize) : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    type: typeof params.type === "string" ? params.type : undefined,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "تنظیمات", href: "/settings" },
          { label: "کتابخانه محتوا" },
        ]}
      />
      <PageHeader
        title="کتابخانه محتوا"
        description="ویدیو، مستند و تصاویر برای تخصیص به مخاطبان"
      />
      <ContentLibrary items={result.items} />
    </div>
  );
}
