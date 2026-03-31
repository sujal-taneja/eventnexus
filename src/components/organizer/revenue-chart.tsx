"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenueChartPoint = { day: string; revenue: number };

export function OrganizerRevenueChart({ data }: { data: RevenueChartPoint[] }) {
  if (!data.length || data.every((d) => d.revenue === 0)) {
    return (
      <p className="text-[0.875rem] text-[var(--text-tertiary)] text-center py-16">
        No confirmed sales in the last 30 days. When tickets sell, revenue appears here.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="organizerRevFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(128,128,128,0.15)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) =>
            typeof value === "number"
              ? [`₹${value.toLocaleString("en-IN")}`, "Revenue"]
              : ["", ""]
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#e4e4e7"
          strokeWidth={2}
          fill="url(#organizerRevFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
