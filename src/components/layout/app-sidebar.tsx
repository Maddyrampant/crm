"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navSections, type NavRole } from "@/config/nav";

const ROLE_LEVEL: Record<NavRole, number> = {
  viewer: 0,
  seller: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 pb-2 pt-1">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
        <Zap className="size-4" />
      </div>
      <div className="grid gap-0.5 text-right group-data-[collapsible=icon]:hidden">
        <span className="text-sm font-bold leading-none">CRM</span>
        <span className="text-[10px] leading-tight text-muted-foreground">
          مدیریت فروش و مشتریان
        </span>
      </div>
    </div>
  );
}

export function AppSidebar({ role }: { role: NavRole }) {
  const pathname = usePathname();

  return (
    <Sidebar side="right" collapsible="icon" className="border-e">
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => {
          const items = section.items.filter((item) =>
            item.minRole ? ROLE_LEVEL[role] >= ROLE_LEVEL[item.minRole] : true
          );
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" &&
                        (pathname.startsWith(item.href) ||
                          pathname.startsWith(`${item.href}/`)));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            !item.ready && "opacity-60",
                            isActive &&
                              "border-e-2 border-primary bg-sidebar-accent pe-3"
                          )}
                        >
                          <Link href={item.ready ? item.href : "#"}>
                            <item.icon />
                            <span>{item.title}</span>
                            {!item.ready && (
                              <SidebarMenuBadge className="text-[10px]">
                                بهزودی
                              </SidebarMenuBadge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
