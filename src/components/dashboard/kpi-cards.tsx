import {
  AlertTriangle,
  DollarSign,
  Handshake,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/format";

type KpiData = {
  contacts: number;
  newContacts: number;
  openDeals: number;
  wonDeals: number;
  openValue: number;
  wonValue: number;
  collected: number;
  overdueInvoices: number;
  winRate: number;
};

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    {
      title: "مشتریان",
      value: formatNumber(data.contacts),
      icon: Users,
      hint: `${formatNumber(data.newContacts)} نفر جدید`,
    },
    {
      title: "فروش‌های باز",
      value: formatNumber(data.openDeals),
      icon: Target,
      hint: formatCurrency(data.openValue),
    },
    {
      title: "نرخ برد",
      value: `${data.winRate}%`,
      icon: TrendingUp,
      hint: `${formatNumber(data.wonDeals)} فروش بسته‌شده`,
    },
    {
      title: "درآمد وصول‌شده",
      value: formatCurrency(data.collected),
      icon: DollarSign,
      hint: "مجموع پرداخت‌ها",
    },
    {
      title: "ارزش بردها",
      value: formatCurrency(data.wonValue),
      icon: Handshake,
      hint: "مجموع مبلغ فروش‌های بسته‌شده",
    },
    {
      title: "فاکتورهای معوقه",
      value: formatNumber(data.overdueInvoices),
      icon: AlertTriangle,
      hint: "نیاز به پیگیری",
      iconClassName:
        data.overdueInvoices > 0
          ? "bg-destructive/10 text-destructive"
          : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((s) => (
        <StatCard
          key={s.title}
          title={s.title}
          value={s.value}
          hint={s.hint}
          icon={s.icon}
          iconClassName={s.iconClassName}
        />
      ))}
    </div>
  );
}
