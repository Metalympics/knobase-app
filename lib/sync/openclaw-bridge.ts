export type OpenClawConnectionStatus = "connected" | "connecting" | "disconnected";

export interface OpenClawMessage {
  type: "command" | "context_update" | "sync_request" | "ping" | "awareness";
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface OpenClawCommand {
  action: string;
  params: Record<string, unknown>;
}

export interface OpenClawAwarenessPayload {
  agentId: string;
  name: string;
  avatar: string;
  color: string;
  cursor?: { anchor: number; head: number };
  viewport?: { from: number; to: number };
  status: "idle" | "reading" | "editing" | "responding" | "thinking";
}

type StatusListener = (status: OpenClawConnectionStatus) => void;
type CommandListener = (command: OpenClawCommand) => void;
type AwarenessListener = (payload: OpenClawAwarenessPayload) => void;

class OpenClawBridge {
  private eventSource: EventSource | null = null;
  private status: OpenClawConnectionStatus = "disconnected";
  private endpoint: string = "";
  private apiKey: string = "";
  private statusListeners = new Set<StatusListener>();
  private commandListeners = new Set<CommandListener>();
  private awarenessListeners = new Set<AwarenessListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  get connectionStatus(): OpenClawConnectionStatus {
    return this.status;
  }

  get isConnected(): boolean {
    return this.status === "connected";
  }

  configure(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  connect() {
    if (!this.endpoint) {
      console.warn("[OpenClawBridge] No endpoint configured");
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.setStatus("connecting");

    try {
      const url = new URL(this.endpoint);
      if (this.apiKey) {
        url.searchParams.set("token", this.apiKey);
      }

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("connected");
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as OpenClawMessage;
          this.handleMessage(data);
        } catch {
          // ignore malformed messages
        }
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
        this.setStatus("disconnected");
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.eventSource?.close();
    this.eventSource = null;
    this.setStatus("disconnected");
  }

  async sendDocumentUpdate(documentId: string, title: string, content: string) {
    if (!this.endpoint) return;

    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `sync-${Date.now()}`,
          method: "tools/call",
          params: {
            name: "write_document",
            arguments: { id: documentId, title, content },
          },
        }),
      });
    } catch {
      // silent fail for push updates
    }
  }

  async sendContextSync(context: Record<string, unknown>) {
    if (!this.endpoint) return;

    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `ctx-${Date.now()}`,
          method: "resources/read",
          params: { uri: "workspace://info", context },
        }),
      });
    } catch {
      // silent fail
    }
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  onAwareness(listener: AwarenessListener): () => void {
    this.awarenessListeners.add(listener);
    return () => this.awarenessListeners.delete(listener);
  }

  private setStatus(status: OpenClawConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  private handleMessage(msg: OpenClawMessage) {
    if (msg.type === "command") {
      const cmd = msg.payload as unknown as OpenClawCommand;
      this.commandListeners.forEach((fn) => fn(cmd));
    } else if (msg.type === "awareness") {
      const payload = msg.payload as unknown as OpenClawAwarenessPayload;
      this.awarenessListeners.forEach((fn) => fn(payload));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const openClawBridge = new OpenClawBridge();
