"use client";

import { cn } from "@/lib/utils";

interface UsageIndicatorProps {
  used: number;
  total: number;
  label: string;
  warningThreshold?: number;
  className?: string;
}

export function UsageIndicator({
  used,
  total,
  label,
  warningThreshold = 0.8,
  className,
}: UsageIndicatorProps) {
  const ratio = total > 0 ? Math.min(used / total, 1) : 0;
  const percentage = ratio * 100;

  const barColor =
    ratio >= 1
      ? "bg-destructive"
      : ratio >= warningThreshold
        ? "bg-yellow-500"
        : "bg-primary";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-medium">{label}</span>
        <span className={cn("tabular-nums", ratio >= 1 && "text-destructive")}>
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
