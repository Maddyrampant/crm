import "server-only";

import { db } from "@/db";
import { contacts, companies, deals, invoices } from "@/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";

export type SearchResult = {
  type: "contact" | "company" | "deal" | "invoice";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(
  workspaceId: string,
  query: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = `%${query.trim()}%`;
  const results: SearchResult[] = [];

  const contactRows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, workspaceId),
        or(
          ilike(contacts.firstName, q),
          ilike(contacts.lastName, q),
          ilike(contacts.email, q)
        )
      )
    )
    .limit(5);

  contactRows.forEach((c) =>
    results.push({
      type: "contact",
      id: c.id,
      title: `${c.firstName} ${c.lastName || ""}`.trim(),
      subtitle: c.email || "",
      href: `/contacts/${c.id}`,
    })
  );

  const companyRows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.workspaceId, workspaceId),
        or(ilike(companies.name, q))
      )
    )
    .limit(5);

  companyRows.forEach((c) =>
    results.push({
      type: "company",
      id: c.id,
      title: c.name,
      subtitle: c.industry || "",
      href: `/companies/${c.id}`,
    })
  );

  const dealRows = await db
    .select()
    .from(deals)
    .where(
      and(eq(deals.workspaceId, workspaceId), ilike(deals.title, q))
    )
    .limit(5);

  dealRows.forEach((d) =>
    results.push({
      type: "deal",
      id: d.id,
      title: d.title,
      subtitle: `${d.amount || "0"} تومان`,
      href: `/pipeline`,
    })
  );

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        or(ilike(invoices.number, q))
      )
    )
    .limit(5);

  invoiceRows.forEach((i) =>
    results.push({
      type: "invoice",
      id: i.id,
      title: i.number,
      subtitle: `${i.total || "0"} تومان`,
      href: `/invoices/${i.id}`,
    })
  );

  return results;
}
