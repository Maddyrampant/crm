import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  FileText,
  Kanban,
  LayoutDashboard,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** مالک ماژول: shared | part1 | part2 — برای مستندات و کامنتهای PR */
  owner: "shared" | "part1" | "part2";
  /** آیا صفحه هنوز ساخته شده؟ */
  ready: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * منوی اصلی — قانون: هر بخش فقط آیتم خودش را اضافه کند.
 * بخش ۱ (hordekiller): owner=part1
 * بخش ۲ (Maddyrampant): owner=part2
 * ویرایش این فایل به ترتیب کامیت، نه همزمان.
 */
export const navSections: NavSection[] = [
  {
    title: "عمومی",
    items: [
      {
        title: "داشبورد",
        href: "/",
        icon: LayoutDashboard,
        owner: "shared",
        ready: true,
      },
    ],
  },
  {
    title: "فروش",
    items: [
      {
        title: "مشتریان",
        href: "/contacts",
        icon: Users,
        owner: "part1",
        ready: false,
      },
      {
        title: "شرکتها",
        href: "/companies",
        icon: Building2,
        owner: "part1",
        ready: false,
      },
      {
        title: "فانل فروش",
        href: "/pipeline",
        icon: Kanban,
        owner: "part1",
        ready: false,
      },
    ],
  },
  {
    title: "مالی",
    items: [
      {
        title: "فاکتورها",
        href: "/invoices",
        icon: FileText,
        owner: "part2",
        ready: false,
      },
    ],
  },
  {
    title: "عملیات",
    items: [
      {
        title: "تقویم و قرارها",
        href: "/calendar",
        icon: CalendarDays,
        owner: "part2",
        ready: false,
      },
      {
        title: "گزارشها",
        href: "/reports",
        icon: BarChart3,
        owner: "part2",
        ready: false,
      },
    ],
  },
  {
    title: "هوشمند",
    items: [
      {
        title: "دستیار هوشمند",
        href: "/assistant",
        icon: Bot,
        owner: "part2",
        ready: false,
      },
      {
        title: "اتوماسیون و وبهاوک",
        href: "/settings/automation",
        icon: Workflow,
        owner: "part2",
        ready: false,
      },
    ],
  },
  {
    title: "تنظیمات",
    items: [
      {
        title: "تنظیمات",
        href: "/settings",
        icon: Settings,
        owner: "part2",
        ready: false,
      },
    ],
  },
];

export type AppNavItem = NavItem & { sectionTitle: string };
export const allNavItems: AppNavItem[] = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, sectionTitle: section.title }))
);
