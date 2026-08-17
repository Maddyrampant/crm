"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mail, FileText, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toFaDigits } from "@/lib/format";

type TrackingStat = { type: string; count: number };

type Props = {
  stats: TrackingStat[];
};

const TYPE_LABELS: Record<string, string> = {
  email_open: "باز شدن ایمیل",
  pdf_view: "مشاهده PDF",
  link_click: "کلیک لینک",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_open: Mail,
  pdf_view: FileText,
  link_click: MousePointerClick,
};

const TYPE_COLORS: Record<string, string> = {
  email_open: "#6366f1",
  pdf_view: "#10b981",
  link_click: "#f59e0b",
};

export function TrackingCharts({ stats }: Props) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  const chartData = stats.map((s) => ({
    name: TYPE_LABELS[s.type] ?? s.type,
    count: s.count,
    fill: TYPE_COLORS[s.type] ?? "#888",
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = TYPE_ICONS[s.type] ?? Mail;
          return (
            <Card key={s.type}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {TYPE_LABELS[s.type] ?? s.type}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{toFaDigits(s.count)}</p>
                <p className="text-xs text-muted-foreground">
                  {total > 0
                    ? `${toFaDigits(Math.round((s.count / total) * 100))}٪ کل`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="داده‌ای ثبت نشده"
          description="وقتی ایمیل ارسال شود یا سندی مشاهده شود، آمار اینجا نمایش داده می‌شود."
          className="py-10"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نمودار بازشدن</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [
                      toFaDigits(Number(value)),
                      "تعداد",
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">جدول آمار</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-xs text-muted-foreground">
                    <th className="py-2 pe-3 font-medium">نوع</th>
                    <th className="py-2 font-medium">تعداد</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.type} className="border-b last:border-0">
                      <td className="py-2 pe-3">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </td>
                      <td className="py-2 text-left font-medium">
                        {toFaDigits(s.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
