import { notFound } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { getContact, listCustomFields } from "@/services/contacts";
import { listCompanies } from "@/services/companies";
import { getWorkspaceMembers } from "@/services/workspace";
import { toActivityRow, toContactRow, toCustomFieldRow } from "@/lib/serialize";
import { ContactDetail } from "@/components/contacts/contact-detail";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId, membership } = await requireWorkspace();
  const { id } = await params;

  const contact = await getContact(workspaceId, id);
  if (!contact) notFound();

  const [companies, members, customFields] = await Promise.all([
    listCompanies({ workspaceId, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
    listCustomFields(workspaceId),
  ]);

  return (
    <ContactDetail
      contact={toContactRow({
        ...contact,
        companyName: contact.company?.name ?? null,
        ownerName: contact.owner?.name ?? null,
      })}
      customFields={customFields.map(toCustomFieldRow)}
      activity={contact.activity.map(toActivityRow)}
      companies={companies.items.map((c) => ({ id: c.id, name: c.name }))}
      members={members}
      canManage={hasPermission(membership, "seller")}
    />
  );
}
