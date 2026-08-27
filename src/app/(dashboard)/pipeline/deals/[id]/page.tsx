import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getDeal } from "@/services/deals";
import { listDealProducts } from "@/services/deal-products";
import { getDealChecklist } from "@/services/sales-playbook";
import { listVoiceNotes } from "@/services/voice-notes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ACTION_LABELS, ENTITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CheckCircle2, Mic, Package } from "lucide-react";

export const dynamic = "force-dynamic";
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

  const [products, checklists, voiceNotesList] = await Promise.all([
    listDealProducts(workspaceId, id),
    getDealChecklist(workspaceId, id),
    listVoiceNotes(workspaceId, "deal", id),
  ]);

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
          <CardTitle className="text-base">محصولات فرصت</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState icon={Package} title="محصولی ثبت نشده است" description="محصولات مرتبط با این فرصت را اضافه کنید." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-muted-foreground">
                    <th className="pb-2 pe-2 font-medium">توضیحات</th>
                    <th className="pb-2 px-2 font-medium">تعداد</th>
                    <th className="pb-2 px-2 font-medium">قیمت واحد</th>
                    <th className="pb-2 ps-2 font-medium">مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pe-2">{p.description}</td>
                      <td className="py-2 px-2 text-center">{p.quantity}</td>
                      <td className="py-2 px-2 text-center">{formatCurrency(Number(p.unitPrice))}</td>
                      <td className="py-2 ps-2 font-medium">{formatCurrency(Number(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">چک‌لیست پلی‌بوک</CardTitle>
        </CardHeader>
        <CardContent>
          {checklists.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="چک‌لیستی ثبت نشده است" description="مراحل پلی‌بوک فروش برای این فرصت نمایش داده می‌شود." />
          ) : (
            <ul className="space-y-2">
              {checklists.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`size-4 shrink-0 rounded-full border ${
                      c.completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    } flex items-center justify-center`}
                  >
                    {c.completed && (
                      <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 8.5l3 3 7-7" />
                      </svg>
                    )}
                  </span>
                  <span className={c.completed ? "text-muted-foreground line-through" : ""}>
                    {c.stepTitle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">یادداشت‌های صوتی</CardTitle>
        </CardHeader>
        <CardContent>
          {voiceNotesList.length === 0 ? (
            <EmptyState icon={Mic} title="یادداشت صوتی ثبت نشده است" description="یادداشت‌های صوتی مرتبط با این فرصت اینجا نمایش داده می‌شوند." />
          ) : (
            <ul className="space-y-3">
              {voiceNotesList.map((vn) => (
                <li key={vn.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {vn.duration != null ? `${Math.floor(vn.duration / 60)}:${String(vn.duration % 60).padStart(2, "0")}` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(vn.createdAt)}
                    </span>
                  </div>
                  {vn.transcription && (
                    <p className="mt-1 text-sm leading-relaxed">{vn.transcription.length > 120 ? vn.transcription.slice(0, 120) + "…" : vn.transcription}</p>
                  )}
                </li>
              ))}
            </ul>
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
    </div>
  );
}
