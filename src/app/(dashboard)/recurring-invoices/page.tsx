import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listRecurringInvoicesAction } from "@/actions/recurring-invoices";
import { PageHeader } from "@/components/ui/page-header";
import { RecurringInvoicesManager } from "@/components/recurring-invoices/recurring-invoices-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فاکتور تکرارشونده" };

export default async function RecurringInvoicesPage() {
  const { membership } = await requireWorkspace();
  const result = await listRecurringInvoicesAction();
  const invoices = result.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="فاکتورهای تکرارشونده"
        description="ایجاد فاکتور خودکار ماهانه/سالانه برای اشتراک‌ها."
      />
      <RecurringInvoicesManager
        initialInvoices={invoices}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
