import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireWorkspace } from "@/lib/session";
import { listInvoices } from "@/services/invoices";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceList } from "@/components/invoices/invoice-list";

export const metadata: Metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const { workspaceId } = await requireWorkspace();
  const invoicesResult = await listInvoices(workspaceId, { page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <PageHeader title="فاکتورها" description="مدیریت فاکتورها، پرداخت‌ها و وضعیت‌ها">
        <Button asChild>
          <Link href="/invoices/new">
            <Plus />
            فاکتور جدید
          </Link>
        </Button>
      </PageHeader>

      <InvoiceList initialData={invoicesResult.items} initialTotal={invoicesResult.total} workspaceId={workspaceId} />
    </div>
  );
}
