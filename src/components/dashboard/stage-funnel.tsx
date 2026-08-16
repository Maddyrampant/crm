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
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Kanban } from "lucide-react";

type Props = {
  data: { name: string; count: number; value: number; color: string }[];
};

export function StageFunnel({ data }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        title="داده‌ای برای نمودار نیست"
        description="بعد از ثبت فروش در فانل، توزیع مراحل اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [formatNumber(Number(v)), "فروش"]}
            contentStyle={{ direction: "rtl" }}
          />
          <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
