import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getDeal } from "@/services/deals";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTION_LABELS, ENTITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "جزئیات فروش" };

const STATUS_VARIANT: Record<
  "open" | "won" | "lost",
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  won: "default",
  lost: "destructive",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const { id } = await params;

  const data = await getDeal(workspaceId, id);
  if (!data) redirect("/pipeline/deals");

  const { deal, activity } = data;
  const fullName = [data.contactName, data.contactLastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "خط لوله", href: "/pipeline" }, { label: "فروش‌ها", href: "/pipeline/deals" }, { label: "جزئیات فروش" }]} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {deal.title.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">{deal.title}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(deal.createdAt)} ·{" "}
                {data.ownerName ?? "بدون فروشنده"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: data.stageColor ?? "#888" }}
                />
                <span className="text-sm">{data.stageName || "—"}</span>
              </span>
              <Badge variant={STATUS_VARIANT[deal.status]}>
                {STATUS_LABELS[deal.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">مبلغ</p>
            <p className="text-sm font-semibold">
              {formatCurrency(deal.amount)}
            </p>
          </div>
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">تاریخ بستن</p>
            <p className="text-sm">
              {deal.closeDate ? formatDate(deal.closeDate) : "—"}
            </p>
          </div>
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">فروشنده</p>
            <p className="text-sm">{data.ownerName || "—"}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">شرکت</p>
            <p className="text-sm">{data.companyName || "—"}</p>
          </div>
          {deal.lostReason && (
            <div className="grid gap-1 sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">دلیل باخت</p>
              <p className="text-sm">{deal.lostReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مشتری مرتبط</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.contactId && fullName ? (
            <Link
              href={`/contacts/${deal.contactId}`}
              className="flex w-fit items-center gap-3 rounded-md p-2 hover:bg-accent"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {data.contactName?.charAt(0)}
                {data.contactLastName ? data.contactLastName.charAt(0) : ""}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{fullName}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {data.contactEmail || "—"}
                </p>
              </div>
            </Link>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              مشتری برای این فروش ثبت نشده است.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              فعالیتی ثبت نشده است.
            </p>
          ) : (
            <ol className="relative space-y-4 border-s ps-4">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary/60" />
                  <p className="text-sm">
                    {ENTITY_LABELS[a.entityType] ?? a.entityType} ·{" "}
                    {ACTION_LABELS[a.action] ?? a.action}
                    {a.data?.title ? (
                      <span className="text-muted-foreground">
                        {" "}
                        «{String(a.data.title)}»
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <AttachmentPanel entityType="deal" entityId={id} />
    </div>
  );
}
