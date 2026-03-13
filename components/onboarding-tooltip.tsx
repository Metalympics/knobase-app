"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface OnboardingTooltipProps {
  targetId: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  position?: TooltipPosition;
  storageKey: string;
  autoDismissMs?: number;
  onDismiss?: () => void;
}

const positionStyles: Record<
  TooltipPosition,
  { initial: { x: number; y: number }; arrowClass: string }
> = {
  top: {
    initial: { x: 0, y: 6 },
    arrowClass:
      "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45",
  },
  bottom: {
    initial: { x: 0, y: -6 },
    arrowClass:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45",
  },
  left: {
    initial: { x: 6, y: 0 },
    arrowClass:
      "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rotate-45",
  },
  right: {
    initial: { x: -6, y: 0 },
    arrowClass:
      "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45",
  },
};

function getTooltipCoords(
  rect: DOMRect,
  tooltip: DOMRect,
  position: TooltipPosition,
  gap = 10,
) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  switch (position) {
    case "top":
      return {
        top: rect.top + scrollY - tooltip.height - gap,
        left: rect.left + scrollX + rect.width / 2 - tooltip.width / 2,
      };
    case "bottom":
      return {
        top: rect.bottom + scrollY + gap,
        left: rect.left + scrollX + rect.width / 2 - tooltip.width / 2,
      };
    case "left":
      return {
        top: rect.top + scrollY + rect.height / 2 - tooltip.height / 2,
        left: rect.left + scrollX - tooltip.width - gap,
      };
    case "right":
      return {
        top: rect.top + scrollY + rect.height / 2 - tooltip.height / 2,
        left: rect.right + scrollX + gap,
      };
  }
}

export function OnboardingTooltip({
  targetId,
  content,
  icon,
  position = "bottom",
  storageKey,
  autoDismissMs = 8000,
  onDismiss,
}: OnboardingTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    onDismiss?.();
  }, [storageKey, onDismiss]);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {}

    const target = document.getElementById(targetId);
    if (!target) return;

    setVisible(true);
  }, [targetId, storageKey]);

  useEffect(() => {
    if (!visible) return;

    function reposition() {
      const target = document.getElementById(targetId);
      const tooltip = tooltipRef.current;
      if (!target || !tooltip) return;

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      setCoords(getTooltipCoords(targetRect, tooltipRect, position));
    }

    requestAnimationFrame(reposition);

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [visible, targetId, position]);

  useEffect(() => {
    if (!visible || autoDismissMs <= 0) return;

    timerRef.current = setTimeout(dismiss, autoDismissMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, autoDismissMs, dismiss]);

  const { initial, arrowClass } = positionStyles[position];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={tooltipRef}
          role="tooltip"
          initial={{ opacity: 0, scale: 0.95, ...initial }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, ...initial }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: -9999, left: -9999 }
          }
          className="absolute z-50 w-max max-w-xs"
        >
          <div className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
            {/* Arrow */}
            <span
              className={cn(
                "absolute h-3 w-3 border border-border bg-card",
                arrowClass,
              )}
              style={{
                clipPath:
                  position === "top"
                    ? "polygon(0% 0%, 100% 0%, 100% 100%)"
                    : position === "bottom"
                      ? "polygon(0% 0%, 100% 0%, 0% 100%)"
                      : position === "left"
                        ? "polygon(0% 0%, 100% 0%, 100% 100%)"
                        : "polygon(0% 0%, 0% 100%, 100% 100%)",
              }}
            />

            <div className="flex items-start gap-2.5">
              {icon && (
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{content}</div>
                <button
                  onClick={dismiss}
                  className="mt-2 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Got it
                </button>
              </div>
              <button
                onClick={dismiss}
                className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss tooltip"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
