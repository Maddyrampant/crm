import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listQuotesAction } from "@/actions/quotes";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { QuotesManager } from "@/components/quotes/quotes-manager";

export const metadata: Metadata = { title: "پیشنهاد فروش" };

export default async function QuotesPage() {
  const { workspaceId, membership } = await requireWorkspace();
  const [result, contactList] = await Promise.all([
    listQuotesAction(),
    db
      .select({ id: contacts.id, name: contacts.firstName })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .orderBy(contacts.firstName),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="پیشنهاد فروش" description="پیشنهادهای فروش و تبدیل آنها به فاکتور.">
        {hasPermission(membership, "seller") && (
          <Button asChild>
            <a href="#new-quote">
              <Plus />
              پیشنهاد جدید
            </a>
          </Button>
        )}
      </PageHeader>
      <QuotesManager
        initialData={result.data ?? []}
        contacts={contactList}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
