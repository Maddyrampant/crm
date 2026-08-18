import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";

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
    <div className="space-y-4">
      <InvoiceDetail data={data} />
      <AttachmentPanel entityType="invoice" entityId={id} />
    </div>
  );
}
