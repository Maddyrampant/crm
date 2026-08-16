import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireWorkspace } from "@/lib/session";
import { listInvoices } from "@/services/invoices";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/components/invoices/invoice-list";

export const metadata: Metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const { workspaceId } = await requireWorkspace();
  const invoices = await listInvoices(workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">فاکتورها</h1>
          <p className="text-muted-foreground">
            مدیریت فاکتورها، پرداخت‌ها و وضعیت‌ها
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus />
            فاکتور جدید
          </Link>
        </Button>
      </div>

      <InvoiceList initialData={invoices} />
    </div>
  );
}
