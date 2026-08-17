"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  StickyNote,
  User,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { ENTITY_LABELS, ACTION_LABELS } from "@/lib/labels";
import type { ActivityLog } from "@/db/schema/activity";

type MemberRow = { id: string; name: string | null };

type Props = {
  activities: ActivityLog[];
  members: MemberRow[];
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contact: User,
  company: Building2,
  deal: CreditCard,
  invoice: FileText,
  appointment: CalendarDays,
  task: CheckCircle2,
  payment: CreditCard,
  note: StickyNote,
  email: Mail,
  sms: MessageSquare,
};

const ENTITY_HREF: Record<string, (id: string) => string> = {
  contact: (id) => `/contacts/${id}`,
  company: (id) => `/companies/${id}`,
  deal: (id) => `/pipeline/deals/${id}`,
  invoice: (id) => `/invoices/${id}`,
};

const ENTITY_FILTER_OPTIONS = [
  { value: "_all", label: "همه" },
  { value: "contact", label: "مشتری" },
  { value: "company", label: "شرکت" },
  { value: "deal", label: "فروش" },
  { value: "invoice", label: "فاکتور" },
  { value: "appointment", label: "قرار ملاقات" },
  { value: "task", label: "وظیفه" },
  { value: "payment", label: "پرداخت" },
  { value: "note", label: "یادداشت" },
  { value: "email", label: "ایمیل" },
  { value: "sms", label: "پیامک" },
];

export function ActivityFeedPanel({ activities, members }: Props) {
  const [entityFilter, setEntityFilter] = useState("_all");

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.name) map.set(m.id, m.name);
    }
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    if (entityFilter === "_all") return activities;
    return activities.filter((a) => a.entityType === entityFilter);
  }, [activities, entityFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {String(filtered.length)} رویداد
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="فعالیتی ثبت نشده"
          description="رویدادهای جدید اینجا نمایش داده می‌شوند."
          className="py-10"
        />
      ) : (
        <ol className="relative space-y-4 border-s ps-4">
          {filtered.map((a) => {
            const Icon = ENTITY_ICONS[a.entityType] ?? Inbox;
            const href = ENTITY_HREF[a.entityType]?.(a.entityId);
            const userName = a.userId ? memberMap.get(a.userId) ?? null : null;
            const title = a.data?.title ? String(a.data.title) : null;

            return (
              <li key={a.id} className="relative">
                <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary/60" />
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-muted">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {ENTITY_LABELS[a.entityType] ?? a.entityType}
                      </span>
                      {" · "}
                      {ACTION_LABELS[a.action] ?? a.action}
                      {title ? (
                        <span className="text-muted-foreground">
                          {" "}«{title}»
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(a.createdAt)}</span>
                      {userName && (
                        <>
                          <span>·</span>
                          <span>{userName}</span>
                        </>
                      )}
                      {href && (
                        <>
                          <span>·</span>
                          <Link
                            href={href}
                            className="underline-offset-2 hover:underline"
                          >
                            مشاهده
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
