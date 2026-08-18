import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getQuoteAction } from "@/actions/quotes";
import { QuoteDetail } from "@/components/quotes/quote-detail";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "جزئیات پیشنهاد" };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getQuoteAction(id);
  if (!result.ok) redirect("/quotes");

  return (
    <>
      <Breadcrumb items={[{ label: "پیشنهادها", href: "/quotes" }, { label: "جزئیات پیشنهاد" }]} />
      <QuoteDetail data={result.data!} />
    </>
  );
}
