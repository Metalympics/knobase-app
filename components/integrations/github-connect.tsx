"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  getGitHubConnection,
  saveGitHubConnection,
  disconnectGitHub,
  getGitHubOAuthUrl,
  listRepos,
  listBranches,
  type GitHubConnection,
} from "@/lib/integrations/github/oauth";
import { getRecentSyncLogs, pushDocToGitHub, type SyncLogEntry } from "@/lib/integrations/github/sync";

export default function GitHubConnect() {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [repos, setRepos] = useState<{ full_name: string; default_branch: string; private: boolean }[]>([]);
  const [branches, setBranches] = useState<{ name: string }[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setConnection(getGitHubConnection());
    setSyncLogs(getRecentSyncLogs());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function loadRepos() {
    if (!connection?.accessToken) return;
    setLoadingRepos(true);
    try {
      const r = await listRepos(connection.accessToken);
      setRepos(r);
    } catch {
      // Handle error silently
    } finally {
      setLoadingRepos(false);
    }
  }

  async function loadBranches(repo: string) {
    if (!connection?.accessToken) return;
    try {
      const b = await listBranches(connection.accessToken, repo);
      setBranches(b);
    } catch {
      // Handle error silently
    }
  }

  function selectRepo(repoName: string) {
    if (!connection) return;
    const updated = { ...connection, selectedRepo: repoName };
    saveGitHubConnection(updated);
    setConnection(updated);
    loadBranches(repoName);
  }

  function selectBranch(branch: string) {
    if (!connection) return;
    const updated = { ...connection, selectedBranch: branch };
    saveGitHubConnection(updated);
    setConnection(updated);
  }

  function toggleAutoSync() {
    if (!connection) return;
    const updated = { ...connection, autoSync: !connection.autoSync };
    saveGitHubConnection(updated);
    setConnection(updated);
  }

  function toggleBiDirectional() {
    if (!connection) return;
    const updated = { ...connection, biDirectional: !connection.biDirectional };
    saveGitHubConnection(updated);
    setConnection(updated);
  }

  function handleDisconnect() {
    disconnectGitHub();
    setConnection(null);
    setRepos([]);
    setBranches([]);
  }

  function handleConnectDemo() {
    const demo: GitHubConnection = {
      accessToken: "demo-token",
      username: "demo-user",
      avatarUrl: "",
      connectedAt: new Date().toISOString(),
      autoSync: false,
      biDirectional: false,
    };
    saveGitHubConnection(demo);
    setConnection(demo);
  }

  if (!connection) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">GitHub Integration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sync your documents to a GitHub repository as markdown files
          </p>
        </div>
        <div className="rounded-lg border p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl">
            🐙
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your GitHub account to sync documents, create PRs for changes, and link issues.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.open(getGitHubOAuthUrl(), "_self")}>
              Connect GitHub
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
          <h3 className="text-lg font-semibold">GitHub Integration</h3>
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium">{connection.username}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>

      {/* Repo Selection */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Repository</label>
          {repos.length === 0 && (
            <Button variant="ghost" size="xs" onClick={loadRepos} disabled={loadingRepos}>
              {loadingRepos ? "Loading..." : "Load Repos"}
            </Button>
          )}
        </div>

        {connection.selectedRepo ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {connection.selectedRepo}
            </span>
            <Button variant="ghost" size="xs" onClick={() => { selectRepo(""); setRepos([]); }}>
              Change
            </Button>
          </div>
        ) : repos.length > 0 ? (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {repos.map((repo) => (
              <button
                key={repo.full_name}
                onClick={() => selectRepo(repo.full_name)}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="font-mono">{repo.full_name}</span>
                {repo.private && (
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded">
                    private
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}

        {/* Branch Selection */}
        {connection.selectedRepo && (
          <div>
            <label className="text-sm font-medium">Branch</label>
            {branches.length > 0 ? (
              <div className="flex gap-1 mt-1 flex-wrap">
                {branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => selectBranch(b.name)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      connection.selectedBranch === b.name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Branch: {connection.selectedBranch ?? "main"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-medium">Sync Settings</h4>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm">Auto-sync</span>
            <p className="text-xs text-muted-foreground">Push changes automatically</p>
          </div>
          <button
            onClick={toggleAutoSync}
            className={`w-10 h-5 rounded-full transition-colors ${
              connection.autoSync ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                connection.autoSync ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm">Bi-directional sync</span>
            <p className="text-xs text-muted-foreground">Pull changes from GitHub too</p>
          </div>
          <button
            onClick={toggleBiDirectional}
            className={`w-10 h-5 rounded-full transition-colors ${
              connection.biDirectional ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                connection.biDirectional ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Sync Now */}
      <Button
        className="w-full"
        disabled={!connection.selectedRepo || syncing}
        onClick={async () => {
          setSyncing(true);
          try {
            await pushDocToGitHub({
              id: "manual-sync",
              title: "Sync Test",
              content: "This is a test sync from Knobase.",
              tags: ["test"],
            });
          } finally {
            setSyncing(false);
            setSyncLogs(getRecentSyncLogs());
          }
        }}
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>

      {/* Sync Log */}
      {syncLogs.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 text-xs py-1"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    log.status === "success" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium capitalize">{log.action}</span>
                <span className="text-muted-foreground truncate flex-1">
                  {log.fileName}
                </span>
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
