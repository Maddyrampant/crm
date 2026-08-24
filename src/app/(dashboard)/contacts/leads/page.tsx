import type { Metadata } from "next";
import { getContactsAction } from "@/actions/contacts";
import { LeadScoreTable } from "@/components/contacts/lead-score-table";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "امتیازدهی لید" };

export default async function LeadScoringPage() {
  const result = await getContactsAction({ page: 1, pageSize: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="امتیازدهی لید"
        description="محاسبه و مدیریت امتیاز مخاطبین"
      />
      <LeadScoreTable
        initialData={
          result.ok && result.data
            ? result.data
            : { items: [], total: 0 }
        }
      />
    </div>
  );
}
