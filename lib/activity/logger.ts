import { addNotification, type NotificationType } from "@/lib/notifications/store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgentEventType =
  | "agent-joined"
  | "agent-left"
  | "agent-edit"
  | "agent-suggestion"
  | "agent-comment"
  | "agent-error"
  | "agent-task-complete"
  | "agent-mention-response";

export interface AgentActivityEntry {
  id: string;
  agentId: string;
  agentName: string;
  eventType: AgentEventType;
  message: string;
  documentId?: string;
  documentTitle?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const LS_KEY = "knobase-app:agent-activity";
const MAX_ENTRIES = 200;

function readEntries(): AgentActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: AgentActivityEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

/* ------------------------------------------------------------------ */
/* Event-to-Notification mapping                                       */
/* ------------------------------------------------------------------ */

const EVENT_TO_NOTIFICATION: Record<AgentEventType, NotificationType | null> = {
  "agent-joined": null, // silent
  "agent-left": null, // silent
  "agent-edit": "doc-edit",
  "agent-suggestion": "agent-suggestion",
  "agent-comment": "comment",
  "agent-error": null, // logged but no notification
  "agent-task-complete": "agent-suggestion",
  "agent-mention-response": "agent-suggestion",
};

/* ------------------------------------------------------------------ */
/* Logger class                                                        */
/* ------------------------------------------------------------------ */

type ActivityListener = (entry: AgentActivityEntry) => void;

class AgentActivityLogger {
  private listeners = new Set<ActivityListener>();

  /** Log an agent event. Optionally creates a notification. */
  log(
    agentId: string,
    agentName: string,
    eventType: AgentEventType,
    message: string,
    options?: {
      documentId?: string;
      documentTitle?: string;
      metadata?: Record<string, unknown>;
      silent?: boolean;
    },
  ): AgentActivityEntry {
    const entry: AgentActivityEntry = {
      id: crypto.randomUUID(),
      agentId,
      agentName,
      eventType,
      message,
      documentId: options?.documentId,
      documentTitle: options?.documentTitle,
      metadata: options?.metadata,
      timestamp: new Date().toISOString(),
    };

    // Persist
    const entries = readEntries();
    entries.unshift(entry);
    writeEntries(entries);

    // Dispatch to listeners
    this.listeners.forEach((fn) => fn(entry));

    // Create notification (unless silent)
    if (!options?.silent) {
      const notifType = EVENT_TO_NOTIFICATION[eventType];
      if (notifType) {
        addNotification({
          type: notifType,
          message: `${agentName}: ${message}`,
          actorName: agentName,
          documentId: options?.documentId,
          link: options?.documentId
            ? `/knowledge?doc=${options.documentId}`
            : undefined,
        });
      }
    }

    return entry;
  }

  /** Convenience: log agent joining a document */
  logJoin(agentId: string, agentName: string, documentId: string, documentTitle?: string) {
    return this.log(agentId, agentName, "agent-joined", `joined "${documentTitle ?? documentId}"`, {
      documentId,
      documentTitle,
      silent: true,
    });
  }

  /** Convenience: log agent leaving a document */
  logLeave(agentId: string, agentName: string, documentId: string) {
    return this.log(agentId, agentName, "agent-left", "left the document", {
      documentId,
      silent: true,
    });
  }

  /** Convenience: log agent making an edit */
  logEdit(
    agentId: string,
    agentName: string,
    documentId: string,
    description: string,
  ) {
    return this.log(agentId, agentName, "agent-edit", description, {
      documentId,
    });
  }

  /** Convenience: log agent making a suggestion */
  logSuggestion(
    agentId: string,
    agentName: string,
    documentId: string,
    suggestion: string,
  ) {
    return this.log(agentId, agentName, "agent-suggestion", suggestion, {
      documentId,
    });
  }

  /** Convenience: log agent error */
  logError(agentId: string, agentName: string, error: string) {
    return this.log(agentId, agentName, "agent-error", error, { silent: true });
  }

  /** Convenience: log task completion */
  logTaskComplete(
    agentId: string,
    agentName: string,
    documentId: string,
    taskDescription: string,
  ) {
    return this.log(agentId, agentName, "agent-task-complete", taskDescription, {
      documentId,
    });
  }

  /** Get all activity entries, most recent first */
  getAll(): AgentActivityEntry[] {
    return readEntries();
  }

  /** Get entries for a specific agent */
  getByAgent(agentId: string): AgentActivityEntry[] {
    return readEntries().filter((e) => e.agentId === agentId);
  }

  /** Get entries for a specific document */
  getByDocument(documentId: string): AgentActivityEntry[] {
    return readEntries().filter((e) => e.documentId === documentId);
  }

  /** Get entries within a time range */
  getRecent(withinMs: number = 24 * 60 * 60 * 1000): AgentActivityEntry[] {
    const cutoff = Date.now() - withinMs;
    return readEntries().filter(
      (e) => new Date(e.timestamp).getTime() > cutoff,
    );
  }

  /** Clear all activity entries */
  clear() {
    writeEntries([]);
  }

  /** Subscribe to new activity events */
  onActivity(listener: ActivityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Singleton instance */
export const agentActivity = new AgentActivityLogger();
