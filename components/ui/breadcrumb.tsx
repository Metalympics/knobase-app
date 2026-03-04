"use client";

import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  maxVisible?: number;
}

export function Breadcrumb({ items, maxVisible = 4 }: BreadcrumbProps) {
  if (items.length === 0) return null;

  let visibleItems = items;
  let collapsed = false;

  if (items.length > maxVisible) {
    visibleItems = [items[0], ...items.slice(-(maxVisible - 1))];
    collapsed = true;
  }

  return (
    <nav className="flex items-center gap-0.5 text-sm min-w-0" aria-label="Breadcrumb">
      {visibleItems.map((item, i) => {
        const isLast = i === visibleItems.length - 1;
        const showEllipsis = collapsed && i === 0;

        const content = item.onClick ? (
          <button
            onClick={item.onClick}
            className={`flex items-center gap-1 rounded px-1 py-0.5 transition-colors min-w-0 ${
              isLast
                ? "font-medium text-neutral-900 hover:bg-neutral-100"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            }`}
          >
            {item.icon && <span className="text-xs shrink-0">{item.icon}</span>}
            <span className={`truncate ${isLast ? "max-w-[180px]" : "max-w-[120px]"}`}>
              {item.label}
            </span>
          </button>
        ) : (
          <span
            className={`flex items-center gap-1 px-1 py-0.5 min-w-0 ${
              isLast ? "font-medium text-neutral-900" : "text-neutral-500"
            }`}
          >
            {item.icon && <span className="text-xs shrink-0">{item.icon}</span>}
            <span className={`truncate ${isLast ? "max-w-[180px]" : "max-w-[120px]"}`}>
              {item.label}
            </span>
          </span>
        );

        return (
          <span key={item.id} className="flex items-center gap-0.5 min-w-0">
            {content}

            {showEllipsis && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-neutral-300" />
                <span className="px-1 text-neutral-400">…</span>
              </>
            )}

            {!isLast && (
              <ChevronRight className="h-3 w-3 shrink-0 text-neutral-300" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
