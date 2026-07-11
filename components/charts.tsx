"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { fmtMoney } from "@/lib/utils";

const CYAN = "#05c3f9";
const INK = "#1B1B24";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const PIE_COLORS = [CYAN, GREEN, AMBER, "#a78bfa", "#f472b6", "#60a5fa", "#94a3b8"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #eef0f4",
  boxShadow: "0 8px 24px rgba(27,27,36,0.1)",
  fontSize: 13,
};

// ── Quarterly progress: target vs closed vs pending ──────────────
export function QuarterChart({
  data,
}: {
  data: { period: string; target: number; closed: number; pending: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#6b6b7a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#9a9aa8" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(5,195,249,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="target" name="Target" fill="#e6eaf1" radius={[6, 6, 0, 0]} />
        <Bar isAnimationActive={false} dataKey="closed" name="Closed" fill={CYAN} radius={[6, 6, 0, 0]} />
        <Bar isAnimationActive={false} dataKey="pending" name="Pending" fill={AMBER} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Lead sources pie ─────────────────────────────────────────────
export function SourcePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0)
    return (
      <p className="py-10 text-center text-sm text-ink-faint">
        No source data yet
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Monthly money area/bar ───────────────────────────────────────
export function MoneyBars({
  data,
  dataKey,
  name,
  color = CYAN,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  name: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9a9aa8" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => fmtMoney(v, true)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(5,195,249,0.06)" }}
          formatter={(v) => [fmtMoney(Number(v)), name]}
        />
        <Bar isAnimationActive={false} dataKey={dataKey} name={name} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Pipeline funnel-ish area ─────────────────────────────────────
export function PipelineArea({
  data,
}: {
  data: { month: string; volume: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cyanFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9a9aa8" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => fmtMoney(v, true)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtMoney(Number(v)), "Volume"]}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="volume"
          stroke={CYAN}
          strokeWidth={2.5}
          fill="url(#cyanFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── P&L: income vs expenses by month ─────────────────────────────
export function PnlChart({
  data,
}: {
  data: { month: string; income: number; expenses: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9a9aa8" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => fmtMoney(v, true)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(5,195,249,0.06)" }}
          formatter={(v) => fmtMoney(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="income" name="Income" fill={GREEN} radius={[6, 6, 0, 0]} />
        <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill="#f87171" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Agent production horizontal bars ─────────────────────────────
export function AgentBars({
  data,
}: {
  data: { agent: string; gci: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#9a9aa8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmtMoney(v, true)}
        />
        <YAxis
          type="category"
          dataKey="agent"
          tick={{ fontSize: 12, fill: INK }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtMoney(Number(v)), "GCI"]}
        />
        <Bar isAnimationActive={false} dataKey="gci" fill={GREEN} radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
