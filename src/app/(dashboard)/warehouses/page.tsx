import { requireWorkspace, hasPermission } from "@/lib/session";
import { listWarehouses } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { WarehousesTable } from "@/components/inventory/warehouses-table";

export default async function WarehousesPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const warehouses = await listWarehouses(workspaceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="انبارها"
        description="انبارهای شما و تعداد کالاهای هر انبار."
      />
      <WarehousesTable
        initialData={warehouses}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
