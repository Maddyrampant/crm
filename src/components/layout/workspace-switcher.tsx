"use client";

import { Building2, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

/**
 * سوییچر ورک‌اسپیس — در فاز ۰ فقط نام فعلی را نشان می‌دهد.
 * مدیریت چند ورک‌اسپیس در فازهای بعدی تکمیل می‌شود.
 */
export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="grid flex-1 text-right text-sm leading-tight">
            <span className="truncate font-semibold">CRM</span>
            <span className="truncate text-xs text-muted-foreground">
              ورک‌اسپیس من
            </span>
          </div>
          <ChevronsUpDown className="ms-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side={isMobile ? "bottom" : "left"}
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          ورک‌اسپیس‌ها (به‌زودی)
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
