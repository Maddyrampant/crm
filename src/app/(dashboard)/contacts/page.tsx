import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listContacts, listTags, listCustomFields } from "@/services/contacts";
import { listCompanies } from "@/services/companies";
import { getWorkspaceMembers } from "@/services/workspace";
import { toContactRow, toCustomFieldRow } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ImportCsvDialog } from "@/components/contacts/import-csv-dialog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مشتریان" };

export default async function ContactsPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [contactsResult, companies, tags, membersResult, customFields] = await Promise.all([
    listContacts({ workspaceId, page: 1, pageSize: 20 }),
    listCompanies({ workspaceId, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    listTags(workspaceId),
    getWorkspaceMembers(workspaceId),
    listCustomFields(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان"
        description="مشتریان، سرنخ‌ها و اطلاعات تماس شما."
      >
        {hasPermission(membership, "seller") && <ImportCsvDialog />}
      </PageHeader>
      <ContactsTable
        initialData={{
          items: contactsResult.items.map(toContactRow),
          total: contactsResult.total,
        }}
        companies={companies.items.map((c) => ({ id: c.id, name: c.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
        members={membersResult.items}
        customFields={customFields.map(toCustomFieldRow)}
        canManage={hasPermission(membership, "seller")}
        canDelete={hasPermission(membership, "manager")}
      />
    </div>
  );
}
