"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Globe,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
} from "lucide-react";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/schools/store";

type DomainType = "subdomain" | "custom";

interface DomainConfig {
  type: DomainType;
  subdomain: string;
  customDomain: string;
  verified: boolean;
  sslActive: boolean;
  primary: DomainType;
}

type VerificationStatus = "idle" | "checking" | "success" | "error";

const STORAGE_KEY = "knobase-app:domain-config";

function loadConfig(workspaceId: string): DomainConfig {
  if (typeof window === "undefined") return defaultConfig(workspaceId);
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${workspaceId}`);
    if (raw) return JSON.parse(raw) as DomainConfig;
  } catch {}
  return defaultConfig(workspaceId);
}

function saveConfig(workspaceId: string, config: DomainConfig) {
  localStorage.setItem(`${STORAGE_KEY}:${workspaceId}`, JSON.stringify(config));
}

function defaultConfig(workspaceId: string): DomainConfig {
  return {
    type: "subdomain",
    subdomain: workspaceId === "default" ? "my-workspace" : workspaceId,
    customDomain: "",
    verified: false,
    sslActive: false,
    primary: "subdomain",
  };
}

const DOMAIN_REGEX = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z]{2,})+$/;

function validateDomain(domain: string): string | null {
  if (!domain.trim()) return "Domain is required";
  if (domain.startsWith("http://") || domain.startsWith("https://"))
    return "Enter the domain without http:// or https://";
  if (domain.includes("/")) return "Enter the domain without a path";
  if (!DOMAIN_REGEX.test(domain)) return "Invalid domain format";
  return null;
}

export function DomainSettings() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [saved, setSaved] = useState(false);
  const [copiedCname, setCopiedCname] = useState(false);

  useEffect(() => {
    const wsId = getActiveWorkspaceId() ?? getOrCreateDefaultWorkspace().id;
    setWorkspaceId(wsId);
    const loaded = loadConfig(wsId);
    setConfig(loaded);
    setDomainInput(loaded.customDomain);
  }, []);

  const handleSaveDomain = useCallback(() => {
    if (!workspaceId || !config) return;
    const error = validateDomain(domainInput);
    if (error) {
      setDomainError(error);
      return;
    }
    setDomainError(null);
    const updated: DomainConfig = {
      ...config,
      customDomain: domainInput.trim().toLowerCase(),
      verified: false,
      sslActive: false,
    };
    setConfig(updated);
    saveConfig(workspaceId, updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [workspaceId, config, domainInput]);

  const handleVerify = useCallback(async () => {
    if (!workspaceId || !config || !config.customDomain) return;
    setVerificationStatus("checking");
    await new Promise((r) => setTimeout(r, 2000));
    const success = Math.random() > 0.3;
    if (success) {
      const updated: DomainConfig = { ...config, verified: true, sslActive: true };
      setConfig(updated);
      saveConfig(workspaceId, updated);
      setVerificationStatus("success");
    } else {
      setVerificationStatus("error");
    }
  }, [workspaceId, config]);

  const handleSetPrimary = useCallback(
    (type: DomainType) => {
      if (!workspaceId || !config) return;
      if (type === "custom" && !config.verified) return;
      const updated: DomainConfig = { ...config, primary: type };
      setConfig(updated);
      saveConfig(workspaceId, updated);
    },
    [workspaceId, config],
  );

  const copyCname = useCallback(() => {
    navigator.clipboard.writeText("cname.vercel-dns.com");
    setCopiedCname(true);
    setTimeout(() => setCopiedCname(false), 2000);
  }, []);

  if (!config || !workspaceId) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  const subdomainUrl = `${config.subdomain}.knobase.app`;
  const hasCustomDomain = !!config.customDomain;

  return (
    <div className="space-y-5">
      {/* Active Domains */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-800">Active Domains</h3>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Globe className="h-4 w-4 text-neutral-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{subdomainUrl}</p>
                <p className="text-[11px] text-neutral-400">Default subdomain</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <Check className="mr-0.5 h-2.5 w-2.5" />
                Active
              </span>
              {config.primary === "subdomain" && (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  Primary
                </span>
              )}
            </div>
          </div>

          {hasCustomDomain && (
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Shield className="h-4 w-4 text-neutral-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{config.customDomain}</p>
                  <p className="text-[11px] text-neutral-400">Custom domain</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {config.verified ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <Check className="mr-0.5 h-2.5 w-2.5" /> Verified
                    </span>
                    {config.sslActive && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        <Shield className="mr-0.5 h-2.5 w-2.5" /> SSL
                      </span>
                    )}
                    {config.primary === "custom" ? (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        Primary
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetPrimary("custom")}
                        className="text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Set Primary
                      </button>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                    Pending Verification
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Update Custom Domain */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-800">
            {hasCustomDomain ? "Update Custom Domain" : "Add Custom Domain"}
          </h3>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Domain</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="docs.example.com"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value);
                  setDomainError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveDomain();
                }}
                className={`h-9 flex-1 rounded-md border bg-white px-3 font-mono text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:ring-1 ${
                  domainError
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : "border-neutral-200 focus:border-purple-300 focus:ring-purple-100"
                }`}
              />
              <button
                onClick={handleSaveDomain}
                className="shrink-0 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
              >
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
            {domainError && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                {domainError}
              </p>
            )}
          </div>
          <div className="rounded-md bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">
              Enter a domain you own. After saving, configure the DNS records below to point your domain to Knobase.
            </p>
          </div>
        </div>
      </div>

      {/* DNS Configuration */}
      {hasCustomDomain && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h3 className="text-sm font-medium text-neutral-800">DNS Configuration</h3>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-neutral-600">
              Add the following CNAME record at your DNS provider for{" "}
              <span className="font-medium text-neutral-800">{config.customDomain}</span>.
            </p>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-mono text-neutral-600">CNAME</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                      {config.customDomain.split(".")[0]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-800">
                          cname.vercel-dns.com
                        </code>
                        <button
                          onClick={copyCname}
                          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          {copiedCname ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleVerify}
                disabled={verificationStatus === "checking"}
                className="flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${verificationStatus === "checking" ? "animate-spin" : ""}`} />
                {verificationStatus === "checking" ? "Verifying..." : "Verify DNS"}
              </button>
              <a
                href="https://vercel.com/docs/projects/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
              >
                Domain docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {verificationStatus === "error" && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                DNS verification failed. Check your records and try again.
              </div>
            )}
            {verificationStatus === "success" && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Domain verified successfully.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
