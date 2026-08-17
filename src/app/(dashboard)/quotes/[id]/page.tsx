import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getQuoteAction } from "@/actions/quotes";
import { QuoteDetail } from "@/components/quotes/quote-detail";

export const metadata: Metadata = { title: "جزئیات پیشنهاد" };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getQuoteAction(id);
  if (!result.ok) redirect("/quotes");

  return <QuoteDetail data={result.data!} />;
}
