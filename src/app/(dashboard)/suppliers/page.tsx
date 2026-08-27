import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listSuppliers } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { SuppliersTable } from "@/components/inventory/suppliers-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تأمین‌کنندگان" };

export default async function SuppliersPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const suppliersResult = await listSuppliers(workspaceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تأمین‌کنندگان"
        description="تأمین‌کنندگان کالا برای سفارش‌های خرید."
      />
      <SuppliersTable
        initialData={suppliersResult}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
