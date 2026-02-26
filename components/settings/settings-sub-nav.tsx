"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Key, Webhook } from "lucide-react";

const settingsSubPages = [
  { href: "/settings/agents", label: "Agents", icon: Bot },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/webhooks", label: "Webhooks", icon: Webhook },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-1 px-6">
        <Link
          href="/settings"
          className="mr-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ArrowLeft className="h-3 w-3" />
          All Settings
        </Link>
        <div className="h-4 w-px bg-neutral-200" />
        {settingsSubPages.map((page) => {
          const isActive = pathname === page.href;
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-purple-500 text-purple-700"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {page.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
