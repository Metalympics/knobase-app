"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  PresenceManager,
  type PresencePayload,
  type PresenceStatus,
} from "./presence-manager";

interface UsePresenceOptions {
  userId: string | undefined;
  schoolId: string | undefined;
}

interface WorkspaceMemberPresence {
  user_id: string;
  status: PresenceStatus;
  updatedAt: number;
}

/**
 * React hook that wires a PresenceManager into the component lifecycle.
 *
 * - Connects on mount, disconnects on unmount.
 * - Listens for visibilitychange / focus / blur to manage away/reconnect.
 * - Tracks mouse and keyboard activity to keep the user marked "online".
 * - Returns a map of workspace member presence for rendering indicators.
 */
export function usePresence({ userId, schoolId }: UsePresenceOptions) {
  const managerRef = useRef<PresenceManager | null>(null);
  const [members, setMembers] = useState<Map<string, WorkspaceMemberPresence>>(
    new Map(),
  );

  const handlePresenceChange = useCallback((payload: PresencePayload) => {
    setMembers((prev) => {
      const next = new Map(prev);
      next.set(payload.user_id, {
        user_id: payload.user_id,
        status: payload.status,
        updatedAt: payload.timestamp,
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!userId || !schoolId) return;

    const manager = new PresenceManager(userId, schoolId);
    managerRef.current = manager;

    manager.onPresenceChange(handlePresenceChange);
    manager.connect();

    /* ------ visibility / focus handlers ------ */
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        manager.scheduleDisconnect();
      } else {
        manager.reconnect();
      }
    }

    function onFocus() {
      manager.reconnect();
    }

    function onBlur() {
      manager.scheduleDisconnect();
    }

    /* ------ user-activity listeners (throttled inside manager) ------ */
    function onActivity() {
      manager.activity();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });

    /* ------ beforeunload: best-effort offline signal ------ */
    function onBeforeUnload() {
      manager.destroy();
    }
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("beforeunload", onBeforeUnload);
      manager.destroy();
      managerRef.current = null;
    };
  }, [userId, schoolId, handlePresenceChange]);

  /** Imperative access for other systems (e.g. editor activity pings). */
  const signalActivity = useCallback(() => {
    managerRef.current?.activity();
  }, []);

  return { members, signalActivity };
}
