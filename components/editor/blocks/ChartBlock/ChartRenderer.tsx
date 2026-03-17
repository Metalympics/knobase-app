"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartConfig } from "@/lib/editor/extensions/chart-extension";

const FALLBACK_COLORS = [
  "#4f46e5",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

interface ChartRendererProps {
  type: string;
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
}

export function ChartRenderer({ type, data, config }: ChartRendererProps) {
  const series = config?.series || [];
  const xDataKey = config?.xAxis?.dataKey || "name";
  const showGrid = config?.showGrid !== false;
  const showLegend = config?.showLegend !== false;

  if (!data || data.length === 0) return null;

  if (type === "pie") {
    const dataKey = series[0]?.dataKey || "value";
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={xDataKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  series[i]?.color ||
                  FALLBACK_COLORS[i % FALLBACK_COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={xDataKey} />
          <PolarRadiusAxis />
          {series.map((s, i) => (
            <Radar
              key={s.dataKey}
              name={s.label || s.dataKey}
              dataKey={s.dataKey}
              stroke={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              fill={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              fillOpacity={0.2}
            />
          ))}
          <Tooltip />
          {showLegend && <Legend />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey={xDataKey}
            label={
              config?.xAxis?.label
                ? { value: config.xAxis.label, position: "insideBottom", offset: -5 }
                : undefined
            }
          />
          <YAxis
            label={
              config?.yAxis?.label
                ? { value: config.yAxis.label, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label || s.dataKey}
              stroke={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              fill={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              fillOpacity={0.15}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey={xDataKey}
            label={
              config?.xAxis?.label
                ? { value: config.xAxis.label, position: "insideBottom", offset: -5 }
                : undefined
            }
          />
          <YAxis
            label={
              config?.yAxis?.label
                ? { value: config.yAxis.label, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label || s.dataKey}
              stroke={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey={xDataKey}
          label={
            config?.xAxis?.label
              ? { value: config.xAxis.label, position: "insideBottom", offset: -5 }
              : undefined
          }
        />
        <YAxis
          label={
            config?.yAxis?.label
              ? { value: config.yAxis.label, angle: -90, position: "insideLeft" }
              : undefined
          }
        />
        <Tooltip />
        {showLegend && <Legend />}
        {series.map((s, i) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.label || s.dataKey}
            fill={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
