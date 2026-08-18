import { redirect } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { getContact, listCustomFields } from "@/services/contacts";
import { listCompanies } from "@/services/companies";
import { listDeals } from "@/services/deals";
import { getWorkspaceMembers } from "@/services/workspace";
import {
  toActivityRow,
  toContactRow,
  toCustomFieldRow,
  toDealRow,
} from "@/lib/serialize";
import { ContactDetail } from "@/components/contacts/contact-detail";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId, membership } = await requireWorkspace();
  const { id } = await params;

  const contact = await getContact(workspaceId, id);
  if (!contact) redirect("/contacts");

  const [companies, membersResult, customFields, dealsResult] = await Promise.all([
    listCompanies({ workspaceId, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
    listCustomFields(workspaceId),
    listDeals({ workspaceId, contactId: id, pageSize: 20 }),
  ]);

  return (
    <>
      <Breadcrumb items={[{ label: "مخاطبین", href: "/contacts" }, { label: "جزئیات مخاطب" }]} />
      <ContactDetail
      contact={toContactRow({
        ...contact,
        companyName: contact.company?.name ?? null,
        ownerName: contact.owner?.name ?? null,
      })}
      customFields={customFields.map(toCustomFieldRow)}
      activity={contact.activity.map(toActivityRow)}
      deals={dealsResult.items.map((r) =>
        toDealRow({
          ...r.deal,
          stageName: r.stageName,
          stageColor: r.stageColor,
          contactName: r.contactName,
          contactLastName: r.contactLastName,
          contactEmail: r.contactEmail,
          companyName: r.companyName,
          ownerName: r.ownerName,
        })
      )}
      companies={companies.items.map((c) => ({ id: c.id, name: c.name }))}
      members={membersResult.items}
      canManage={hasPermission(membership, "seller")}
    />
    </>
  );
}
