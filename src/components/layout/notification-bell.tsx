"use client";

import { Bell, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * زنگ اعلان‌ها — دیتای اعلان در بخش ۲ تکمیل می‌شود؛ فعلاً حالت خالی.
 */
export function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="اعلان‌ها">
          <Bell className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bell className="size-4" />
            اعلان‌ها
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            ۰
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">اعلانی ثبت نشده است</p>
          <p className="text-xs text-muted-foreground">
            اعلان‌های وظایف، قرارها و فروش‌ها در اینجا نمایش داده می‌شوند.
          </p>
        </div>
        <DropdownMenuSeparator />
        <p className="px-4 py-2 text-center text-[11px] text-muted-foreground">
          اعلان‌ها به محض راه‌اندازی بخش ۲ فعال می‌شوند.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
