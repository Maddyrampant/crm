import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
<<<<<<< HEAD
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
=======
import { Breadcrumb } from "@/components/ui/breadcrumb";
>>>>>>> d505c2f (feat(ui): #14 breadcrumb navigation — 16 pages + shared component)

export const metadata: Metadata = { title: "جزئیات فاکتور" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspace();
  const data = await getInvoice(workspaceId, id);
  if (!data) redirect("/invoices");

  return (
<<<<<<< HEAD
    <div className="space-y-4">
      <InvoiceDetail data={data} />
      <AttachmentPanel entityType="invoice" entityId={id} />
    </div>
=======
    <>
      <Breadcrumb items={[{ label: "فاکتورها", href: "/invoices" }, { label: "جزئیات فاکتور" }]} />
      <InvoiceDetail data={data} />
    </>
>>>>>>> d505c2f (feat(ui): #14 breadcrumb navigation — 16 pages + shared component)
  );
}
