"use server";

import { requireWorkspaceRole } from "@/lib/session";
import { exportContacts, exportDeals, exportInvoices } from "@/services/export";

export async function exportDataAction(entity: string) {
  const { workspaceId } = await requireWorkspaceRole("manager");

  let csv = "";
  switch (entity) {
    case "contacts":
      csv = await exportContacts(workspaceId);
      break;
    case "deals":
      csv = await exportDeals(workspaceId);
      break;
    case "invoices":
      csv = await exportInvoices(workspaceId);
      break;
    default:
      return { ok: false, error: "نوع موجودیت نامعتبر است" };
  }

  return { ok: true, data: csv };
}
