"use server";

import { z } from "zod";
import { getSession, getActiveWorkspace } from "@/lib/session";
import { listContacts } from "@/services/contacts";
import { listCompanies } from "@/services/companies";
import { listDeals } from "@/services/deals";
import { toCompanyRow, toContactRow, toDealRow } from "@/lib/serialize";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export type GlobalSearchResult = {
  contacts: ReturnType<typeof toContactRow>[];
  companies: ReturnType<typeof toCompanyRow>[];
  deals: ReturnType<typeof toDealRow>[];
};

export async function globalSearchAction(input: unknown) {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "ابتدا وارد شوید" };
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "عبارت جستجو نامعتبر است" };
  }

  const q = parsed.data.query;
  const [contacts, companies, deals] = await Promise.all([
    listContacts({ workspaceId: membership.workspaceId, search: q, pageSize: 5 }),
    listCompanies({ workspaceId: membership.workspaceId, search: q, pageSize: 5 }),
    listDeals({ workspaceId: membership.workspaceId, search: q, pageSize: 5 }),
  ]);

  return {
    ok: true,
    data: {
      contacts: contacts.items.map(toContactRow),
      companies: companies.items.map(toCompanyRow),
      deals: deals.items.map((d) =>
        toDealRow({
          ...d.deal,
          stageName: d.stageName,
          stageColor: d.stageColor,
          contactName: d.contactName,
          contactLastName: d.contactLastName,
          contactEmail: d.contactEmail,
          companyName: d.companyName,
          ownerName: d.ownerName,
        })
      ),
    } satisfies GlobalSearchResult,
  };
}
