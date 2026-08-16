import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listProducts } from "@/services/inventory";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const metadata: Metadata = { title: "فاکتور جدید" };

export default async function NewInvoicePage() {
  const { workspaceId } = await requireWorkspace();
  const [customers, products] = await Promise.all([
    db
      .select({ id: contacts.id, name: contacts.firstName, email: contacts.email })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .orderBy(contacts.firstName),
    listProducts({ workspaceId, active: "active", pageSize: 100 }),
  ]);

  return <InvoiceForm customers={customers} products={products.items} />;
}
