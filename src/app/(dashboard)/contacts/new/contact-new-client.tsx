"use client";

import { useRouter } from "next/navigation";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import type { ContactRow, CustomFieldRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  companies: { id: string; name: string }[];
  members: WorkspaceMemberRow[];
  customFields: CustomFieldRow[];
};

export function ContactNewClient({ companies, members, customFields }: Props) {
  const router = useRouter();

  return (
    <ContactFormDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) router.push("/contacts");
      }}
      companies={companies}
      members={members}
      customFields={customFields}
      onSaved={(contact: ContactRow) => {
        router.push(`/contacts/${contact.id}`);
      }}
    />
  );
}
