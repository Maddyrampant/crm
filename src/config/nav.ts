import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Handshake,
  Kanban,
  LayoutDashboard,
  Link2,
  Package,
  Settings,
  Truck,
  UserCog,
  Users,
  Warehouse,
  Workflow,
} from "lucide-react";

export type NavRole = "owner" | "admin" | "manager" | "seller" | "viewer";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** مالک ماژول: shared | part1 | part2 — برای مستندات و کامنت‌های PR */
  owner: "shared" | "part1" | "part2";
  /** آیا صفحه هنوز ساخته شده؟ */
  ready: boolean;
  /** حداقل نقش لازم برای نمایش آیتم در منو (اختیاری) */
  minRole?: NavRole;
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
        ready: true,
      },
      {
        title: "شرکتها",
        href: "/companies",
        icon: Building2,
        owner: "part1",
        ready: true,
      },
      {
        title: "فانل فروش",
        href: "/pipeline",
        icon: Kanban,
        owner: "part1",
        ready: true,
      },
      {
        title: "فروشها",
        href: "/pipeline/deals",
        icon: Handshake,
        owner: "part1",
        ready: true,
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
        ready: true,
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
        ready: true,
      },
      {
        title: "گزارشها",
        href: "/reports",
        icon: BarChart3,
        owner: "part2",
        ready: true,
      },
    ],
  },
  {
    title: "فروشگاه و انبار",
    items: [
      {
        title: "کالاها",
        href: "/products",
        icon: Package,
        owner: "part1",
        ready: true,
      },
      {
        title: "انبارها",
        href: "/warehouses",
        icon: Warehouse,
        owner: "part1",
        ready: true,
      },
      {
        title: "موجودی",
        href: "/stock",
        icon: Boxes,
        owner: "part1",
        ready: true,
      },
      {
        title: "سفارش‌های خرید",
        href: "/purchases",
        icon: ClipboardList,
        owner: "part1",
        ready: true,
      },
      {
        title: "تأمین‌کنندگان",
        href: "/suppliers",
        icon: Truck,
        owner: "part1",
        ready: true,
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
        ready: true,
      },
      {
        title: "اتوماسیون و وبهاوک",
        href: "/settings",
        icon: Workflow,
        owner: "part2",
        ready: true,
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
        ready: true,
      },
      {
        title: "اعضای تیم",
        href: "/settings/team",
        icon: UserCog,
        owner: "part1",
        ready: true,
        minRole: "admin",
      },
      {
        title: "قوانین اتوماسیون",
        href: "/settings/rules",
        icon: Workflow,
        owner: "part1",
        ready: true,
        minRole: "manager",
      },
      {
        title: "لینک‌های رزرو",
        href: "/settings/booking-links",
        icon: Link2,
        owner: "part1",
        ready: true,
        minRole: "seller",
      },
    ],
  },
];

export type AppNavItem = NavItem & { sectionTitle: string };
export const allNavItems: AppNavItem[] = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, sectionTitle: section.title }))
);
