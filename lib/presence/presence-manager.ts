import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PresenceStatus = "online" | "away" | "offline";

export interface PresencePayload {
  user_id: string;
  status: PresenceStatus;
  user_type: "human" | "agent";
  timestamp: number;
}

export type PresenceListener = (payload: PresencePayload) => void;

const AWAY_DELAY_MS = 30_000;
const OFFLINE_DELAY_MS = 5 * 60_000;
const ACTIVITY_THROTTLE_MS = 15_000;

/**
 * Manages workspace-level presence tracking over a Supabase Realtime
 * broadcast channel.
 *
 * Lifecycle:
 *  1. connect()  — joins the workspace channel, marks user online,
 *                  broadcasts `user:online`.
 *  2. activity() — called on user interactions (typing, clicking, scrolling).
 *                  Throttled to avoid flooding.
 *  3. disconnect() — starts the graceful degradation timers:
 *                    30 s → away, 5 min → offline.
 *  4. destroy()  — tears everything down.
 */
export class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<PresenceListener>();
  private awayTimer: ReturnType<typeof setTimeout> | null = null;
  private offlineTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityPing = 0;
  private sessionId: string;
  private destroyed = false;

  constructor(
    private userId: string,
    private schoolId: string,
  ) {
    this.sessionId = crypto.randomUUID();
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  async connect() {
    if (this.destroyed) return;
    this.clearTimers();

    const channelName = `presence:${this.schoolId}`;
    this.channel = getSupabase().channel(channelName, {
      config: { broadcast: { self: true } },
    });

    this.channel
      .on("broadcast", { event: "presence:change" }, ({ payload }) => {
        this.notifyListeners(payload as PresencePayload);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.setStatus("online");
        }
      });
  }

  /**
   * Call on user activity (typing, mouse movement, focus, etc.).
   * Throttled to one API call per ACTIVITY_THROTTLE_MS.
   */
  async activity() {
    if (this.destroyed) return;

    this.clearTimers();

    const now = Date.now();
    if (now - this.lastActivityPing < ACTIVITY_THROTTLE_MS) return;
    this.lastActivityPing = now;

    await this.updatePresenceApi("online");
  }

  /**
   * Called when the user's connection drops (e.g. page hidden, tab
   * closed, network lost). Starts the graceful degradation timers.
   */
  scheduleDisconnect() {
    if (this.destroyed) return;
    this.clearTimers();

    this.awayTimer = setTimeout(async () => {
      await this.setStatus("away");

      this.offlineTimer = setTimeout(async () => {
        await this.setStatus("offline");
      }, OFFLINE_DELAY_MS - AWAY_DELAY_MS);
    }, AWAY_DELAY_MS);
  }

  /**
   * Reconnect after a prior scheduleDisconnect (e.g. tab re-focused).
   */
  async reconnect() {
    if (this.destroyed) return;
    this.clearTimers();
    await this.setStatus("online");
  }

  onPresenceChange(listener: PresenceListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  async destroy() {
    this.destroyed = true;
    this.clearTimers();

    await this.updatePresenceApi("offline", null);
    this.broadcast("offline");

    this.channel?.unsubscribe();
    this.channel = null;
    this.listeners.clear();
  }

  /* ------------------------------------------------------------------ */
  /* Internal                                                            */
  /* ------------------------------------------------------------------ */

  private async setStatus(status: PresenceStatus) {
    if (this.destroyed && status !== "offline") return;

    const wsSession = status === "offline" ? null : this.sessionId;
    await this.updatePresenceApi(status, wsSession);
    this.broadcast(status);
  }

  private broadcast(status: PresenceStatus) {
    const payload: PresencePayload = {
      user_id: this.userId,
      status,
      user_type: "human",
      timestamp: Date.now(),
    };

    this.channel?.send({
      type: "broadcast",
      event: "presence:change",
      payload,
    });
  }

  private async updatePresenceApi(
    status: PresenceStatus,
    wsSession: string | null | undefined = this.sessionId,
  ) {
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presence_status: status,
          websocket_session_id: wsSession,
        }),
      });
    } catch (err) {
      console.warn("[PresenceManager] Failed to update presence API:", err);
    }
  }

  private notifyListeners(payload: PresencePayload) {
    for (const fn of this.listeners) {
      try {
        fn(payload);
      } catch (err) {
        console.error("[PresenceManager] listener error:", err);
      }
    }
  }

  private clearTimers() {
    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
      this.awayTimer = null;
    }
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = null;
    }
  }
}
