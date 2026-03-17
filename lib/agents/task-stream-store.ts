/**
 * Reactive per-task store for live SSE streaming state.
 *
 * The AgentStreamHandler writes events here as they arrive from the server.
 * React components (InlineAgentNodeView) subscribe by taskId and re-render
 * on every update so the user sees text/thinking/tools in real time.
 */

export type StreamPhase =
  | "idle"
  | "connecting"
  | "thinking"
  | "responding"
  | "tool"
  | "complete"
  | "error";

export interface ActiveToolCall {
  name: string;
  params?: unknown;
  startedAt: number;
}

export interface TaskStreamState {
  phase: StreamPhase;
  /** Accumulated assistant text (grows with each delta) */
  text: string;
  /** Accumulated reasoning / thinking text */
  thinking: string;
  /** Currently active tool call (null when not in a tool phase) */
  activeTool: ActiveToolCall | null;
  /** History of completed tool calls in this run */
  toolHistory: { name: string; durationMs: number }[];
  /** Last error message */
  error: string | null;
  /** Monotonically increasing counter — triggers React re-renders */
  version: number;
}

function createInitialState(): TaskStreamState {
  return {
    phase: "idle",
    text: "",
    thinking: "",
    activeTool: null,
    toolHistory: [],
    error: null,
    version: 0,
  };
}

type Listener = (state: TaskStreamState) => void;

const states = new Map<string, TaskStreamState>();
const listeners = new Map<string, Set<Listener>>();

function getOrCreate(taskId: string): TaskStreamState {
  let s = states.get(taskId);
  if (!s) {
    s = createInitialState();
    states.set(taskId, s);
  }
  return s;
}

function notify(taskId: string) {
  const s = states.get(taskId);
  if (!s) return;
  const set = listeners.get(taskId);
  if (!set) return;
  for (const fn of set) {
    try { fn(s); } catch { /* subscriber error — ignore */ }
  }
}

/* ── Public write API (called by stream-handler.ts) ─────────────── */

export function streamSetPhase(taskId: string, phase: StreamPhase) {
  const s = getOrCreate(taskId);
  s.phase = phase;
  s.version++;
  notify(taskId);
}

export function streamAppendText(taskId: string, delta: string) {
  const s = getOrCreate(taskId);
  s.text += delta;
  if (s.phase !== "responding") s.phase = "responding";
  s.version++;
  notify(taskId);
}

export function streamAppendThinking(taskId: string, content: string) {
  const s = getOrCreate(taskId);
  s.thinking += content;
  if (s.phase !== "thinking") s.phase = "thinking";
  s.version++;
  notify(taskId);
}

/** Replace (not append) the full thinking buffer — for "replace-in-place" reasoning */
export function streamReplaceThinking(taskId: string, full: string) {
  const s = getOrCreate(taskId);
  s.thinking = full;
  if (s.phase !== "thinking") s.phase = "thinking";
  s.version++;
  notify(taskId);
}

export function streamToolStart(taskId: string, name: string, params?: unknown) {
  const s = getOrCreate(taskId);
  s.activeTool = { name, params, startedAt: Date.now() };
  s.phase = "tool";
  s.version++;
  notify(taskId);
}

export function streamToolEnd(taskId: string, name: string) {
  const s = getOrCreate(taskId);
  if (s.activeTool) {
    s.toolHistory.push({
      name: s.activeTool.name,
      durationMs: Date.now() - s.activeTool.startedAt,
    });
  }
  s.activeTool = null;
  s.phase = "responding";
  s.version++;
  notify(taskId);
}

export function streamComplete(taskId: string, finalText?: string) {
  const s = getOrCreate(taskId);
  if (finalText !== undefined) s.text = finalText;
  s.phase = "complete";
  s.activeTool = null;
  s.version++;
  notify(taskId);
}

export function streamError(taskId: string, message: string) {
  const s = getOrCreate(taskId);
  s.error = message;
  s.phase = "error";
  s.version++;
  notify(taskId);
}

export function streamCleanup(taskId: string) {
  states.delete(taskId);
  listeners.delete(taskId);
}

/* ── Public read / subscribe API (called by React components) ───── */

export function getTaskStreamState(taskId: string): TaskStreamState {
  return states.get(taskId) ?? createInitialState();
}

export function subscribeTaskStream(
  taskId: string,
  listener: Listener,
): () => void {
  let set = listeners.get(taskId);
  if (!set) {
    set = new Set();
    listeners.set(taskId, set);
  }
  set.add(listener);

  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(taskId);
  };
}
