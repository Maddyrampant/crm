import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteForm } from "@/components/quotes/quote-form";

export const metadata: Metadata = { title: "پیشنهاد فروش جدید" };

export default async function NewQuotePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="پیشنهاد فروش جدید"
        description="ایجاد پیشنهاد فروش (پیش‌فاکتور) جدید"
      />
      <QuoteForm />
    </div>
  );
}
