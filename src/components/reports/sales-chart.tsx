"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toFaDigits } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

type SalesData = {
  month: string;
  invoiced: number;
  collected: number;
};

type Props = {
  data: SalesData[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground">
          {entry.name === "invoiced" ? "صورتحساب شده" : "وصول شده"}:{" "}
          {toFaDigits(entry.value)} تومان
        </p>
      ))}
    </div>
  );
}

export function SalesChart({ data }: Props) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="داده‌ای موجود نیست"
        description="هنوز اطلاعات فروشی ثبت نشده است."
      />
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => toFaDigits(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) =>
              value === "invoiced" ? "صورتحساب شده" : "وصول شده"
            }
          />
          <Bar
            dataKey="invoiced"
            name="invoiced"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="collected"
            name="collected"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
