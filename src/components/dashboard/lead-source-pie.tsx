"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#ec4899",
  "#14b8a6",
];

const SOURCE_LABELS: Record<string, string> = {
  website: "وب‌سایت",
  referral: "معرفی",
  social: "شبکه اجتماعی",
  cold_call: "تماس سرد",
  other: "سایر",
};

type Props = {
  data: { source: string; count: number }[];
};

export function LeadSourcePie({ data }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="داده‌ای برای نمودار نیست"
        description="بعد از ثبت مخاطب، توزیع منابع اینجا نمایش داده می‌شود."
      />
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: SOURCE_LABELS[d.source] || d.source || "نامشخص",
  }));

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} مخاطب`, String(name)]}
            contentStyle={{ direction: "rtl" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
