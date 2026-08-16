import { notFound } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { getPurchaseOrder } from "@/services/inventory";
import { PurchaseOrderDetail } from "@/components/inventory/purchase-order-detail";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId, membership } = await requireWorkspace();
  const { id } = await params;

  const order = await getPurchaseOrder(workspaceId, id);
  if (!order) notFound();

  return (
    <PurchaseOrderDetail
      order={order}
      canManage={hasPermission(membership, "manager")}
    />
  );
}
