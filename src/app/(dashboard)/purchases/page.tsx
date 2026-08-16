import { requireWorkspace, hasPermission } from "@/lib/session";
import {
  listPurchaseOrders,
  listSuppliers,
  listProducts,
} from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { PurchaseOrdersTable } from "@/components/inventory/purchase-orders-table";

export default async function PurchasesPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [orders, suppliers, products] = await Promise.all([
    listPurchaseOrders(workspaceId),
    listSuppliers(workspaceId),
    listProducts({ workspaceId, active: "active", pageSize: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سفارش‌های خرید"
        description="سفارش‌های خرید از تأمین‌کنندگان و رسید کالا."
      />
      <PurchaseOrdersTable
        initialData={orders}
        suppliers={suppliers}
        products={products.items}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
