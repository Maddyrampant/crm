"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/reports/stat-card";
import { formatCurrency, toFaDigits } from "@/lib/format";
import type { ForecastRow, StalledDeal } from "@/services/forecast";

type Props = {
  forecast: ForecastRow[];
  stalled: StalledDeal[];
  totalWeighted: number;
  totalDeals: number;
  avgProbability: number;
};

const PREDICTION_LABELS: Record<string, string> = {
  high: "احتمال بالا",
  medium: "احتمال متوسط",
  low: "احتمال پایین",
};

const PREDICTION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  high: "default",
  medium: "secondary",
  low: "destructive",
};

function getPrediction(prob: number): "high" | "medium" | "low" {
  if (prob >= 60) return "high";
  if (prob >= 35) return "medium";
  return "low";
}

export function ForecastPanel({
  forecast,
  stalled,
  totalWeighted,
  totalDeals,
  avgProbability,
}: Props) {
  const chartData = forecast.map((r) => ({
    name: r.stageName,
    واقعی: r.totalAmount,
    وزنی: r.weightedAmount,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="ارزش وزنی کل"
          value={formatCurrency(totalWeighted)}
        />
        <StatCard
          icon={<Zap className="size-4" />}
          label="فرصتهای باز"
          value={toFaDigits(totalDeals)}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="احتمال میانگین"
          value={`${toFaDigits(avgProbability)}٪`}
        />
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">نمودار</TabsTrigger>
          <TabsTrigger value="stalled">
            متوقف‌شده {stalled.length > 0 && `(${toFaDigits(stalled.length)})`}
          </TabsTrigger>
          <TabsTrigger value="predictions">پیش‌بینی</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                ارزش واقعی vs وزنی بهازای مرحله
              </CardTitle>
            </CardHeader>
            <CardContent>
              {forecast.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="داده‌ای موجود نیست"
                  description="فرصتهای باز فروش را در فانل مشاهده کنید."
                  className="py-8"
                />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), ""]}
                    />
                    <Bar dataKey="واقعی" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="وزنی" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stalled">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-orange-500" />
                فرصتهای متوقف‌شده
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stalled.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="توقفی وجود ندارد"
                  description="هیچ فرصتی بیش از ۱۴ روز در یک مرحله متوقف نشده است."
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-right text-xs text-muted-foreground">
                        <th className="py-2 pe-3 font-medium">عنوان</th>
                        <th className="py-2 pe-3 font-medium">مرحله</th>
                        <th className="py-2 pe-3 font-medium">مبلغ</th>
                        <th className="py-2 font-medium">روزهای توقف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stalled.map((d) => (
                        <tr key={d.dealId} className="border-b last:border-0">
                          <td className="py-2 pe-3">
                            <Link
                              href={`/pipeline/deals/${d.dealId}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {d.title}
                            </Link>
                          </td>
                          <td className="py-2 pe-3 text-muted-foreground">
                            {d.stageName}
                          </td>
                          <td className="py-2 pe-3">{formatCurrency(d.amount)}</td>
                          <td className="py-2 text-left">
                            <Badge variant="destructive">
                              {toFaDigits(d.daysSinceUpdate)} روز
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">پیش‌بینی بر اساس مرحله</CardTitle>
            </CardHeader>
            <CardContent>
              {forecast.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="داده‌ای موجود نیست"
                  description="فرصتهای باز فروش را در فانل مشاهده کنید."
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-right text-xs text-muted-foreground">
                        <th className="py-2 pe-3 font-medium">مرحله</th>
                        <th className="py-2 pe-3 font-medium">تعداد</th>
                        <th className="py-2 pe-3 font-medium">احتمال</th>
                        <th className="py-2 pe-3 font-medium">مبلغ وزنی</th>
                        <th className="py-2 font-medium">پیش‌بینی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map((r) => {
                        const pred = getPrediction(r.winProbability);
                        return (
                          <tr key={r.stageId} className="border-b last:border-0">
                            <td className="py-2 pe-3 font-medium">
                              {r.stageName}
                            </td>
                            <td className="py-2 pe-3">
                              {toFaDigits(r.dealCount)}
                            </td>
                            <td className="py-2 pe-3">
                              {toFaDigits(r.winProbability)}٪
                            </td>
                            <td className="py-2 pe-3">
                              {formatCurrency(r.weightedAmount)}
                            </td>
                            <td className="py-2">
                              <Badge variant={PREDICTION_VARIANT[pred]}>
                                {PREDICTION_LABELS[pred]}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
