import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getCompany } from "@/services/companies";
import { listContacts } from "@/services/contacts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toContactRow } from "@/lib/serialize";
import { STAGE_LABELS, STAGE_VARIANT } from "@/lib/labels";
import { formatDate, formatNumber } from "@/lib/format";
import { NotesPanel } from "@/components/notes/notes-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات شرکت" };

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const { id } = await params;

  const company = await getCompany(workspaceId, id);
  if (!company) redirect("/companies");

  const contactsResult = await listContacts({
    workspaceId,
    companyId: id,
    pageSize: 50,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const contacts = contactsResult.items.map(toContactRow);

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "شرکت‌ها", href: "/companies" }, { label: "جزئیات شرکت" }]} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{company.name}</h1>
              <p className="text-sm text-muted-foreground">
                {company.industry || "بدون صنعت"} · {formatDate(company.createdAt)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">دامنه</p>
            <p dir="ltr" className="text-start text-sm">
              {company.domain || "—"}
            </p>
          </div>
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">وب‌سایت</p>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="text-start text-sm text-primary hover:underline"
              >
                {company.website}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">آدرس</p>
            <p className="text-sm">{company.address || "—"}</p>
          </div>
          {company.notes && (
            <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-muted-foreground">یادداشت</p>
              <p className="text-sm">{company.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">مشتریان این شرکت</CardTitle>
          <Badge variant="secondary">{formatNumber(contactsResult.total)}</Badge>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              مشتری برای این شرکت ثبت نشده است.
            </p>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 hover:underline">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {c.firstName.charAt(0)}
                      {c.lastName ? c.lastName.charAt(0) : ""}
                    </div>
                    <div>
                      <p className="font-medium">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {c.email || c.phone || "—"}
                      </p>
                    </div>
                  </Link>
                  <Badge variant={STAGE_VARIANT[c.lifecycleStage]}>
                    {STAGE_LABELS[c.lifecycleStage]}
                  </Badge>
                </li>
              ))}
          </ul>
        )}
        </CardContent>
      </Card>

      <NotesPanel entityType="company" entityId={id} />
    </div>
  );
}
