import type { Metadata } from "next";
import { DollarSign, Target, TrendingUp, Users } from "lucide-react";
import { count, eq, and } from "drizzle-orm";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { contacts, deals, invoices } from "@/db/schema";
import { formatNumber } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "داشبورد" };

export default async function DashboardPage() {
  const { workspaceId } = await requireWorkspace();

  const [contactCount, openDeals, dealsWon, invoiceCount] = await Promise.all([
    db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId)),
    db
      .select({ value: count() })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "open"))),
    db
      .select({ value: count() })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "won"))),
    db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId)),
  ]);

  const stats = [
    {
      title: "مشتریان",
      value: formatNumber(contactCount[0]?.value ?? 0),
      icon: Users,
      hint: "کل مخاطبین",
    },
    {
      title: "فروش‌های باز",
      value: formatNumber(openDeals[0]?.value ?? 0),
      icon: Target,
      hint: "در حال مذاکره",
    },
    {
      title: "فروش‌های بسته‌شده",
      value: formatNumber(dealsWon[0]?.value ?? 0),
      icon: TrendingUp,
      hint: "بردها",
    },
    {
      title: "فاکتورها",
      value: formatNumber(invoiceCount[0]?.value ?? 0),
      icon: DollarSign,
      hint: "کل فاکتورها",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">
          نمای کلی از وضعیت فروش و مشتریان شما
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {s.title}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <CardDescription>{s.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ماژول‌ها</CardTitle>
          <CardDescription>
            ماژول‌های تخصصی در دو بخش در حال توسعه هستند؛ منوی سمت راست را
            دنبال کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            بخش ۱ (مشتریان، فانل فروش) و بخش ۲ (فاکتور، قرارها، گزارش‌ها،
            ایمیل/پیامک، وب‌هاوک، دستیار هوشمند) به‌صورت موازی ساخته می‌شوند.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
