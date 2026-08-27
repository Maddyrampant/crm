import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
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
    <>
      <Breadcrumb items={[{ label: "فاکتورها", href: "/invoices" }, { label: "جزئیات فاکتور" }]} />
      <InvoiceDetail data={data} />
    </>
  );
}
