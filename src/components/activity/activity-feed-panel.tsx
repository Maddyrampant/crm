"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Clock,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  User,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/reports/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { ENTITY_LABELS, ACTION_LABELS } from "@/lib/labels";
import { createAppointmentAction } from "@/actions/calendar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

const ENTITY_COLORS: Record<string, string> = {
  contact: "bg-blue-100 text-blue-600",
  company: "bg-cyan-100 text-cyan-600",
  deal: "bg-green-100 text-green-600",
  invoice: "bg-yellow-100 text-yellow-600",
  appointment: "bg-purple-100 text-purple-600",
  task: "bg-orange-100 text-orange-600",
  payment: "bg-emerald-100 text-emerald-600",
  note: "bg-gray-100 text-gray-600",
  email: "bg-indigo-100 text-indigo-600",
  sms: "bg-pink-100 text-pink-600",
};

const ENTITY_DOT_COLORS: Record<string, string> = {
  contact: "bg-blue-500",
  company: "bg-cyan-500",
  deal: "bg-green-500",
  invoice: "bg-yellow-500",
  appointment: "bg-purple-500",
  task: "bg-orange-500",
  payment: "bg-emerald-500",
  note: "bg-gray-500",
  email: "bg-indigo-500",
  sms: "bg-pink-500",
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<"call" | "meeting">("call");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.name) map.set(m.id, m.name);
    }
    return map;
  }, [members]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
    return {
      total: activities.length,
      thisWeek: activities.filter((a) => new Date(a.createdAt) >= weekAgo).length,
      thisMonth: activities.filter((a) => new Date(a.createdAt) >= monthAgo).length,
    };
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (entityFilter !== "_all" && a.entityType !== entityFilter) return false;
      const d = new Date(a.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [activities, entityFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openQuickAction(type: "call" | "meeting") {
    setQuickActionType(type);
    setQuickTitle("");
    setQuickNotes("");
    setQuickActionOpen(true);
  }

  async function handleQuickAction() {
    if (saving) return;
    if (!quickTitle.trim()) {
      toast.error("عنوان الزامی است");
      return;
    }
    setSaving(true);
    const result = await createAppointmentAction({
      title: quickTitle.trim(),
      type: quickActionType,
      notes: quickNotes.trim() || undefined,
      startsAt: new Date().toISOString(),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("خطا در ایجاد");
      return;
    }
    toast.success(quickActionType === "call" ? "تماس ثبت شد" : "جلسه ثبت شد");
    setQuickActionOpen(false);
    window.location.reload();
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Inbox className="size-4" />}
          label="کل فعالیت‌ها"
          value={toFaDigits(stats.total)}
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="این هفته"
          value={toFaDigits(stats.thisWeek)}
        />
        <StatCard
          icon={<CalendarDays className="size-4" />}
          label="این ماه"
          value={toFaDigits(stats.thisMonth)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
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
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-36"
          placeholder="از تاریخ"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-36"
          placeholder="تا تاریخ"
        />
        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openQuickAction("call")}>
            <Phone className="size-3.5" />
            تماس جدید
          </Button>
          <Button variant="outline" size="sm" onClick={() => openQuickAction("meeting")}>
            <Plus className="size-3.5" />
            جلسه جدید
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="فعالیتی ثبت نشده"
          description="رویدادهای جدید اینجا نمایش داده می‌شوند."
          className="py-10"
        />
      ) : (
        <>
          <ol className="relative space-y-4 border-s ps-4">
            {paginatedItems.map((a) => {
            const Icon = ENTITY_ICONS[a.entityType] ?? Inbox;
            const colorClass = ENTITY_COLORS[a.entityType] ?? "bg-gray-100 text-gray-600";
            const dotColor = ENTITY_DOT_COLORS[a.entityType] ?? "bg-gray-500";
            const href = ENTITY_HREF[a.entityType]?.(a.entityId);
            const userName = a.userId ? memberMap.get(a.userId) ?? null : null;
            const title = a.data?.title ? String(a.data.title) : null;
            const isDeal = a.entityType === "deal";
            const dealTitle = isDeal && title ? title : null;

            return (
              <li key={a.id} className="relative">
                <span className={`absolute -start-[21px] top-1.5 size-2.5 rounded-full ${dotColor}`} />
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded ${colorClass}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {ENTITY_LABELS[a.entityType] ?? a.entityType}
                      </span>
                      {" · "}
                      {ACTION_LABELS[a.action] ?? a.action}
                      {dealTitle ? (
                        <Link
                          href={`/pipeline/deals/${a.entityId}`}
                          className="me-1 font-medium text-primary underline-offset-2 hover:underline"
                        >
                          «{dealTitle}»
                        </Link>
                      ) : title ? (
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
                      {href && !dealTitle && (
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
          {filtered.length > pageSize && (
            <PaginationControls
              page={page}
              total={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </>
      )}

      <Dialog open={quickActionOpen} onOpenChange={setQuickActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickActionType === "call" ? "تماس جدید" : "جلسه جدید"}
            </DialogTitle>
            <DialogDescription>
              {quickActionType === "call"
                ? "ثبت تماس تلفنی جدید"
                : "ایجاد جلسه یا ملاقات جدید"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">عنوان</Label>
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={
                  quickActionType === "call"
                    ? "مثلاً: پیگیری قیمت"
                    : "مثلاً: جلسه معرفی محصول"
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                توضیحات (اختیاری)
              </Label>
              <Textarea
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="جزئیات تماس یا جلسه"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickActionOpen(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button onClick={handleQuickAction} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : quickActionType === "call" ? (
                "ثبت تماس"
              ) : (
                "ایجاد جلسه"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
