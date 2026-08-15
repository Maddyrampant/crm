"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addNoteAction } from "@/actions/contacts";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  STAGE_VARIANT,
} from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { ActivityRow, ContactRow, CustomFieldRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  contact: ContactRow;
  customFields: CustomFieldRow[];
  activity: ActivityRow[];
  companies: { id: string; name: string }[];
  members: WorkspaceMemberRow[];
  canManage: boolean;
};

export function ContactDetail({
  contact,
  customFields,
  activity,
  companies,
  members,
  canManage,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAddNote() {
    if (!noteText.trim()) return;
    startTransition(async () => {
      const result = await addNoteAction({
        entityType: "contact",
        entityId: contact.id,
        body: noteText.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNoteText("");
      toast.success("یادداشت ذخیره شد");
      window.location.reload();
    });
  }

  const customFieldValues = Object.entries(contact.customFields).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">یادداشت‌ها</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="یادداشت جدید..."
                />
                <Button size="icon" onClick={handleAddNote} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
              {contact.notes && (
                <p className="rounded-lg border bg-muted/30 p-3 text-sm">{contact.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                یادداشت‌های «گفتگو» در این بخش نمایش داده می‌شوند.
              </p>
            </CardContent>
          </Card>
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
