"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
  type Webhook,
  type WebhookEvent,
  type WebhookDelivery,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks/store";
import { testWebhook } from "@/lib/webhooks/dispatcher";

export default function WebhooksSettings() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listWebhooks();
    setWebhooks(list);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newUrl || newEvents.length === 0) return;
    await createWebhook({ url: newUrl, events: newEvents });
    setNewUrl("");
    setNewEvents([]);
    setShowCreate(false);
    refresh();
  }

  async function handleToggle(id: string, active: boolean) {
    await updateWebhook(id, { active: !active });
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteWebhook(id);
    refresh();
  }

  function toggleEvent(event: WebhookEvent) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleShowLogs(webhookId: string) {
    if (expandedLogs === webhookId) {
      setExpandedLogs(null);
      return;
    }
    setDeliveries(getDeliveries(webhookId));
    setExpandedLogs(webhookId);
  }

  async function handleTest(webhook: Webhook) {
    setTesting(webhook.id);
    try {
      await testWebhook(webhook);
      setDeliveries(getDeliveries(webhook.id));
      setExpandedLogs(webhook.id);
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Get notified when events happen in your workspace
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ Add Webhook"}
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <div>
            <label className="text-sm font-medium">Payload URL</label>
            <Input
              placeholder="https://example.com/webhooks/knobase"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Events</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {WEBHOOK_EVENTS.map((evt) => (
                <label
                  key={evt.value}
                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    newEvents.includes(evt.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">{evt.label}</span>
                    <p className="text-xs text-muted-foreground">{evt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!newUrl || newEvents.length === 0}>
            Create Webhook
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.length === 0 && !showCreate && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No webhooks configured yet
          </p>
        )}

        {webhooks.map((wh) => (
          <div key={wh.id} className="rounded-lg border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${wh.active ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <span className="text-sm font-mono truncate">{wh.url}</span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {wh.events.map((evt) => (
                    <span
                      key={evt}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-mono"
                    >
                      {evt}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleTest(wh)}
                  disabled={testing === wh.id}
                >
                  {testing === wh.id ? "Sending..." : "Test"}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleShowLogs(wh.id)}
                >
                  Logs
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleToggle(wh.id, wh.active)}
                >
                  {wh.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-destructive"
                  onClick={() => handleDelete(wh.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {expandedLogs === wh.id && (
              <div className="border-t bg-muted/20 p-3">
                <h4 className="text-xs font-semibold mb-2">Recent Deliveries</h4>
                {deliveries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No deliveries yet</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {deliveries.slice(0, 20).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-background"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.success ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-mono">{d.event}</span>
                        <span className="text-muted-foreground">
                          {d.statusCode ?? "ERR"}
                        </span>
                        <span className="text-muted-foreground ml-auto">
                          {new Date(d.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
