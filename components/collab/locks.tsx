"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, AlertTriangle } from "lucide-react";

export interface DocumentLock {
  documentId: string;
  userId: string;
  userName: string;
  lockedAt: string;
  expiresAt: string;
}

const LS_KEY = "knobase-app:doc-locks";

function readLocks(): DocumentLock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const locks: DocumentLock[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return locks.filter((l) => new Date(l.expiresAt).getTime() > now);
  } catch {
    return [];
  }
}

function writeLocks(locks: DocumentLock[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(locks));
}

export function acquireLock(
  documentId: string,
  userId: string,
  userName: string,
  durationMinutes = 30
): DocumentLock | null {
  const locks = readLocks();
  const existing = locks.find((l) => l.documentId === documentId);
  if (existing && existing.userId !== userId) return null;
  if (existing && existing.userId === userId) {
    existing.expiresAt = new Date(
      Date.now() + durationMinutes * 60 * 1000
    ).toISOString();
    writeLocks(locks);
    return existing;
  }

  const lock: DocumentLock = {
    documentId,
    userId,
    userName,
    lockedAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + durationMinutes * 60 * 1000
    ).toISOString(),
  };
  locks.push(lock);
  writeLocks(locks);
  return lock;
}

export function releaseLock(documentId: string, userId: string): boolean {
  const locks = readLocks();
  const filtered = locks.filter(
    (l) => !(l.documentId === documentId && l.userId === userId)
  );
  if (filtered.length === locks.length) return false;
  writeLocks(filtered);
  return true;
}

export function getLock(documentId: string): DocumentLock | null {
  return readLocks().find((l) => l.documentId === documentId) ?? null;
}

export function isLockedByOther(
  documentId: string,
  userId: string
): boolean {
  const lock = getLock(documentId);
  return !!lock && lock.userId !== userId;
}

// UI Component

interface DocumentLockIndicatorProps {
  documentId: string;
  currentUserId: string;
  currentUserName: string;
  onLockChange?: (locked: boolean) => void;
}

export function DocumentLockIndicator({
  documentId,
  currentUserId,
  currentUserName,
  onLockChange,
}: DocumentLockIndicatorProps) {
  const [lock, setLock] = useState<DocumentLock | null>(() =>
    getLock(documentId)
  );
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLock(getLock(documentId));
    }, 5000);
    return () => clearInterval(interval);
  }, [documentId]);

  const isLocked = !!lock;
  const isOwnLock = lock?.userId === currentUserId;
  const isOtherLock = isLocked && !isOwnLock;

  const handleToggleLock = useCallback(() => {
    if (isOtherLock) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    if (isOwnLock) {
      releaseLock(documentId, currentUserId);
      setLock(null);
      onLockChange?.(false);
    } else {
      const newLock = acquireLock(documentId, currentUserId, currentUserName);
      setLock(newLock);
      onLockChange?.(true);
    }
  }, [
    documentId,
    currentUserId,
    currentUserName,
    isOwnLock,
    isOtherLock,
    onLockChange,
  ]);

  const handleRequestAccess = useCallback(() => {
    setShowWarning(false);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={handleToggleLock}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
          isOtherLock
            ? "bg-red-50 text-red-500"
            : isOwnLock
              ? "bg-amber-50 text-amber-600"
              : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        }`}
        title={
          isOtherLock
            ? `Locked by ${lock.userName}`
            : isOwnLock
              ? "Click to unlock"
              : "Click to lock"
        }
        aria-label={isLocked ? "Locked" : "Unlocked"}
      >
        {isLocked ? (
          <Lock className="h-3 w-3" />
        ) : (
          <Unlock className="h-3 w-3" />
        )}
        {isOtherLock && (
          <span className="max-w-[80px] truncate">{lock.userName}</span>
        )}
        {isOwnLock && <span>Locked</span>}
      </button>

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-neutral-800">
                  Document is locked
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {lock?.userName} is currently editing this document.
                </p>
                <button
                  onClick={handleRequestAccess}
                  className="mt-2 rounded-md bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-neutral-800"
                >
                  Request Access
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Who's editing indicator
interface EditingIndicatorProps {
  editors: { userId: string; userName: string; blockId?: string }[];
  currentUserId: string;
}

export function EditingIndicator({
  editors,
  currentUserId,
}: EditingIndicatorProps) {
  const others = editors.filter((e) => e.userId !== currentUserId);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {others.slice(0, 3).map((editor) => (
          <div
            key={editor.userId}
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[8px] font-bold text-neutral-600"
            title={`${editor.userName} is editing`}
          >
            {editor.userName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-neutral-400">
        {others.length === 1
          ? `${others[0].userName} is editing`
          : `${others.length} editing`}
      </span>
    </div>
  );
}
