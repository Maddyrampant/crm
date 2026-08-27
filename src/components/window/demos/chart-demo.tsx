"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "فروردین", value: 40 },
  { name: "اردیبهشت", value: 65 },
  { name: "خرداد", value: 55 },
  { name: "تیر", value: 80 },
  { name: "مرداد", value: 70 },
  { name: "شهریور", value: 95 },
];

export function ChartDemo() {
  return (
    <div className="h-full w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
