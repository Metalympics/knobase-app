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
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
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

export default function DomainSettingsPage() {
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

    // Simulated DNS verification — in production this would call a Vercel API endpoint
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
      <div className="min-h-screen bg-[#fafafa]">
        <SettingsSubNav />
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <div className="h-8 w-48 mx-auto animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    );
  }

  const subdomainUrl = `${config.subdomain}.knobase.app`;
  const hasCustomDomain = !!config.customDomain;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SettingsSubNav />

      {/* Header */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">Custom Domain</h1>
              <p className="text-xs text-neutral-500">
                Configure a custom domain for your workspace
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

        {/* Current Domain */}
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-neutral-100 px-5 py-4">
            <CardTitle className="text-sm">Active Domains</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-3">
            {/* Subdomain */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-4 w-4 text-neutral-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{subdomainUrl}</p>
                  <p className="text-[11px] text-neutral-400">Default subdomain</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="default"
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"
                >
                  <Check className="mr-0.5 h-2.5 w-2.5" />
                  Active
                </Badge>
                {config.primary === "subdomain" ? (
                  <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSetPrimary("subdomain")}
                    className="text-neutral-500"
                  >
                    Set Primary
                  </Button>
                )}
              </div>
            </div>

            {/* Custom Domain */}
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
                      <Badge
                        variant="default"
                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"
                      >
                        <Check className="mr-0.5 h-2.5 w-2.5" />
                        Verified
                      </Badge>
                      {config.sslActive && (
                        <Badge
                          variant="default"
                          className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]"
                        >
                          <Shield className="mr-0.5 h-2.5 w-2.5" />
                          SSL
                        </Badge>
                      )}
                      {config.primary === "custom" ? (
                        <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSetPrimary("custom")}
                          className="text-neutral-500"
                        >
                          Set Primary
                        </Button>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                      Pending Verification
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Domain Setup */}
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-neutral-100 px-5 py-4">
            <CardTitle className="text-sm">
              {hasCustomDomain ? "Update Custom Domain" : "Add Custom Domain"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Domain
              </label>
              <div className="flex gap-2">
                <Input
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
                  className={domainError ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100" : ""}
                />
                <Button
                  size="default"
                  onClick={handleSaveDomain}
                  className="shrink-0"
                >
                  {saved ? "Saved!" : "Save"}
                </Button>
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
                Enter a domain you own. After saving, configure the DNS records below to point
                your domain to Knobase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* DNS Configuration */}
        {hasCustomDomain && (
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-neutral-100 px-5 py-4">
              <CardTitle className="text-sm">DNS Configuration</CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
              <p className="text-sm text-neutral-600">
                Add the following DNS record to your domain provider to connect{" "}
                <span className="font-medium text-neutral-800">{config.customDomain}</span> to
                your workspace.
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
                        <Badge variant="outline" className="text-[10px] font-mono">CNAME</Badge>
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

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> DNS changes can take up to 48 hours to propagate. If you
                  are using a root domain (e.g. example.com), use an <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px]">A</code> record
                  pointing to <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px]">76.76.21.21</code> instead.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://vercel.com/docs/projects/domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  Vercel domain docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification */}
        {hasCustomDomain && (
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-neutral-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Domain Verification</CardTitle>
                {config.verified && (
                  <Badge
                    variant="default"
                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"
                  >
                    <Check className="mr-0.5 h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
              {config.verified ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{config.customDomain}</strong> is verified and serving traffic.
                      {config.sslActive && " SSL certificate is active."}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerify}
                    disabled={verificationStatus === "checking"}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${verificationStatus === "checking" ? "animate-spin" : ""}`} />
                    Re-verify
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    After updating your DNS records, click the button below to verify your domain
                    configuration.
                  </p>

                  {verificationStatus === "error" && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      DNS verification failed. Please check your records and try again. Changes may
                      take up to 48 hours to propagate.
                    </div>
                  )}

                  {verificationStatus === "success" && (
                    <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Domain verified successfully.
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleVerify}
                    disabled={verificationStatus === "checking"}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${verificationStatus === "checking" ? "animate-spin" : ""}`} />
                    {verificationStatus === "checking" ? "Verifying..." : "Verify DNS Configuration"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-neutral-100 px-5 py-4">
            <CardTitle className="text-sm">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="space-y-3">
              {[
                { step: "1", title: "Add your domain", desc: "Enter the custom domain you want to use for your workspace." },
                { step: "2", title: "Configure DNS", desc: "Add a CNAME record pointing to cname.vercel-dns.com at your DNS provider." },
                { step: "3", title: "Verify", desc: "Click verify to confirm your DNS configuration is correct." },
                { step: "4", title: "Set as primary", desc: "Once verified, set the custom domain as your primary domain." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-semibold text-purple-700">
                    {item.step}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
