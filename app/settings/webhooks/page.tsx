"use client";

import { Webhook } from "lucide-react";
import WebhooksSettings from "@/components/settings/webhooks";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";

export default function WebhooksPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sub-navigation */}
      <SettingsSubNav />

      {/* Header */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Webhook className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Webhooks</h1>
            <p className="text-xs text-neutral-500">
              Configure webhook endpoints for real-time event notifications
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <WebhooksSettings />

        {/* Events reference */}
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-medium text-neutral-700">Webhook Events</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Subscribe to specific events. Payloads are signed with HMAC-SHA256 for verification.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {[
              { event: "mention.created", desc: "Agent @mentioned in a document" },
              { event: "task.created", desc: "New task assigned to an agent" },
              { event: "task.completed", desc: "Agent finished processing a task" },
              { event: "task.failed", desc: "Agent task encountered an error" },
              { event: "task.cancelled", desc: "Task was cancelled by user" },
              { event: "proposal.created", desc: "Agent created an edit proposal" },
              { event: "proposal.decided", desc: "Proposal accepted or rejected" },
              { event: "session.started", desc: "Agent session started" },
              { event: "session.ended", desc: "Agent session ended" },
            ].map((item) => (
              <div key={item.event} className="rounded-md bg-neutral-50 px-3 py-2">
                <code className="text-purple-600">{item.event}</code>
                <p className="mt-0.5 text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Payload format */}
          <div className="mt-4 rounded-md bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Payload Format</p>
            <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
{`{
  "event": "mention.created",
  "timestamp": "2026-02-26T12:00:00Z",
  "data": {
    "task_id": "uuid",
    "document_id": "uuid",
    "message": "@claw summarize this",
    "context": "surrounding text...",
    "mentioned_by": "user_id",
    "agent_name": "claw"
  }
}`}
            </pre>
          </div>

          {/* Signature verification */}
          <div className="mt-4 rounded-md bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Signature Verification</p>
            <p className="mb-2 text-[11px] text-neutral-500">
              Each webhook includes an <code className="rounded bg-white px-1 py-0.5 text-purple-600">X-Webhook-Signature</code> header.
              Verify against the raw request body:
            </p>
            <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
{`import crypto from "crypto";

function verifyWebhook(body: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}
            </pre>
          </div>

          {/* Retry policy */}
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-800">Delivery & Retries</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-blue-700">
              <li>• 10-second timeout per delivery attempt</li>
              <li>• Up to 3 retry attempts with exponential backoff</li>
              <li>• Webhooks auto-disabled after 10 consecutive failures</li>
              <li>• Re-enable from this page after fixing the endpoint</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
