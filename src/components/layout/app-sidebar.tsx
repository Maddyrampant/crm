"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { navSections } from "@/config/nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar side="right" collapsible="icon" className="border-e">
      <SidebarHeader>
        <Brand />
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
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
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="دستیار هوشمند"
              className="opacity-60"
            >
              <Link href="#" aria-disabled>
                <Sparkles />
                <span>دستیار هوشمند</span>
                <SidebarMenuBadge>بهزودی</SidebarMenuBadge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
