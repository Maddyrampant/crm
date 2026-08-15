import { requireWorkspace, hasPermission } from "@/lib/session";
import { listCompanies } from "@/services/companies";
import { toCompanyRow } from "@/lib/serialize";
import { CompaniesTable } from "@/components/companies/companies-table";

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
    <CompaniesTable
      initialData={{
        items: result.items.map(toCompanyRow),
        total: result.total,
      }}
      canManage={hasPermission(membership, "seller")}
      canDelete={hasPermission(membership, "manager")}
    />
  );
}
