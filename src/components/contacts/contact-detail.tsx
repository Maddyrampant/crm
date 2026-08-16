"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { NotesPanel } from "@/components/notes/notes-panel";
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  STAGE_VARIANT,
  STATUS_LABELS,
} from "@/lib/labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ActivityRow, ContactRow, CustomFieldRow, DealRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  contact: ContactRow;
  customFields: CustomFieldRow[];
  activity: ActivityRow[];
  deals: DealRow[];
  companies: { id: string; name: string }[];
  members: WorkspaceMemberRow[];
  canManage: boolean;
};

export function ContactDetail({
  contact,
  customFields,
  activity,
  deals,
  companies,
  members,
  canManage,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {contact.firstName.charAt(0)}
              {contact.lastName ? contact.lastName.charAt(0) : ""}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">
                  {contact.firstName} {contact.lastName}
                </h1>
                <Badge variant={STAGE_VARIANT[contact.lifecycleStage]}>
                  {STAGE_LABELS[contact.lifecycleStage]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {contact.email || contact.phone || "بدون اطلاعات تماس"}
              </p>
            </div>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
              <Pencil className="size-4" />
              ویرایش
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">ایمیل</Label>
            <p dir="ltr" className="text-start text-sm">
              {contact.email || "—"}
            </p>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">موبایل</Label>
            <p dir="ltr" className="text-start text-sm">
              {contact.phone || "—"}
            </p>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">شرکت</Label>
            {contact.companyId ? (
              <Link
                href={`/companies/${contact.companyId}`}
                className="text-sm text-primary hover:underline"
              >
                {contact.companyName}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">منبع</Label>
            <p className="text-sm">{SOURCE_LABELS[contact.source]}</p>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">مسئول فروش</Label>
            <p className="text-sm">{contact.ownerName || "—"}</p>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">تاریخ ایجاد</Label>
            <p className="text-sm">{formatDateTime(contact.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">فروش‌های مرتبط</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/pipeline">
                  فانل فروش
                  <ChevronLeft className="size-4 ltr:rotate-180" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <EmptyState
                  icon={Plus}
                  title="فروشی ثبت نشده است"
                  description="از فانل فروش یک فرصت برای این مشتری بسازید."
                />
              ) : (
                <div className="divide-y">
                  {deals.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href="/pipeline"
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {d.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: d.stageColor ?? "#888",
                              }}
                            />
                            {d.stageName || "—"}
                          </span>
                          <span>·</span>
                          <span>{STATUS_LABELS[d.status]}</span>
                          {d.closeDate ? (
                            <>
                              <span>·</span>
                              <span>بستن: {formatDateTime(d.closeDate)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">
                        {formatCurrency(d.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">فیلدهای سفارشی</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <div key={f.id} className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{f.name}</Label>
                    <p className="text-sm">
                      {contact.customFields[f.key] === undefined ||
                      contact.customFields[f.key] === null ||
                      contact.customFields[f.key] === ""
                        ? "—"
                        : String(contact.customFields[f.key])}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">برچسب‌ها</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">برچسبی ثبت نشده است.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((t) => (
                    <Badge
                      key={t.id}
                      variant="outline"
                      style={{ borderColor: t.color, color: t.color }}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <NotesPanel entityType="contact" entityId={contact.id} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">تاریخچه فعالیت</CardTitle>
            <Plus className="size-4 text-muted-foreground" />
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
                        <span className="text-muted-foreground"> «{String(a.data.title)}»</span>
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

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={contact}
        companies={companies}
        members={members}
        customFields={customFields}
        onSaved={() => window.location.reload()}
      />
    </div>
  );
}
