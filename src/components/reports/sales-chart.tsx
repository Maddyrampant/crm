"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type DataPoint = { month: string; invoiced: number; collected: number };

type Props = {
  data: DataPoint[];
  months: number;
};

const PERSIAN_MONTHS: Record<string, string> = {
  "01": "فروردین",
  "02": "اردیبهشت",
  "03": "خرداد",
  "04": "تیر",
  "05": "مرداد",
  "06": "شهریور",
  "07": "مهر",
  "08": "آبان",
  "09": "آذر",
  "10": "دی",
  "11": "بهمن",
  "12": "اسفند",
};

function formatMonth(raw: string) {
  const [year, month] = raw.split("-");
  const fa = PERSIAN_MONTHS[month] ?? month;
  return `${fa} ${year}`;
}

export function SalesChart({ data, months }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          روند فروش — صدور فاکتور در برابر وصول ({months} ماه)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">داده‌ای برای نمایش نیست</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                }
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  name === "invoiced" ? "صادر شده" : "وصول شده",
                ]}
                labelFormatter={(label) => `ماه: ${label}`}
              />
              <Legend
                formatter={(value) =>
                  value === "invoiced" ? "صادر شده" : "وصول شده"
                }
              />
              <Bar dataKey="invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
