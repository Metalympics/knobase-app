"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  currentUsage: number;
  limit: number;
  featureName: string;
  onUpgrade: () => void;
  className?: string;
}

export function UpgradePrompt({
  currentUsage,
  limit,
  featureName,
  onUpgrade,
  className,
}: UpgradePromptProps) {
  const percentage = Math.min((currentUsage / limit) * 100, 100);
  const isAtLimit = currentUsage >= limit;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-card px-4 py-3",
        isAtLimit && "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">
          You&apos;re using{" "}
          <span className={cn(isAtLimit && "text-destructive")}>
            {currentUsage}/{limit}
          </span>{" "}
          {featureName}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isAtLimit ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <Button size="sm" onClick={onUpgrade}>
        <Zap className="size-3.5" />
        Upgrade for unlimited
      </Button>
    </div>
  );
}
