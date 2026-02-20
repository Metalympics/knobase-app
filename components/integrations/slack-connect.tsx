"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSlackConnection,
  saveSlackConnection,
  disconnectSlack,
  getSlackOAuthUrl,
  type SlackConnection,
} from "@/lib/integrations/slack/oauth";
import { sendTestMessage } from "@/lib/integrations/slack/notifications";

export default function SlackConnect() {
  const [connection, setConnection] = useState<SlackConnection | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const refresh = useCallback(() => setConnection(getSlackConnection()), []);
  useEffect(() => { refresh(); }, [refresh]);

  function handleDisconnect() {
    disconnectSlack();
    setConnection(null);
  }

  function handleConnectDemo() {
    const demo: SlackConnection = {
      accessToken: "demo-token",
      botToken: "xoxb-demo",
      teamId: "T12345",
      teamName: "Demo Workspace",
      connectedAt: new Date().toISOString(),
      notifyOnCreate: true,
      notifyOnUpdate: false,
      notifyOnComment: true,
    };
    saveSlackConnection(demo);
    setConnection(demo);
  }

  function updateSetting(key: keyof SlackConnection, value: unknown) {
    if (!connection) return;
    const updated = { ...connection, [key]: value };
    saveSlackConnection(updated);
    setConnection(updated);
  }

  async function handleTestMessage() {
    setTestStatus("sending");
    const ok = await sendTestMessage();
    setTestStatus(ok ? "sent" : "failed");
    setTimeout(() => setTestStatus("idle"), 3000);
  }

  if (!connection) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Slack Integration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Get document updates in Slack and search from slash commands
          </p>
        </div>
        <div className="rounded-lg border p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl">
            💬
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your Slack workspace to receive notifications and use /knobase commands.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.open(getSlackOAuthUrl(), "_self")}>
              Add to Slack
            </Button>
            <Button variant="outline" onClick={handleConnectDemo}>
              Demo Mode
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Slack Integration</h3>
          <p className="text-sm text-muted-foreground">
            Connected to <span className="font-medium">{connection.teamName}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>

      {/* Default Channel */}
      <div className="rounded-lg border p-4 space-y-3">
        <label className="text-sm font-medium">Default Channel</label>
        <Input
          placeholder="#general"
          value={connection.channelName ?? ""}
          onChange={(e) => {
            updateSetting("channelName", e.target.value);
            updateSetting("channelId", e.target.value.replace("#", ""));
          }}
        />
        <p className="text-xs text-muted-foreground">
          Notifications will be sent to this channel by default
        </p>
      </div>

      {/* Notification Settings */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-medium">Notifications</h4>

        {([
          { key: "notifyOnCreate" as const, label: "Document created", desc: "When a new document is created" },
          { key: "notifyOnUpdate" as const, label: "Document updated", desc: "When a document is edited" },
          { key: "notifyOnComment" as const, label: "Comment added", desc: "When someone comments on a document" },
        ]).map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm">{label}</span>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => updateSetting(key, !connection[key])}
              className={`w-10 h-5 rounded-full transition-colors ${
                connection[key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  connection[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      {/* Slash Commands */}
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="text-sm font-medium">Available Commands</h4>
        {[
          { cmd: "/knobase search [query]", desc: "Search your documents" },
          { cmd: "/knobase share [doc-url]", desc: "Share a document in the channel" },
          { cmd: "/knobase notify [doc] [channel]", desc: "Set up doc notifications" },
          { cmd: "/knobase help", desc: "Show all commands" },
        ].map(({ cmd, desc }) => (
          <div key={cmd} className="flex items-baseline gap-2">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmd}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>

      {/* Test */}
      <Button
        className="w-full"
        variant="outline"
        onClick={handleTestMessage}
        disabled={testStatus === "sending"}
      >
        {testStatus === "sending"
          ? "Sending..."
          : testStatus === "sent"
            ? "Test message sent!"
            : testStatus === "failed"
              ? "Failed - check connection"
              : "Send Test Message"}
      </Button>
    </div>
  );
}
