import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuoteAction } from "@/actions/quotes";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteDetail } from "@/components/quotes/quote-detail";

export const metadata: Metadata = { title: "جزئیات پیشنهاد فروش" };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getQuoteAction(id);

  if (!res.ok || !res.data) {
    notFound();
  }

  const { items, ...quote } = res.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`پیشنهاد فروش ${quote.number}`}
        description="جزئیات و مدیریت پیشنهاد فروش"
      />
      <QuoteDetail quote={quote} items={items} />
    </div>
  );
}
