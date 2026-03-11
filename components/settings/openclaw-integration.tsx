"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Webhook,
  Globe,
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  listWebhooks,
  createWebhook,
  getDeliveries,
  type Webhook as WebhookType,
  type WebhookEvent,
  type WebhookDelivery,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks/store";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

/* ------------------------------------------------------------------ */
/* WebhookConfigCard                                                    */
/* ------------------------------------------------------------------ */

interface WebhookConfigCardProps {
  webhook: WebhookType;
  onRefresh?: () => void;
}

export function WebhookConfigCard({ webhook, onRefresh }: WebhookConfigCardProps) {
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);

  const copyToClipboard = useCallback(async (text: string, field: "url" | "secret") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const maskedSecret = webhook.secret
    ? webhook.secret.slice(0, 10) + "•".repeat(Math.max(0, webhook.secret.length - 14)) + webhook.secret.slice(-4)
    : "—";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <Webhook className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-medium text-neutral-800">Webhook Configuration</h3>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            webhook.active
              ? "bg-emerald-50 text-emerald-600"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              webhook.active ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
          {webhook.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Endpoint URL
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-neutral-50 px-3 py-1.5 text-xs font-mono text-neutral-700">
              {webhook.url}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(webhook.url, "url")}
            >
              {copied === "url" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Signing Secret
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-neutral-50 px-3 py-1.5 text-xs font-mono text-neutral-700">
              {secretVisible ? webhook.secret : maskedSecret}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSecretVisible((v) => !v)}
            >
              {secretVisible ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(webhook.secret, "secret")}
            >
              {copied === "secret" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Subscribed Events
          </label>
          <div className="mt-1 flex flex-wrap gap-1">
            {webhook.events.map((evt) => (
              <span
                key={evt}
                className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600 font-mono"
              >
                {evt}
              </span>
            ))}
          </div>
        </div>

        {webhook.lastTriggeredAt && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            Last triggered {new Date(webhook.lastTriggeredAt).toLocaleString()}
          </div>
        )}

        {webhook.failureCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {webhook.failureCount} consecutive failure{webhook.failureCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {onRefresh && (
        <div className="border-t border-neutral-100 px-4 py-2">
          <Button variant="ghost" size="xs" onClick={onRefresh} className="text-xs">
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WebhookRegistrationForm                                              */
/* ------------------------------------------------------------------ */

interface WebhookRegistrationFormProps {
  onCreated?: (webhook: WebhookType) => void;
}

export function WebhookRegistrationForm({ onCreated }: WebhookRegistrationFormProps) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleEvent = useCallback((event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!url || selectedEvents.length === 0) return;
    setSubmitting(true);

    try {
      const webhook = createWebhook({ url, events: selectedEvents });
      setUrl("");
      setSelectedEvents([]);
      onCreated?.(webhook);
    } finally {
      setSubmitting(false);
    }
  }, [url, selectedEvents, onCreated]);

  const isValidUrl = url.length === 0 || /^https?:\/\/.+/.test(url);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <Globe className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-medium text-neutral-800">Register Webhook</h3>
      </div>

      <div className="space-y-4 px-4 py-3">
        <div>
          <label className="text-sm font-medium text-neutral-700">Payload URL</label>
          <Input
            placeholder="https://your-server.com/api/webhooks/knobase"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1"
          />
          {!isValidUrl && (
            <p className="mt-1 text-xs text-red-500">URL must start with http:// or https://</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Event Types</label>
          <p className="text-xs text-neutral-400 mt-0.5">
            Select which events will trigger this webhook
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <label
                key={evt.value}
                className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  selectedEvents.includes(evt.value)
                    ? "border-purple-300 bg-purple-50/50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(evt.value)}
                  onChange={() => toggleEvent(evt.value)}
                  className="mt-0.5 accent-purple-500"
                />
                <div>
                  <span className="text-xs font-medium text-neutral-800">{evt.label}</span>
                  <p className="text-[11px] text-neutral-400">{evt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!url || !isValidUrl || selectedEvents.length === 0 || submitting}
          className="w-full bg-purple-500 hover:bg-purple-600"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {submitting ? "Registering..." : "Register Webhook"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ConnectionStatus                                                     */
/* ------------------------------------------------------------------ */

interface ConnectionStatusProps {
  webhook: WebhookType;
}

export function ConnectionStatus({ webhook }: ConnectionStatusProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "reachable" | "unreachable">("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setLatency(null);

    const start = performance.now();

    try {
      const result = await dispatchWebhook(webhook.url, webhook.secret, {
        event: "ping",
        timestamp: new Date().toISOString(),
      });

      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);

      if (result.success) {
        setStatus("reachable");
      } else {
        setStatus("unreachable");
        setError(result.error ?? "Connection failed");
      }
    } catch {
      setStatus("unreachable");
      setError("Network error");
    }
  }, [webhook.url, webhook.secret]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <Shield className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-medium text-neutral-800">Connection Status</h3>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          {status === "idle" && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                <Globe className="h-4 w-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Not checked</p>
                <p className="text-xs text-neutral-400">Click below to test the connection</p>
              </div>
            </>
          )}

          {status === "checking" && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Checking...</p>
                <p className="text-xs text-neutral-400">Sending ping to {webhook.url}</p>
              </div>
            </>
          )}

          {status === "reachable" && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Reachable</p>
                <p className="text-xs text-neutral-400">
                  Endpoint responded successfully
                  {latency !== null && <> in {latency}ms</>}
                </p>
              </div>
            </>
          )}

          {status === "unreachable" && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Unreachable</p>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={status === "checking" || !webhook.active}
          className="w-full"
        >
          {status === "checking" ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          {status === "checking" ? "Checking..." : "Test Connection"}
        </Button>

        {!webhook.active && (
          <p className="text-center text-xs text-neutral-400">
            Enable the webhook to test the connection
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WebhookEventsList                                                    */
/* ------------------------------------------------------------------ */

interface WebhookEventsListProps {
  webhookId: string;
  maxItems?: number;
}

export function WebhookEventsList({ webhookId, maxItems = 25 }: WebhookEventsListProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const items = getDeliveries(webhookId);
    setDeliveries(items.slice(0, maxItems));
    setLoading(false);
  }, [webhookId, maxItems]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const successCount = deliveries.filter((d) => d.success).length;
  const failCount = deliveries.filter((d) => !d.success).length;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <Clock className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-medium text-neutral-800">Recent Deliveries</h3>
        <div className="ml-auto flex items-center gap-2">
          {deliveries.length > 0 && (
            <>
              <span className="text-[10px] text-emerald-600 font-medium">
                {successCount} ok
              </span>
              {failCount > 0 && (
                <span className="text-[10px] text-red-500 font-medium">
                  {failCount} failed
                </span>
              )}
            </>
          )}
          <Button variant="ghost" size="icon-xs" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && deliveries.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="py-8 text-center">
          <Send className="mx-auto h-5 w-5 text-neutral-300" />
          <p className="mt-2 text-xs text-neutral-400">No deliveries yet</p>
          <p className="text-[11px] text-neutral-300">
            Deliveries will appear here when events are triggered
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-neutral-50 transition-colors"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  delivery.success
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {delivery.success ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
              </span>

              <span className="font-mono font-medium text-neutral-700">
                {delivery.event}
              </span>

              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  delivery.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {delivery.statusCode ?? "ERR"}
              </span>

              {delivery.attemptCount > 1 && (
                <span className="text-[10px] text-amber-500">
                  {delivery.attemptCount} attempts
                </span>
              )}

              <span className="ml-auto text-neutral-400 whitespace-nowrap">
                {new Date(delivery.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
