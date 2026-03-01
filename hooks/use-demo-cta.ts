"use client";

// ── Demo CTA Hook ──
// Tracks user engagement and triggers conversion modal when thresholds are hit.
// Triggers: time (2 min), edits (10+), mentions (2+), exit intent, manual.

import { useState, useCallback, useEffect, useRef } from "react";
import { useExitIntent } from "@/hooks/use-exit-intent";

export type DemoCTATrigger =
  | "time"
  | "edits"
  | "mentions"
  | "exit"
  | "save"
  | "share"
  | "manual";

interface DemoCTAConfig {
  /** Milliseconds of active time before auto-prompt */
  timeThreshold?: number;
  /** Number of edits before auto-prompt */
  editThreshold?: number;
  /** Number of @mentions before auto-prompt */
  mentionThreshold?: number;
}

const DEFAULTS: Required<DemoCTAConfig> = {
  timeThreshold: 120_000, // 2 minutes
  editThreshold: 10,
  mentionThreshold: 2,
};

export function useDemoCTA(config: DemoCTAConfig = {}) {
  const { timeThreshold, editThreshold, mentionThreshold } = {
    ...DEFAULTS,
    ...config,
  };

  const [showCTA, setShowCTA] = useState(false);
  const [trigger, setTrigger] = useState<DemoCTATrigger>("manual");
  const [exitEnabled, setExitEnabled] = useState(true);
  const hasTriggeredRef = useRef(false);
  const editCountRef = useRef(0);
  const mentionCountRef = useRef(0);

  const fire = useCallback((t: DemoCTATrigger) => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setTrigger(t);
    setShowCTA(true);
    setExitEnabled(false);
  }, []);

  // Time-based trigger
  useEffect(() => {
    const timer = setTimeout(() => fire("time"), timeThreshold);
    return () => clearTimeout(timer);
  }, [timeThreshold, fire]);

  // Exit intent trigger
  useExitIntent(() => fire("exit"), { enabled: exitEnabled });

  // Edit count trigger
  const trackEdit = useCallback(() => {
    editCountRef.current += 1;
    if (editCountRef.current >= editThreshold) {
      fire("edits");
    }
  }, [editThreshold, fire]);

  // Mention count trigger
  const trackMention = useCallback(() => {
    mentionCountRef.current += 1;
    if (mentionCountRef.current >= mentionThreshold) {
      fire("mentions");
    }
  }, [mentionThreshold, fire]);

  // Manual trigger
  const openCTA = useCallback(
    (t: DemoCTATrigger = "manual") => {
      setTrigger(t);
      setShowCTA(true);
    },
    []
  );

  const dismissCTA = useCallback(() => {
    setShowCTA(false);
    // Allow re-trigger after dismiss (reset the guard)
    hasTriggeredRef.current = false;
    setExitEnabled(true);
  }, []);

  return {
    showCTA,
    trigger,
    trackEdit,
    trackMention,
    openCTA,
    dismissCTA,
  };
}
