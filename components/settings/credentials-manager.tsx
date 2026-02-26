"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Shield,
  RefreshCw,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import {
  credentialManager,
  getPasswordStrength,
  SERVICE_PRESETS,
  type SecureCredential,
  type CredentialServicePreset,
} from "@/lib/security/credentials";

/* ------------------------------------------------------------------ */
/* Password Setup (first-time)                                        */
/* ------------------------------------------------------------------ */

function PasswordSetup({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const strengthColor = {
    weak: "bg-red-400",
    fair: "bg-amber-400",
    strong: "bg-emerald-400",
  }[strength];

  const handleSetup = useCallback(async () => {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (strength === "weak") {
      setError("Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols.");
      return;
    }
    try {
      await credentialManager.setup(password);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    }
  }, [password, confirm, strength, onComplete]);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
        <Shield className="h-8 w-8 text-purple-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Set Up Secure Vault
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Create a master password to encrypt your API keys. This password
          cannot be recovered if forgotten.
        </p>
      </div>

      <div className="space-y-3 text-left">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Master Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Enter a strong password"
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
          />
          {password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-all ${strengthColor}`}
                  style={{
                    width:
                      strength === "weak"
                        ? "33%"
                        : strength === "fair"
                          ? "66%"
                          : "100%",
                  }}
                />
              </div>
              <span className="text-[10px] font-medium capitalize text-neutral-500">
                {strength}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError(null);
            }}
            placeholder="Confirm your password"
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
          />
        </div>

        {error && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </p>
        )}

        <div className="rounded-md bg-amber-50 px-3 py-2">
          <p className="text-[11px] text-amber-700">
            <strong>Warning:</strong> If you forget this password, all stored
            credentials will be permanently lost. There is no recovery mechanism.
          </p>
        </div>
      </div>

      <button
        onClick={handleSetup}
        disabled={!password || !confirm}
        className="w-full rounded-md bg-purple-500 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
      >
        Create Vault
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unlock Prompt                                                      */
/* ------------------------------------------------------------------ */

function UnlockPrompt({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnlock = useCallback(async () => {
    setLoading(true);
    setError(false);
    const success = await credentialManager.unlock(password);
    if (success) {
      onUnlock();
    } else {
      setError(true);
    }
    setLoading(false);
  }, [password, onUnlock]);

  const handleReset = useCallback(() => {
    if (
      window.confirm(
        "This will delete ALL stored credentials permanently. Are you sure?",
      )
    ) {
      credentialManager.resetVault();
      window.location.reload();
    }
  }, []);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <Lock className="h-8 w-8 text-neutral-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Vault Locked
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Enter your master password to access stored credentials.
        </p>
      </div>

      <div className="space-y-3 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUnlock();
          }}
          placeholder="Master password"
          autoFocus
          className={`h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-1 ${
            error
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-neutral-200 focus:border-purple-300 focus:ring-purple-100"
          }`}
        />
        {error && (
          <p className="text-xs text-red-600">Incorrect password. Try again.</p>
        )}
      </div>

      <button
        onClick={handleUnlock}
        disabled={!password || loading}
        className="w-full rounded-md bg-purple-500 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
      >
        {loading ? "Unlocking..." : "Unlock"}
      </button>

      <button
        onClick={handleReset}
        className="text-xs text-neutral-400 hover:text-red-500"
      >
        Forgot password? Reset vault
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Credential Form                                                */
/* ------------------------------------------------------------------ */

function AddCredentialForm({
  onAdd,
  onCancel,
}: {
  onAdd: (cred: SecureCredential) => void;
  onCancel: () => void;
}) {
  const [service, setService] = useState<CredentialServicePreset>(
    SERVICE_PRESETS[0],
  );
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !value.trim()) return;
    setSaving(true);
    try {
      const cred = await credentialManager.addCredential(
        name.trim(),
        service.service,
        service.keyName,
        value.trim(),
      );
      onAdd(cred);
    } catch (err) {
      console.error("Failed to save credential:", err);
    }
    setSaving(false);
  }, [name, value, service, onAdd]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-lg border border-purple-200 bg-white"
    >
      <div className="border-b border-purple-100 px-4 py-3">
        <h4 className="text-sm font-medium text-neutral-800">
          Add Credential
        </h4>
      </div>
      <div className="space-y-3 px-4 py-4">
        {/* Service selector */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-neutral-600">
            Service
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_PRESETS.map((preset) => (
              <button
                key={preset.service}
                onClick={() => {
                  setService(preset);
                  if (!name) setName(preset.label);
                }}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  service.service === preset.service
                    ? "border-purple-300 bg-purple-50 text-purple-700"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <span>{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-neutral-600">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My OpenAI Key"
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-neutral-600">
            {service.keyName}
          </label>
          <div className="relative">
            <input
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 pr-9 font-mono text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
            />
            <button
              onClick={() => setShowValue(!showValue)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-600"
            >
              {showValue ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-neutral-100 px-4 py-3">
        <button
          onClick={onCancel}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !value.trim() || saving}
          className="rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Credential"}
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Credential List                                                    */
/* ------------------------------------------------------------------ */

function CredentialItem({
  credential,
  onDelete,
  onTest,
}: {
  credential: SecureCredential;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const preset = SERVICE_PRESETS.find((p) => p.service === credential.service);

  const statusColors: Record<string, string> = {
    valid: "bg-emerald-100 text-emerald-700",
    invalid: "bg-red-100 text-red-700",
    untested: "bg-neutral-100 text-neutral-500",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 text-lg">
        {preset?.icon ?? "🔑"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-800">
            {credential.name}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[credential.status]}`}
          >
            {credential.status}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400">
          {preset?.label ?? credential.service} · {credential.keyName}
          {credential.lastUsed && (
            <>
              {" "}
              · Last used{" "}
              {new Date(credential.lastUsed).toLocaleDateString()}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onTest(credential.id)}
          className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          Test
        </button>
        <button
          onClick={() => onDelete(credential.id)}
          className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Credentials Manager                                           */
/* ------------------------------------------------------------------ */

export function CredentialsManager() {
  const [initialized, setInitialized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [credentials, setCredentials] = useState<SecureCredential[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    setInitialized(credentialManager.isInitialized());
    setUnlocked(credentialManager.isUnlocked());

    if (credentialManager.isUnlocked()) {
      setCredentials(credentialManager.listCredentials());
    }

    const unsub = credentialManager.onLock(() => {
      setUnlocked(false);
    });
    return unsub;
  }, []);

  const handleSetupComplete = useCallback(() => {
    setInitialized(true);
    setUnlocked(true);
    setCredentials(credentialManager.listCredentials());
  }, []);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    setCredentials(credentialManager.listCredentials());
  }, []);

  const handleLock = useCallback(() => {
    credentialManager.lock();
    setUnlocked(false);
  }, []);

  const handleAdd = useCallback((cred: SecureCredential) => {
    setCredentials(credentialManager.listCredentials());
    setShowAdd(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    credentialManager.deleteCredential(id);
    setCredentials(credentialManager.listCredentials());
  }, []);

  const handleTest = useCallback(async (id: string) => {
    setTesting(id);
    try {
      const value = await credentialManager.getCredentialValue(id);
      if (!value) {
        await credentialManager.updateCredential(id, { status: "invalid" });
      } else {
        // Simple validation: check if the key looks like a valid API key
        const isValid = value.length >= 10;
        await credentialManager.updateCredential(id, {
          status: isValid ? "valid" : "invalid",
        });
      }
      setCredentials(credentialManager.listCredentials());
    } catch {
      await credentialManager.updateCredential(id, { status: "invalid" });
      setCredentials(credentialManager.listCredentials());
    }
    setTesting(null);
  }, []);

  // Not initialized: show setup
  if (!initialized) {
    return <PasswordSetup onComplete={handleSetupComplete} />;
  }

  // Locked: show unlock
  if (!unlocked) {
    return <UnlockPrompt onUnlock={handleUnlock} />;
  }

  // Unlocked: show credential list
  return (
    <div className="space-y-4">
      {/* Security banner */}
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Unlock className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">
            Vault Unlocked
          </span>
          <span className="text-[10px] text-emerald-500">
            · AES-256-GCM encrypted · Auto-locks after 15 min
          </span>
        </div>
        <button
          onClick={handleLock}
          className="flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
        >
          <Lock className="h-3 w-3" />
          Lock
        </button>
      </div>

      {/* Credential list */}
      <div className="space-y-2">
        {credentials.length === 0 && !showAdd && (
          <div className="flex flex-col items-center py-8 text-center">
            <KeyRound className="mb-2 h-8 w-8 text-neutral-200" />
            <p className="text-sm text-neutral-400">
              No credentials stored yet
            </p>
            <p className="mt-0.5 text-xs text-neutral-300">
              Add API keys to use with your AI agents
            </p>
          </div>
        )}

        {credentials.map((cred) => (
          <CredentialItem
            key={cred.id}
            credential={cred}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        ))}
      </div>

      {/* Add credential */}
      <AnimatePresence>
        {showAdd && (
          <AddCredentialForm
            onAdd={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Credential
        </button>
      )}
    </div>
  );
}
