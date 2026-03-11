"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plug,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  WebhookConfigCard,
  WebhookRegistrationForm,
  ConnectionStatus,
  WebhookEventsList,
} from "@/components/settings/openclaw-integration";
import {
  listWebhooks,
  type Webhook,
} from "@/lib/webhooks/store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type PageState = "loading" | "ready" | "error";

interface PageError {
  message: string;
  retryable: boolean;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function OpenClawIntegrationPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState<PageError | null>(null);
  const [webhook, setWebhook] = useState<Webhook | null>(null);

  const loadWebhook = useCallback(() => {
    setPageState("loading");
    setError(null);

    try {
      const webhooks = listWebhooks();
      setWebhook(webhooks.length > 0 ? webhooks[0] : null);
      setPageState("ready");
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to load webhook configuration",
        retryable: true,
      });
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    loadWebhook();
  }, [loadWebhook]);

  const handleWebhookCreated = useCallback((created: Webhook) => {
    setWebhook(created);
  }, []);

  const handleRefresh = useCallback(() => {
    loadWebhook();
  }, [loadWebhook]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <Link
            href="/settings"
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Plug className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              OpenClaw Integration
            </h1>
            <p className="text-xs text-neutral-500">
              Configure webhook endpoints and monitor event delivery for your OpenClaw connection
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Loading state */}
        {pageState === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                <p className="text-sm text-neutral-500">Loading integration settings...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {pageState === "error" && error && (
          <Card className="border-red-200">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">{error.message}</p>
                  <p className="mt-1 text-xs text-red-500">
                    Please check your configuration and try again
                  </p>
                </div>
                {error.retryable && (
                  <Button variant="outline" size="sm" onClick={loadWebhook}>
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ready state */}
        {pageState === "ready" && (
          <>
            {/* Webhook configuration or registration */}
            {webhook ? (
              <WebhookConfigCard webhook={webhook} onRefresh={handleRefresh} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Get Started</CardTitle>
                  <CardDescription>
                    Register a webhook endpoint to start receiving real-time event
                    notifications from your Knobase workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WebhookRegistrationForm onCreated={handleWebhookCreated} />
                </CardContent>
              </Card>
            )}

            {/* Connection status — only shown when a webhook exists */}
            {webhook && (
              <ConnectionStatus webhook={webhook} />
            )}

            {/* Recent deliveries — only shown when a webhook exists */}
            {webhook && (
              <WebhookEventsList webhookId={webhook.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
