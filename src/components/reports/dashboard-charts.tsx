"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

type Props = {
  revenue: { month: string; revenue: number }[];
  pipeline: { name: string; color: string; count: number; total: number }[];
  leadSources: { source: string; count: number }[];
  openValue: number;
};

const sourceLabels: Record<string, string> = {
  website: "وب‌سایت",
  referral: "معرفی",
  social: "شبکه اجتماعی",
  cold_call: "تماس سرد",
  other: "سایر",
};

export function DashboardCharts({ revenue, pipeline, leadSources, openValue }: Props) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">درآمد وصول‌شده (۶ ماه)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
                }
              />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(Number(value ?? 0))
                }
                labelFormatter={(label) => `ماه ${label}`}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرصت‌ها به تفکیک مرحله</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {pipeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              داده‌ای برای نمایش نیست
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "total"
                      ? [formatCurrency(Number(value ?? 0)), "ارزش"]
                      : [`${value} فرصت`, "تعداد"]
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {pipeline.map((s, i) => (
                    <Cell key={s.name} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مخاطبین به تفکیک منبع</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {leadSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">داده‌ای نیست</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSources}
                  dataKey="count"
                  nameKey="source"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {leadSources.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} مخاطب`,
                    sourceLabels[String(name)] || "سایر",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرصت‌های باز</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-1">
          <p className="text-4xl font-bold tabular-nums">
            {formatCurrency(openValue)}
          </p>
          <p className="text-sm text-muted-foreground">
            مجموع ارزش فرصت‌های در حال پیگیری
          </p>
        </CardContent>
      </Card>
    </>
  );
}
