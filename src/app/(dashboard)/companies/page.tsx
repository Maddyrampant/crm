import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listCompanies } from "@/services/companies";
import { toCompanyRow } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { CompaniesTable } from "@/components/companies/companies-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "شرکت‌ها" };

export default async function CompaniesPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const result = await listCompanies({
    workspaceId,
    page: 1,
    pageSize: 20,
    sortBy: "name",
    sortDir: "asc",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="شرکت‌ها"
        description="مدیریت شرکت‌ها و مشتریان حقوقی شما."
      />
      <CompaniesTable
        initialData={{
          items: result.items.map(toCompanyRow),
          total: result.total,
        }}
        canManage={hasPermission(membership, "seller")}
        canDelete={hasPermission(membership, "manager")}
      />
    </div>
  );
}
