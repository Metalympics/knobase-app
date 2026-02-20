"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, LogIn, X } from "lucide-react";
import {
  isGuestMode,
  getGuestTimeRemaining,
  endGuestSession,
} from "@/lib/guest/tokens";

interface GuestBannerProps {
  onRequestAccess?: () => void;
  onLeave?: () => void;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function GuestBanner({ onRequestAccess, onLeave }: GuestBannerProps) {
  const [visible, setVisible] = useState(() => isGuestMode());
  const [timeRemaining, setTimeRemaining] = useState(() => getGuestTimeRemaining());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const remaining = getGuestTimeRemaining();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        endGuestSession();
        setVisible(false);
        onLeave?.();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [visible, onLeave]);

  const handleEndSession = useCallback(() => {
    endGuestSession();
    setVisible(false);
    onLeave?.();
  }, [onLeave]);

  if (!visible || dismissed) return null;

  const isExpiring = timeRemaining < 30 * 60 * 1000; // less than 30 min

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className={`flex items-center gap-3 border-b px-4 py-2 ${
          isExpiring
            ? "border-amber-200 bg-amber-50"
            : "border-purple-200 bg-purple-50"
        }`}
        role="alert"
      >
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            isExpiring
              ? "bg-amber-100 text-amber-600"
              : "bg-purple-100 text-purple-600"
          }`}
        >
          <Eye className="h-3 w-3" />
        </div>

        <div className="flex-1">
          <p
            className={`text-xs font-medium ${
              isExpiring ? "text-amber-700" : "text-purple-700"
            }`}
          >
            Guest Access
          </p>
          <div className="flex items-center gap-2">
            <Clock className="h-2.5 w-2.5 text-neutral-400" />
            <span
              className={`text-[11px] ${
                isExpiring ? "text-amber-600 font-medium" : "text-purple-500"
              }`}
            >
              {formatDuration(timeRemaining)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRequestAccess && (
            <button
              onClick={onRequestAccess}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isExpiring
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              <LogIn className="h-3 w-3" />
              Request Full Access
            </button>
          )}
          <button
            onClick={handleEndSession}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isExpiring
                ? "text-amber-600 hover:bg-amber-100"
                : "text-purple-600 hover:bg-purple-100"
            }`}
          >
            Leave
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Dismiss banner"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
