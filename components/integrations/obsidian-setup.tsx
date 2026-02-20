"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getObsidianConfig,
  saveObsidianConfig,
  removeObsidianConfig,
  type ObsidianConfig,
} from "@/lib/integrations/obsidian/sync";

const SYNC_FREQUENCIES: { value: ObsidianConfig["syncFrequency"]; label: string }[] = [
  { value: "manual", label: "Manual only" },
  { value: "5min", label: "Every 5 minutes" },
  { value: "15min", label: "Every 15 minutes" },
  { value: "1hr", label: "Every hour" },
];

const CONFLICT_MODES: { value: ObsidianConfig["conflictResolution"]; label: string; desc: string }[] = [
  { value: "last-write-wins", label: "Last write wins", desc: "Most recent change takes priority" },
  { value: "keep-both", label: "Keep both", desc: "Create a copy with conflicts marked" },
  { value: "ask", label: "Ask me", desc: "Prompt for resolution on each conflict" },
];

export default function ObsidianSetup() {
  const [config, setConfig] = useState<ObsidianConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [vaultPath, setVaultPath] = useState("");

  const refresh = useCallback(() => setConfig(getObsidianConfig()), []);
  useEffect(() => { refresh(); }, [refresh]);

  function handleSetup() {
    if (!vaultPath.trim()) return;
    const newConfig: ObsidianConfig = {
      vaultPath: vaultPath.trim(),
      syncFrequency: "manual",
      conflictResolution: "last-write-wins",
      syncEnabled: true,
      fileFilter: "**/*.md",
    };
    saveObsidianConfig(newConfig);
    setConfig(newConfig);
    setEditing(false);
  }

  function updateConfig(patch: Partial<ObsidianConfig>) {
    if (!config) return;
    const updated = { ...config, ...patch };
    saveObsidianConfig(updated);
    setConfig(updated);
  }

  function handleDisconnect() {
    removeObsidianConfig();
    setConfig(null);
    setVaultPath("");
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Obsidian Sync</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Two-way sync between your Obsidian vault and Knobase
          </p>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl mb-3">
              💎
            </div>
            <p className="text-sm text-muted-foreground">
              Sync your Obsidian vault&apos;s markdown files with Knobase. Wiki-links and
              frontmatter are preserved.
            </p>
          </div>

          <div className="rounded-lg border p-4 bg-muted/20">
            <h4 className="text-sm font-medium mb-2">How it works</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Enter your Obsidian vault path below</li>
              <li>Knobase will read .md files and sync them as documents</li>
              <li>Wiki-links (<code className="bg-muted px-1 rounded">[[Page]]</code>) are converted to Knobase links</li>
              <li>YAML frontmatter (tags, metadata) is preserved</li>
              <li>Changes sync both ways based on your settings</li>
            </ol>
          </div>

          <div>
            <label className="text-sm font-medium">Vault Path</label>
            <Input
              placeholder="/Users/you/Documents/MyVault"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The full path to your Obsidian vault folder
            </p>
          </div>

          <Button onClick={handleSetup} disabled={!vaultPath.trim()} className="w-full">
            Set Up Sync
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Obsidian Sync</h3>
          <p className="text-sm text-muted-foreground">
            Vault: <span className="font-mono">{config.vaultPath}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>

      {/* Status */}
      <div className="rounded-lg border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${config.syncEnabled ? "bg-green-500" : "bg-gray-400"}`} />
          <div>
            <p className="text-sm font-medium">
              {config.syncEnabled ? "Sync Active" : "Sync Paused"}
            </p>
            {config.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(config.lastSyncAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateConfig({ syncEnabled: !config.syncEnabled })}
        >
          {config.syncEnabled ? "Pause" : "Resume"}
        </Button>
      </div>

      {/* Sync Frequency */}
      <div className="rounded-lg border p-4 space-y-3">
        <label className="text-sm font-medium">Sync Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {SYNC_FREQUENCIES.map((freq) => (
            <button
              key={freq.value}
              onClick={() => updateConfig({ syncFrequency: freq.value })}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                config.syncFrequency === freq.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {freq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Resolution */}
      <div className="rounded-lg border p-4 space-y-3">
        <label className="text-sm font-medium">Conflict Resolution</label>
        <div className="space-y-2">
          {CONFLICT_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                config.conflictResolution === mode.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="conflict"
                checked={config.conflictResolution === mode.value}
                onChange={() => updateConfig({ conflictResolution: mode.value })}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{mode.label}</span>
                <p className="text-xs text-muted-foreground">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* File Filter */}
      <div className="rounded-lg border p-4 space-y-2">
        <label className="text-sm font-medium">File Filter</label>
        <Input
          value={config.fileFilter}
          onChange={(e) => updateConfig({ fileFilter: e.target.value })}
          className="font-mono text-sm"
          placeholder="**/*.md"
        />
        <p className="text-xs text-muted-foreground">
          Glob pattern for files to sync (default: all markdown files)
        </p>
      </div>

      {/* Sync Now */}
      <Button
        className="w-full"
        disabled={!config.syncEnabled}
        onClick={() => updateConfig({ lastSyncAt: new Date().toISOString() })}
      >
        Sync Now
      </Button>
    </div>
  );
}
