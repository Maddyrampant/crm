"use client";

import { Bell, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
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
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bell className="size-4" />
          اعلان‌ها
        </DropdownMenuLabel>
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">اعلانی ثبت نشده است</p>
          <p className="text-xs text-muted-foreground">
            اعلان‌های وظایف، قرارها و فروش‌ها در اینجا نمایش داده می‌شوند.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
