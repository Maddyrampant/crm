"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Banknote,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  FileText,
  Inbox,
  LoaderCircle,
  Search,
  Settings,
  Settings2,
  Sparkles,
  SquareCheckBig,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";
import { formatDate, toFaDigits } from "@/lib/format";
import { NOTIFICATION_TYPE_META } from "@/lib/notifications";
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import type { Notification } from "@/db/schema";
import { NotificationPreferences } from "./notification-preferences";

const ICON_BY_NAME: Record<string, LucideIcon> = {
  "file-text": FileText,
  banknote: Banknote,
  trophy: Trophy,
  "check-square": SquareCheckBig,
  calendar: CalendarDays,
  "smart-toy": Sparkles,
  user: User,
  settings: Settings,
};

const TYPE_STYLE: Record<string, string> = {
  invoice: "bg-blue-500/10 text-blue-600",
  payment: "bg-emerald-500/10 text-emerald-600",
  deal: "bg-violet-500/10 text-violet-600",
  task: "bg-sky-500/10 text-sky-600",
  appointment: "bg-amber-500/10 text-amber-600",
  ai: "bg-fuchsia-500/10 text-fuchsia-600",
  contact: "bg-teal-500/10 text-teal-600",
  system: "bg-slate-500/10 text-slate-600",
};

function formatRelativeTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const diffMin = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (diffMin < 1) return "لحظاتی پیش";
  if (diffMin < 60) return `${toFaDigits(diffMin)} دقیقه پیش`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${toFaDigits(diffHours)} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${toFaDigits(diffDays)} روز پیش`;
  return formatDate(value);
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

type Group = { key: string; label: string; items: Notification[] };

function groupByDay(items: Notification[]): Group[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const groups: Group[] = [];
  for (const item of items) {
    const day = startOfDay(new Date(item.createdAt));
    const key = day === today ? "today" : day === yesterday ? "yesterday" : formatDate(item.createdAt);
    const label = day === today ? "امروز" : day === yesterday ? "دیروز" : formatDate(item.createdAt);
    const group = groups.find((g) => g.key === key);
    if (group) group.items.push(item);
    else groups.push({ key, label, items: [item] });
  }
  return groups;
}

export function NotificationCenterPanel() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (document.hidden) return;
      try {
        const data = await listNotificationsAction({
          page,
          pageSize,
          type: typeFilter === "all" ? undefined : typeFilter,
        });
        if (!active) return;
        setItems(data.items);
        setUnread(data.unread);
        setTotal(data.total);
      } catch {
        if (active) setItems((prev) => prev ?? []);
      }
    };
    void run();
    const id = setInterval(run, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [page, pageSize, typeFilter]);

  const markRead = (id: string) => {
    const previousItems = items;
    const previousUnread = unread;

    startTransition(() => {
      setItems((prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    });

    void (async () => {
      const res = await markNotificationReadAction(id);
      if (!res.ok) {
        setItems(previousItems);
        setUnread(previousUnread);
        toast.error("خطا در علامت‌گذاری اعلان");
      }
    })();
  };

  const markAllRead = () => {
    const previousItems = items;
    const previousUnread = unread;

    startTransition(() => {
      setItems((prev) =>
        (prev ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date() }))
      );
      setUnread(0);
    });

    void (async () => {
      const res = await markAllNotificationsReadAction();
      if (!res.ok) {
        setItems(previousItems);
        setUnread(previousUnread);
        toast.error("خطا در خواندن همهٔ اعلان‌ها");
      }
    })();
  };

  const filteredItems = items ?? [];
  const groups = groupByDay(filteredItems);

  const NOTIFICATION_TYPES = [
    { value: "all", label: "همه" },
    { value: "invoice", label: "فاکتور" },
    { value: "payment", label: "پرداخت" },
    { value: "deal", label: "فروش" },
    { value: "task", label: "وظیفه" },
    { value: "appointment", label: "قرار" },
    { value: "ai", label: "AI" },
    { value: "contact", label: "مخاطب" },
    { value: "system", label: "سیستم" },
  ];

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="size-4" />
          اعلان‌ها
          {unread > 0 ? (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-600">
              {toFaDigits(unread)} نخوانده
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={markAllRead}
              disabled={isPending}
            >
              <CheckCheck className="size-3.5" />
              خواندن همه
            </Button>
          )}
          <Button
            variant={showPrefs ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowPrefs(!showPrefs)}
          >
            <Settings2 className="size-3.5" />
            تنظیمات اعلان‌ها
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            dir="rtl"
            className="ps-8"
            placeholder="جستجو..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="نوع" />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showPrefs ? (
        <NotificationPreferences />
      ) : items === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="اعلانی ثبت نشده است"
          description="اعلان‌های وظایف، قرارها، فاکتورها و فروش‌ها در اینجا نمایش داده می‌شوند."
          className="py-16"
        />
      ) : (
        <>
          <div className="divide-y divide-border">
            {groups.map((group) => (
              <div key={group.key} className="p-4">
                <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {group.label}
                </h2>
                <ul className="space-y-1">
                  {group.items.map((n) => {
                    const meta = NOTIFICATION_TYPE_META[n.type];
                    const Icon = ICON_BY_NAME[meta?.icon ?? ""] ?? Bell;
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 rounded-md px-3 py-2.5",
                          !n.readAt && "bg-accent/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                            TYPE_STYLE[n.type] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {n.link ? (
                              <Link
                                href={n.link}
                                className="text-sm font-medium hover:underline"
                                onClick={() => {
                                  if (!n.readAt) markRead(n.id);
                                }}
                              >
                                {n.title}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium">{n.title}</span>
                            )}
                            {meta ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {meta.label}
                              </span>
                            ) : null}
                          </div>
                          {n.body ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>
                        <span className="mt-1 flex items-center gap-1">
                          {!n.readAt && (
                            <span className="size-2 rounded-full bg-red-500" />
                          )}
                          {!n.readAt && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 shrink-0"
                              aria-label="علامت‌گذاری به‌عنوان خوانده"
                              onClick={() => markRead(n.id)}
                              disabled={isPending}
                            >
                              <Check className="size-3.5" />
                            </Button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {total > pageSize && (
            <div className="border-t p-3">
              <PaginationControls
                page={page}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            </div>
          )}
        </>
      )}

      <div className="border-t px-4 py-2 text-center text-[11px] text-muted-foreground">
        به‌روزرسانی خودکار هر ۳۰ ثانیه
      </div>
    </div>
  );
}
