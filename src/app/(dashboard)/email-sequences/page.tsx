import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listSequencesAction } from "@/actions/email-sequences";
import { PageHeader } from "@/components/ui/page-header";
import { EmailSequencesManager } from "@/components/email-sequences/email-sequences-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دنباله ایمیل" };

export default async function EmailSequencesPage() {
  const { membership } = await requireWorkspace();
  const result = await listSequencesAction();
  const sequences = result.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="دنباله‌های ایمیل"
        description="ایجاد دنباله ایمیل خودکار (Drip Campaign) برای پیگیری مشتریان."
      />
      <EmailSequencesManager
        initialSequences={sequences}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
