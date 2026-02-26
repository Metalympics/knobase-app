"use client";

// ── Exit Intent Detection Hook ──
// Detects when the user is about to leave the page (mouse exits viewport top).
// Fires the callback only once per mount to avoid spamming the signup modal.

import { useEffect, useRef } from "react";

export function useExitIntent(
  onExitIntent: () => void,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when the mouse leaves toward the top of the viewport
      // (typical "closing tab" or "back button" gesture)
      if (e.clientY < 20 && !firedRef.current) {
        firedRef.current = true;
        onExitIntent();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [onExitIntent, enabled]);

  /** Reset so the intent can fire again (e.g. after dismissing a modal). */
  function reset() {
    firedRef.current = false;
  }

  return { reset };
}
