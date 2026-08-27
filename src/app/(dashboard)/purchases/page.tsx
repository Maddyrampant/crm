import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import {
  listPurchaseOrders,
  listSuppliers,
  listProducts,
} from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { PurchaseOrdersTable } from "@/components/inventory/purchase-orders-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سفارش‌های خرید" };

export default async function PurchasesPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [ordersResult, suppliersResult, products] = await Promise.all([
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
        initialData={ordersResult}
        suppliers={suppliersResult.items}
        products={products.items}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
