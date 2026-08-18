import { redirect } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { getPurchaseOrder } from "@/services/inventory";
import { PurchaseOrderDetail } from "@/components/inventory/purchase-order-detail";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId, membership } = await requireWorkspace();
  const { id } = await params;

  const order = await getPurchaseOrder(workspaceId, id);
  if (!order) redirect("/purchases");

  return (
    <>
      <Breadcrumb items={[{ label: "سفارشات خرید", href: "/purchases" }, { label: "جزئیات سفارش" }]} />
      <PurchaseOrderDetail
        order={order}
        canManage={hasPermission(membership, "manager")}
      />
    </>
  );
}
