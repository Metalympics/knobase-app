"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Camera,
  Check,
  Loader2,
  Pencil,
  Shield,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useResolvedAvatars } from "@/lib/ui/use-resolved-avatars";
import { useUserProfile } from "@/lib/auth/use-user-profile";
import { AgentFiles } from "@/components/agent/agent-files";

interface AgentProfile {
  id: string;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  description: string | null;
  agent_type: string | null;
  capabilities: string[] | null;
  expertise: string[] | null;
  availability: string | null;
  total_invocations: number;
  last_invoked_at: string | null;
  created_at: string;
  owner_id: string | null;
  bot_id: string | null;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayName(agent: AgentProfile): string {
  return agent.display_name || agent.name || "Unnamed Agent";
}

export default function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.schoolId as string;
  const agentId = params.agentId as string;

  const { profile: currentUser } = useUserProfile();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = !!(currentUser && agent?.owner_id && currentUser.id === agent.owner_id);

  const resolvedAvatars = useResolvedAvatars(
    agent ? [{ id: agent.id, avatar_url: agent.avatar_url }] : [],
  );
  const avatarSrc = agent ? resolvedAvatars[agent.id] : undefined;

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from("users")
        .select(
          "id, name, display_name, avatar_url, description, agent_type, capabilities, expertise, availability, total_invocations, last_invoked_at, created_at, owner_id, bot_id",
        )
        .eq("id", agentId)
        .eq("type", "agent")
        .single();

      if (fetchErr || !data) throw new Error(fetchErr?.message ?? "Agent not found");
      setAgent(data as unknown as AgentProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const startEditing = useCallback(() => {
    if (!agent) return;
    setEditName(displayName(agent));
    setEditDescription(agent.description ?? "");
    setEditing(true);
  }, [agent]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const saveProfile = useCallback(async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("users")
        .update({
          display_name: editName.trim() || null,
          name: editName.trim() || agent.name,
          description: editDescription.trim() || null,
        })
        .eq("id", agent.id);

      if (updateErr) throw updateErr;
      setEditing(false);
      await fetchAgent();
    } catch (err) {
      console.error("[AgentProfile] Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [agent, editName, editDescription, fetchAgent]);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !agent) return;

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("Image must be under 2 MB");
        return;
      }

      setUploadingAvatar(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "png";
        const path = `agents/${agent.id}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

        const { error: updateErr } = await supabase
          .from("users")
          .update({ avatar_url: urlData.publicUrl })
          .eq("id", agent.id);

        if (updateErr) throw updateErr;
        await fetchAgent();
      } catch (err) {
        console.error("[AgentProfile] Avatar upload error:", err);
        alert("Failed to upload avatar");
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [agent, fetchAgent],
  );

  const isOnline = agent?.availability === "online" || agent?.availability === "busy";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fafafa]">
        <Bot className="h-12 w-12 text-neutral-300" />
        <p className="text-sm text-neutral-500">{error ?? "Agent not found"}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top bar */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <button
            onClick={() => router.back()}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-neutral-400">Agent Profile</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        {/* ── Profile header ── */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName(agent)}
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-neutral-100"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-lg font-semibold text-purple-700">
                  <Bot className="h-7 w-7" />
                </div>
              )}
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
                  agent.availability === "busy" ? "bg-amber-400" : isOnline ? "bg-emerald-400" : "bg-neutral-300"
                }`}
              />
              {isOwner && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-neutral-900 truncate">
                      {displayName(agent)}
                    </h1>
                    {agent.agent_type && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider shrink-0">
                        {agent.agent_type}
                      </Badge>
                    )}
                    <Badge
                      variant={isOnline ? "default" : "outline"}
                      className={`shrink-0 text-[10px] ${
                        isOnline
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "text-neutral-500"
                      }`}
                    >
                      {isOnline ? <Wifi className="mr-1 h-2.5 w-2.5" /> : <WifiOff className="mr-1 h-2.5 w-2.5" />}
                      {agent.availability === "busy" ? "Busy" : isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  {agent.description && (
                    <p className="mt-1 text-sm text-neutral-500">{agent.description}</p>
                  )}
                  {!agent.description && isOwner && (
                    <p className="mt-1 text-sm text-neutral-400 italic">No description set</p>
                  )}
                  {agent.bot_id && (
                    <p className="mt-1 font-mono text-xs text-neutral-400">{agent.bot_id}</p>
                  )}

                  {isOwner && (
                    <button
                      onClick={startEditing}
                      className="mt-3 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="mt-4 flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-xs text-purple-600">
              <Shield className="h-3 w-3 shrink-0" />
              You own this agent
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-2xl font-semibold text-neutral-900">{agent.total_invocations}</p>
            <p className="text-xs text-neutral-500">Invocations</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-sm font-medium text-neutral-700">{relativeTime(agent.last_invoked_at)}</p>
            <p className="text-xs text-neutral-500">Last active</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-sm font-medium text-neutral-700">
              {new Date(agent.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-neutral-500">Registered</p>
          </div>
        </div>

        {/* ── Capabilities & Expertise ── */}
        {((agent.capabilities?.length ?? 0) > 0 || (agent.expertise?.length ?? 0) > 0) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
            {(agent.capabilities?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Capabilities</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.capabilities ?? []).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>
                  ))}
                </div>
              </div>
            )}
            {(agent.expertise?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Expertise</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.expertise ?? []).map((exp) => (
                    <Badge key={exp} variant="outline" className="text-[10px]">{exp}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Files ── */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <AgentFiles agentId={agentId} workspaceId={schoolId} />
        </div>
      </div>
    </div>
  );
}
