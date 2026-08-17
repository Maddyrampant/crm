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
  Settings,
  Sparkles,
  SquareCheckBig,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatDate, toFaDigits } from "@/lib/format";
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import type { Notification, NotificationType } from "@/db/schema";

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  invoice: FileText,
  payment: Banknote,
  deal: Trophy,
  task: SquareCheckBig,
  appointment: CalendarDays,
  ai: Sparkles,
  contact: User,
  system: Settings,
};

const TYPE_STYLE: Record<NotificationType, string> = {
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

export function NotificationBell() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const data = await listNotificationsAction(20);
        if (!active) return;
        setItems(data.items);
        setUnread(data.unread);
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
  }, [refreshKey]);

  const markRead = (id: string) => {
    startTransition(async () => {
      const res = await markNotificationReadAction(id);
      if (!res.ok) {
        toast.error("خطا در علامت‌گذاری اعلان");
        return;
      }
      setItems((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
      setUnread((u) => Math.max(0, u - 1));
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setItems((prev) =>
        (prev ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date() }))
      );
      setUnread(0);
    });
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRefreshKey((k) => k + 1);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="اعلان‌ها"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute end-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 99 ? "۹۹+" : toFaDigits(unread)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Bell className="size-4" />
            اعلان‌ها
          </span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={markAllRead}
              disabled={isPending}
            >
              <CheckCheck className="size-3.5" />
              خواندن همه
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            در حال بارگذاری…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="اعلانی ثبت نشده است"
            description="اعلان‌های وظایف، قرارها، فاکتورها و فروش‌ها در اینجا نمایش داده می‌شوند."
            className="py-8"
          />
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-2.5 px-2 py-2",
                    !n.readAt && "bg-accent/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      TYPE_STYLE[n.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="text-sm font-medium"
                        onClick={() => {
                          if (!n.readAt) markRead(n.id);
                        }}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{n.title}</p>
                    )}
                    {n.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.readAt ? (
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
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Inbox className="size-4" />
          مشاهده همهٔ اعلان‌ها
        </Link>
        <p className="px-4 py-2 text-center text-[11px] text-muted-foreground">
          به‌روزرسانی خودکار هر ۳۰ ثانیه
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
