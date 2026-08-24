import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listContacts, listTags, listCustomFields } from "@/services/contacts";
import { listCompanies } from "@/services/companies";
import { getWorkspaceMembers } from "@/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { ContactNewClient } from "./contact-new-client";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مشتری جدید" };

export default async function NewContactPage() {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "seller")) redirect("/contacts");

  const [companies, membersResult, customFields] = await Promise.all([
    listCompanies({ workspaceId, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
    listCustomFields(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "مشتریان", href: "/contacts" }, { label: "مشتری جدید" }]} />
      <PageHeader
        title="مشتری جدید"
        description="اطلاعات مشتری یا سرنخ جدید را وارد کنید."
      />
      <ContactNewClient
        companies={companies.items.map((c) => ({ id: c.id, name: c.name }))}
        members={membersResult.items}
        customFields={customFields.map((f) => ({
          id: f.id,
          name: f.name,
          key: f.key,
          type: f.type,
          options: (f.options ?? []) as string[],
        }))}
      />
    </div>
  );
}
