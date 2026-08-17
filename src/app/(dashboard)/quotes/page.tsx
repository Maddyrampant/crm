import type { Metadata } from "next";
import { listQuotesAction } from "@/actions/quotes";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteList } from "@/components/quotes/quote-list";

export const metadata: Metadata = { title: "پیشنهاد فروش" };

export default async function QuotesPage() {
  const res = await listQuotesAction();
  const quotes = res.ok ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="پیشنهاد فروش"
        description="ایجاد و مدیریت پیشنهادهای فروش (پیش‌فاکتور)"
      />
      <QuoteList quotes={quotes} />
    </div>
  );
}
