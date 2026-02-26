"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Star,
  Download,
  Upload,
  X,
  ChevronRight,
  Bot,
  Palette,
  Copy,
  Check,
} from "lucide-react";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import {
  listPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  setDefaultPersona,
  exportPersonas,
  importPersonas,
} from "@/lib/agents/store";
import { PERSONA_PRESETS, TONE_OPTIONS, EXPERTISE_SUGGESTIONS } from "@/lib/agents/presets";
import type { AgentPersona, PersonaTone } from "@/lib/agents/types";

/* ------------------------------------------------------------------ */
/* Persona List (left sidebar of the agents page)                     */
/* ------------------------------------------------------------------ */

interface PersonaListProps {
  personas: AgentPersona[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onFromTemplate: (preset: AgentPersona) => void;
  onImport: () => void;
  onExport: () => void;
}

function PersonaList({
  personas,
  selectedId,
  onSelect,
  onCreate,
  onFromTemplate,
  onImport,
  onExport,
}: PersonaListProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Personas
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onImport}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            title="Import personas"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onExport}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            title="Export personas"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {personas.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-neutral-400">
            No personas yet. Create one or start from a template.
          </p>
        )}

        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
              selectedId === p.id
                ? "bg-purple-50 text-purple-700"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: p.color + "20", color: p.color }}
            >
              {p.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-medium">{p.name}</span>
                {p.isDefault && (
                  <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </div>
              <span className="block truncate text-[11px] text-neutral-400">
                {p.role || "No role defined"}
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
          </button>
        ))}
      </div>

      <div className="space-y-1 border-t border-neutral-100 p-2">
        <button
          onClick={onCreate}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50"
        >
          <Plus className="h-4 w-4" />
          Create Persona
        </button>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50"
        >
          <Copy className="h-4 w-4" />
          Start from Template
        </button>

        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden rounded-md border border-neutral-100 bg-neutral-50"
            >
              {PERSONA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onFromTemplate(preset);
                    setShowTemplates(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-100"
                >
                  <span>{preset.avatar}</span>
                  <div>
                    <span className="font-medium text-neutral-700">{preset.name}</span>
                    <span className="ml-1 text-neutral-400">— {preset.role}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Persona Form (right panel)                                         */
/* ------------------------------------------------------------------ */

interface PersonaFormProps {
  persona: AgentPersona;
  onChange: (patch: Partial<AgentPersona>) => void;
  onSave: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isNew: boolean;
}

function PersonaForm({
  persona,
  onChange,
  onSave,
  onDelete,
  onSetDefault,
  isNew,
}: PersonaFormProps) {
  const [expertiseInput, setExpertiseInput] = useState("");
  const [constraintInput, setConstraintInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const addExpertise = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !persona.expertise.includes(trimmed)) {
        onChange({ expertise: [...persona.expertise, trimmed] });
      }
      setExpertiseInput("");
    },
    [persona.expertise, onChange],
  );

  const removeExpertise = useCallback(
    (tag: string) => {
      onChange({ expertise: persona.expertise.filter((t) => t !== tag) });
    },
    [persona.expertise, onChange],
  );

  const addConstraint = useCallback(() => {
    const trimmed = constraintInput.trim();
    if (trimmed) {
      onChange({ constraints: [...persona.constraints, trimmed] });
      setConstraintInput("");
    }
  }, [constraintInput, persona.constraints, onChange]);

  const removeConstraint = useCallback(
    (index: number) => {
      onChange({ constraints: persona.constraints.filter((_, i) => i !== index) });
    },
    [persona.constraints, onChange],
  );

  const filteredSuggestions = useMemo(
    () =>
      EXPERTISE_SUGGESTIONS.filter(
        (s) =>
          !persona.expertise.includes(s) &&
          s.toLowerCase().includes(expertiseInput.toLowerCase()),
      ).slice(0, 6),
    [expertiseInput, persona.expertise],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Form header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          {isNew ? "Create Persona" : "Edit Persona"}
        </h3>
        <div className="flex items-center gap-2">
          {!isNew && !persona.isDefault && (
            <button
              onClick={onSetDefault}
              className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
            >
              <Star className="h-3 w-3" />
              Set Default
            </button>
          )}
          {!isNew && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
          <button
            onClick={onSave}
            disabled={!persona.name.trim()}
            className="rounded-md bg-purple-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {isNew ? "Create" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-red-100 bg-red-50"
          >
            <div className="flex items-center justify-between px-6 py-3">
              <p className="text-xs text-red-700">
                Delete &quot;{persona.name}&quot;? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded px-2 py-1 text-[11px] text-neutral-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="rounded bg-red-500 px-2 py-1 text-[11px] text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form body */}
      <div className="flex flex-1 gap-6 overflow-y-auto px-6 py-5">
        {/* Left column: form fields */}
        <div className="flex-1 space-y-5">
          {/* 1. Basic Info */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Basic Info
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                  Name *
                </label>
                <input
                  type="text"
                  value={persona.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="e.g., DocWriter"
                  className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                  Role
                </label>
                <input
                  type="text"
                  value={persona.role}
                  onChange={(e) => onChange({ role: e.target.value })}
                  placeholder="What does this agent do?"
                  className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                  Avatar Emoji
                </label>
                <input
                  type="text"
                  value={persona.avatar}
                  onChange={(e) => onChange({ avatar: e.target.value.slice(-2) || persona.avatar })}
                  className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-center text-lg outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={persona.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-neutral-200"
                  />
                  <input
                    type="text"
                    value={persona.color}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                        onChange({ color: e.target.value });
                      }
                    }}
                    className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 font-mono text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* 2. Personality */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Personality
            </legend>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                Tone
              </label>
              <select
                value={persona.tone}
                onChange={(e) => onChange({ tone: e.target.value as PersonaTone })}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                Voice Description
              </label>
              <textarea
                value={persona.voiceDescription}
                onChange={(e) => onChange({ voiceDescription: e.target.value })}
                placeholder="How does this agent sound? e.g., Clear, precise, and thorough..."
                rows={2}
                className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
            </div>
          </fieldset>

          {/* 3. Expertise */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Expertise
            </legend>

            <div className="flex flex-wrap gap-1.5">
              {persona.expertise.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700"
                >
                  {tag}
                  <button
                    onClick={() => removeExpertise(tag)}
                    className="rounded-full p-0.5 text-purple-400 hover:bg-purple-100 hover:text-purple-600"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && expertiseInput.trim()) {
                    e.preventDefault();
                    addExpertise(expertiseInput);
                  }
                }}
                placeholder="Add expertise tag..."
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
              {expertiseInput && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-neutral-200 bg-white shadow-md">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => addExpertise(s)}
                      className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

          {/* 4. Instructions (system prompt) */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Instructions
            </legend>

            <div>
              <textarea
                value={persona.instructions}
                onChange={(e) => {
                  if (e.target.value.length <= 10000) {
                    onChange({ instructions: e.target.value });
                  }
                }}
                placeholder="You are a helpful assistant that..."
                rows={6}
                className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
              <p className="mt-1 text-right text-[10px] text-neutral-400">
                {persona.instructions.length} / 10,000 characters
              </p>
            </div>
          </fieldset>

          {/* 5. Constraints */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Constraints
            </legend>

            <div className="space-y-1.5">
              {persona.constraints.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
                    {c}
                  </span>
                  <button
                    onClick={() => removeConstraint(i)}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={constraintInput}
                onChange={(e) => setConstraintInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addConstraint();
                  }
                }}
                placeholder='e.g., "Never use informal language"'
                className="h-8 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
              <button
                onClick={addConstraint}
                disabled={!constraintInput.trim()}
                className="rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </fieldset>
        </div>

        {/* Right column: live preview */}
        <div className="w-64 shrink-0">
          <div className="sticky top-0 rounded-lg border border-neutral-200 bg-white p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Preview
            </h4>

            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <AgentAvatar
                name={persona.name || "Agent"}
                avatar={persona.avatar}
                color={persona.color}
                status="online"
                size="lg"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  @{(persona.name || "agent").toLowerCase().replace(/\s+/g, "")}
                </p>
                <p className="text-[11px] text-neutral-400">{persona.role || "Agent"}</p>
              </div>
            </div>

            {/* Expertise tags */}
            {persona.expertise.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {persona.expertise.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: persona.color + "15",
                      color: persona.color,
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {persona.expertise.length > 4 && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                    +{persona.expertise.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Sample chat bubble */}
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-medium text-neutral-400">
                Sample greeting
              </p>
              <div
                className="rounded-lg px-3 py-2 text-xs leading-relaxed"
                style={{
                  backgroundColor: persona.color + "10",
                  borderLeft: `3px solid ${persona.color}`,
                }}
              >
                {persona.tone === "professional" &&
                  `Hello. I'm ${persona.name || "your agent"}, ready to assist with ${persona.expertise[0] || "your project"}.`}
                {persona.tone === "casual" &&
                  `Hey! I'm ${persona.name || "your agent"} 👋 Need help with ${persona.expertise[0] || "anything"}?`}
                {persona.tone === "academic" &&
                  `Greetings. I'm ${persona.name || "your agent"}, specializing in ${persona.expertise[0] || "research and analysis"}.`}
                {persona.tone === "creative" &&
                  `✨ ${persona.name || "Agent"} here! Let's make something amazing with ${persona.expertise[0] || "creativity"}!`}
                {persona.tone === "direct" &&
                  `${persona.name || "Agent"}. Ready. What do you need?`}
                {persona.tone === "friendly" &&
                  `Hi there! I'm ${persona.name || "your agent"} 😊 Happy to help with ${persona.expertise[0] || "whatever you need"}!`}
                {persona.tone === "technical" &&
                  `${persona.name || "Agent"} initialized. Capabilities: ${persona.expertise.slice(0, 2).join(", ") || "general assistance"}.`}
              </div>
            </div>

            {/* Cursor color preview */}
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-medium text-neutral-400">
                Cursor color
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-0.5 rounded-full"
                  style={{ backgroundColor: persona.color }}
                />
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: persona.color }}
                >
                  {persona.name || "Agent"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Agent Persona Settings Page                                   */
/* ------------------------------------------------------------------ */

export function AgentPersonaSettings() {
  const [personas, setPersonas] = useState<AgentPersona[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPersona, setEditingPersona] = useState<AgentPersona | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const refresh = useCallback(() => {
    const all = listPersonas();
    setPersonas(all);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedId) {
      const p = personas.find((p) => p.id === selectedId);
      if (p) {
        setEditingPersona({ ...p });
        setIsNew(false);
      }
    }
  }, [selectedId, personas]);

  const handleCreate = useCallback(() => {
    const blank: AgentPersona = {
      id: "",
      name: "",
      role: "",
      avatar: "🤖",
      color: "#8B5CF6",
      tone: "professional",
      voiceDescription: "",
      expertise: [],
      instructions: "",
      constraints: [],
      isDefault: false,
      createdAt: "",
      updatedAt: "",
    };
    setEditingPersona(blank);
    setIsNew(true);
    setSelectedId(null);
  }, []);

  const handleFromTemplate = useCallback((preset: AgentPersona) => {
    setEditingPersona({
      ...preset,
      id: "",
      createdAt: "",
      updatedAt: "",
    });
    setIsNew(true);
    setSelectedId(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingPersona || !editingPersona.name.trim()) return;

    if (isNew) {
      const created = createPersona(editingPersona);
      setSelectedId(created.id);
      setIsNew(false);
    } else if (editingPersona.id) {
      updatePersona(editingPersona.id, editingPersona);
    }
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editingPersona, isNew, refresh]);

  const handleDelete = useCallback(() => {
    if (!editingPersona?.id) return;
    deletePersona(editingPersona.id);
    setEditingPersona(null);
    setSelectedId(null);
    setIsNew(false);
    refresh();
  }, [editingPersona, refresh]);

  const handleSetDefault = useCallback(() => {
    if (!editingPersona?.id) return;
    setDefaultPersona(editingPersona.id);
    refresh();
  }, [editingPersona, refresh]);

  const handleExport = useCallback(() => {
    const json = exportPersonas();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knobase-personas.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = importPersonas(text);
        if (count > 0) {
          refresh();
          setImportError(null);
        } else {
          setImportError("No valid personas found in file");
        }
      } catch {
        setImportError("Failed to read file");
      }
    };
    input.click();
  }, [refresh]);

  const handleChange = useCallback((patch: Partial<AgentPersona>) => {
    setEditingPersona((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-neutral-200 bg-white">
      {/* Left: persona list */}
      <div className="w-64 shrink-0 border-r border-neutral-200">
        <PersonaList
          personas={personas}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onFromTemplate={handleFromTemplate}
          onImport={handleImport}
          onExport={handleExport}
        />
      </div>

      {/* Right: form or empty state */}
      <div className="flex-1">
        {editingPersona ? (
          <PersonaForm
            persona={editingPersona}
            onChange={handleChange}
            onSave={handleSave}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            isNew={isNew}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-3 h-12 w-12 text-neutral-200" />
            <h3 className="text-sm font-medium text-neutral-500">
              Select a persona to edit
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              or create a new one from scratch or a template
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Persona
            </button>
          </div>
        )}
      </div>

      {/* Save confirmation toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 shadow-lg">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">Persona saved</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import error toast */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 shadow-lg">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">{importError}</span>
              <button onClick={() => setImportError(null)} className="ml-2">
                <X className="h-3 w-3 text-red-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
