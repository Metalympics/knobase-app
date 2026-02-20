"use client";

import { useSyncExternalStore, useMemo, useEffect, useCallback } from "react";
import * as Y from "yjs";
import { SupabaseProvider, type ConnectionStatus } from "./supabase-provider";

const LS_PREFIX = "knobase-app:";

function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function generateUserId(): string {
  const stored = localStorage.getItem(`${LS_PREFIX}user-id`);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(`${LS_PREFIX}user-id`, id);
  return id;
}

function getUserName(): string {
  return localStorage.getItem(`${LS_PREFIX}workspace`) ?? "Anonymous";
}

export interface CollaborationState {
  provider: SupabaseProvider | null;
  ydoc: Y.Doc;
  status: ConnectionStatus;
  isSynced: boolean;
  user: { id: string; name: string; color: string };
}

interface CollabSnapshot {
  provider: SupabaseProvider | null;
  ydoc: Y.Doc;
  status: ConnectionStatus;
  isSynced: boolean;
}

class CollabStore {
  private snapshot: CollabSnapshot;
  private listeners = new Set<() => void>();

  constructor() {
    this.snapshot = {
      provider: null,
      ydoc: new Y.Doc(),
      status: "connecting",
      isSynced: false,
    };
  }

  getSnapshot = (): CollabSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private emit() {
    this.snapshot = { ...this.snapshot };
    this.listeners.forEach((l) => l());
  }

  connect(documentId: string, user: { id: string; name: string; color: string }) {
    this.cleanup();

    const ydoc = new Y.Doc();
    this.snapshot = { provider: null, ydoc, status: "connecting", isSynced: false };
    this.emit();

    try {
      const provider = new SupabaseProvider({ document: ydoc, documentId, user });

      provider.on("status", ({ status }: { status: ConnectionStatus }) => {
        this.snapshot = { ...this.snapshot, status };
        this.emit();
      });

      provider.on("synced", () => {
        this.snapshot = { ...this.snapshot, isSynced: true };
        this.emit();
      });

      this.snapshot = { ...this.snapshot, provider };
      this.emit();
    } catch {
      this.snapshot = { ...this.snapshot, provider: null, status: "disconnected", isSynced: true };
      this.emit();
    }
  }

  cleanup() {
    if (this.snapshot.provider) {
      this.snapshot.provider.destroy();
    }
    this.snapshot.ydoc.destroy();
  }
}

const storeCache = new Map<string, CollabStore>();

function getOrCreateStore(key: string): CollabStore {
  let store = storeCache.get(key);
  if (!store) {
    store = new CollabStore();
    storeCache.set(key, store);
  }
  return store;
}

export function useCollaboration(documentId: string): CollaborationState {
  const user = useMemo(() => {
    if (typeof window === "undefined") return { id: "", name: "Anonymous", color: "#888" };
    const id = generateUserId();
    return { id, name: getUserName(), color: hashToColor(id) };
  }, []);

  const store = useMemo(() => getOrCreateStore(documentId), [documentId]);

  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    store.connect(documentId, user);
    return () => {
      store.cleanup();
      storeCache.delete(documentId);
    };
  }, [documentId, user, store]);

  return {
    provider: snapshot.provider,
    ydoc: snapshot.ydoc,
    status: snapshot.status,
    isSynced: snapshot.isSynced,
    user,
  };
}
