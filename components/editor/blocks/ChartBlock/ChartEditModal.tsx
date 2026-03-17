"use client";

import { useState, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  AreaChart,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ChartConfig } from "@/lib/editor/extensions/chart-extension";
import { ChartRenderer } from "./ChartRenderer";

const CHART_TYPES = [
  { id: "bar", label: "Bar", icon: BarChart3 },
  { id: "line", label: "Line", icon: LineChartIcon },
  { id: "area", label: "Area", icon: AreaChart },
  { id: "pie", label: "Pie", icon: PieChartIcon },
  { id: "radar", label: "Radar", icon: Activity },
] as const;

const PRESET_COLORS = [
  "#4f46e5", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

interface ChartEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
  chartType: string;
  onSave: (
    data: Array<Record<string, unknown>>,
    config: ChartConfig,
    type: string,
  ) => void;
}

export function ChartEditModal({
  isOpen,
  onClose,
  data: initialData,
  config: initialConfig,
  chartType: initialType,
  onSave,
}: ChartEditModalProps) {
  const [activeTab, setActiveTab] = useState<"data" | "config" | "preview">("data");
  const [chartType, setChartType] = useState(initialType);
  const [data, setData] = useState<Array<Record<string, unknown>>>(
    () => JSON.parse(JSON.stringify(initialData)),
  );
  const [config, setConfig] = useState<ChartConfig>(
    () => JSON.parse(JSON.stringify(initialConfig)),
  );

  const columns = data.length > 0 ? Object.keys(data[0]) : ["name", "value"];

  const addRow = useCallback(() => {
    const newRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      newRow[col] = col === columns[0] ? `Item ${data.length + 1}` : 0;
    });
    setData((prev) => [...prev, newRow]);
  }, [columns, data.length]);

  const removeRow = useCallback((index: number) => {
    setData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addColumn = useCallback(() => {
    const colName = `col${columns.length}`;
    setData((prev) => prev.map((row) => ({ ...row, [colName]: 0 })));
    setConfig((prev) => ({
      ...prev,
      series: [
        ...prev.series,
        {
          dataKey: colName,
          color: PRESET_COLORS[prev.series.length % PRESET_COLORS.length],
          label: colName,
        },
      ],
    }));
  }, [columns.length]);

  const removeColumn = useCallback(
    (colKey: string) => {
      if (columns.length <= 2) return;
      setData((prev) =>
        prev.map((row) => {
          const newRow = { ...row };
          delete newRow[colKey];
          return newRow;
        }),
      );
      setConfig((prev) => ({
        ...prev,
        series: prev.series.filter((s) => s.dataKey !== colKey),
      }));
    },
    [columns.length],
  );

  const updateCell = useCallback(
    (rowIndex: number, colKey: string, value: string) => {
      setData((prev) =>
        prev.map((row, i) => {
          if (i !== rowIndex) return row;
          const isLabelCol = colKey === (config?.xAxis?.dataKey || columns[0]);
          return { ...row, [colKey]: isLabelCol ? value : (Number(value) || 0) };
        }),
      );
    },
    [config?.xAxis?.dataKey, columns],
  );

  const handleSave = () => {
    onSave(data, config, chartType);
  };

  if (!isOpen) return null;

  const labelCol = config?.xAxis?.dataKey || columns[0];
  const dataCols = columns.filter((c) => c !== labelCol);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-semibold text-neutral-900">Edit Chart</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chart type selector */}
        <div className="flex items-center gap-1 border-b border-neutral-100 px-5 py-2">
          {CHART_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setChartType(id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                chartType === id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-5">
          {(["data", "config", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "data" && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="border-b border-r border-neutral-200 px-3 py-2 text-left font-medium text-neutral-600 last:border-r-0"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span>{col}</span>
                            {col !== labelCol && dataCols.length > 1 && (
                              <button
                                onClick={() => removeColumn(col)}
                                className="text-neutral-300 hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-8 border-b border-neutral-200" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-neutral-50/50">
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="border-b border-r border-neutral-100 px-1 py-0.5 last:border-r-0"
                          >
                            <input
                              type={col === labelCol ? "text" : "number"}
                              value={String(row[col] ?? "")}
                              onChange={(e) =>
                                updateCell(rowIdx, col, e.target.value)
                              }
                              className="w-full rounded px-2 py-1 text-xs outline-none focus:bg-indigo-50/50"
                            />
                          </td>
                        ))}
                        <td className="w-8 border-b border-neutral-100 text-center">
                          <button
                            onClick={() => removeRow(rowIdx)}
                            className="text-neutral-300 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus className="h-3 w-3" /> Add Row
                </button>
                <button
                  onClick={addColumn}
                  className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus className="h-3 w-3" /> Add Column
                </button>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Chart Title
                </label>
                <input
                  type="text"
                  value={config.title || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Optional title..."
                  className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
                />
              </div>

              {chartType !== "pie" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">
                        X-Axis Label
                      </label>
                      <input
                        type="text"
                        value={config.xAxis?.label || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            xAxis: { ...prev.xAxis!, label: e.target.value },
                          }))
                        }
                        className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">
                        Y-Axis Label
                      </label>
                      <input
                        type="text"
                        value={config.yAxis?.label || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            yAxis: { ...prev.yAxis, label: e.target.value },
                          }))
                        }
                        className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={config.showLegend !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        showLegend: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                  Show Legend
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={config.showGrid !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        showGrid: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                  Show Grid
                </label>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-600">
                  Series Colors
                </label>
                <div className="space-y-2">
                  {config.series.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={s.color}
                        onChange={(e) => {
                          const updated = [...config.series];
                          updated[i] = { ...updated[i], color: e.target.value };
                          setConfig((prev) => ({ ...prev, series: updated }));
                        }}
                        className="h-7 w-7 cursor-pointer rounded border border-neutral-200"
                      />
                      <input
                        type="text"
                        value={s.label || s.dataKey}
                        onChange={(e) => {
                          const updated = [...config.series];
                          updated[i] = { ...updated[i], label: e.target.value };
                          setConfig((prev) => ({ ...prev, series: updated }));
                        }}
                        className="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-indigo-300"
                      />
                      <span className="text-[10px] text-neutral-400">
                        {s.dataKey}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4">
              <ChartRenderer type={chartType} data={data} config={config} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
