import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";

export const metadata: Metadata = { title: "جزئیات فاکتور" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireWorkspace();
  const data = await getInvoice(workspaceId, id);
  if (!data) notFound();

  return <InvoiceDetail data={data} />;
}
