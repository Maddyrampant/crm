"use server";

import { requireWorkspace } from "@/lib/session";
import { listCompanies } from "@/services/companies";
import { getWorkspaceMembers } from "@/services/workspace";
import { listCustomFields } from "@/services/contacts";
import type { CustomFieldRow } from "@/lib/api-types";

export async function getContactFormDataAction() {
  const { workspaceId } = await requireWorkspace();

  const [companies, membersResult, customFields] = await Promise.all([
    listCompanies({ workspaceId, pageSize: 200, sortBy: "name", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
    listCustomFields(workspaceId),
  ]);

  return {
    companies: companies.items.map((c) => ({ id: c.id, name: c.name })),
    members: membersResult.items.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    })),
    customFields: customFields.map((f): CustomFieldRow => ({
      id: f.id,
      name: f.name,
      key: f.key,
      type: f.type,
      options: (f.options ?? []) as string[],
    })),
  };
}
