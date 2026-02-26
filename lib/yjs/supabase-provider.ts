import * as Y from "yjs";
import { Observable } from "lib0/observable";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface SupabaseProviderConfig {
  document: Y.Doc;
  documentId: string;
  user: { id: string; name: string; color: string };
}

/**
 * Y.js provider that syncs document updates and awareness (cursors)
 * over Supabase Realtime broadcast channels.
 *
 * Protocol:
 *  - "yjs-update": base64-encoded Y.Doc update
 *  - "yjs-awareness": base64-encoded awareness update
 *  - "yjs-sync-request": new peer requests full document state
 *  - "yjs-sync-response": full document state sent back
 */
export class SupabaseProvider extends Observable<string> {
  doc: Y.Doc;
  awareness: Awareness;
  documentId: string;
  status: ConnectionStatus = "connecting";

  private channel: RealtimeChannel | null = null;
  private user: { id: string; name: string; color: string };
  private isSynced = false;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SupabaseProviderConfig) {
    super();
    this.doc = config.document;
    this.documentId = config.documentId;
    this.user = config.user;

    this.awareness = new Awareness(this.doc);
    this.awareness.setLocalStateField("user", this.user);

    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);

    this.connect();
  }

  private connect() {
    this.setStatus("connecting");
    const channelName = `doc:${this.documentId}`;

    this.channel = getSupabase().channel(channelName, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.doc, update, "remote");
      })
      .on("broadcast", { event: "yjs-awareness" }, ({ payload }) => {
        const update = base64ToUint8(payload.update);
        applyAwarenessUpdate(this.awareness, update, "remote");
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        const state = Y.encodeStateAsUpdate(this.doc);
        this.channel?.send({
          type: "broadcast",
          event: "yjs-sync-response",
          payload: { update: uint8ToBase64(state) },
        });
      })
      .on("broadcast", { event: "yjs-sync-response" }, ({ payload }) => {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.doc, update, "remote");
        this.markSynced();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.setStatus("connected");
          this.requestSync();
        }
      });
  }

  private requestSync() {
    this.channel?.send({
      type: "broadcast",
      event: "yjs-sync-request",
      payload: {},
    });

    // If no sync response arrives within 2s, we're the first peer
    this.syncTimeout = setTimeout(() => {
      if (!this.isSynced) this.markSynced();
    }, 2000);
  }

  private markSynced() {
    if (this.isSynced) return;
    this.isSynced = true;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.emit("synced", [true]);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    this.channel?.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: uint8ToBase64(update) },
    });
  };

  private onAwarenessUpdate = ({ added, updated, removed }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changed = added.concat(updated, removed);
    const update = encodeAwarenessUpdate(this.awareness, changed);
    this.channel?.send({
      type: "broadcast",
      event: "yjs-awareness",
      payload: { update: uint8ToBase64(update) },
    });
  };

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.emit("status", [{ status }]);
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  /**
   * Set agent awareness state. Used to proxy an agent's cursor position
   * into the collaboration channel from the client that initiated the
   * agent action.
   */
  setAgentState(agentState: {
    id: string;
    name: string;
    avatar: string;
    color: string;
    cursor?: { anchor: number; head: number };
    status: "idle" | "reading" | "editing" | "responding" | "thinking";
  }) {
    const existing = this.awareness.getLocalState()?.agents as
      | Record<string, unknown>
      | undefined;
    this.awareness.setLocalStateField("agents", {
      ...(existing ?? {}),
      [agentState.id]: { ...agentState, lastActive: Date.now() },
    });
  }

  /**
   * Remove an agent from the local awareness state.
   */
  removeAgentState(agentId: string) {
    const existing = this.awareness.getLocalState()?.agents as
      | Record<string, unknown>
      | undefined;
    if (!existing) return;
    const { [agentId]: _, ...rest } = existing;
    this.awareness.setLocalStateField("agents", rest);
  }

  disconnect() {
    this.setStatus("disconnected");
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.isSynced = false;
    this.channel?.unsubscribe();
    this.channel = null;
  }

  destroy() {
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
    this.disconnect();
    super.destroy();
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
