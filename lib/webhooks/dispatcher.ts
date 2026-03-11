/**
 * Webhook Dispatcher
 * 
 * Handles dispatching webhooks with HMAC-SHA256 signatures.
 * Used by the Mentions API to notify external agents (like OpenClaw)
 * when they are mentioned in a document.
 */

export interface WebhookDispatchResult {
  success: boolean;
  error?: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * 
 * @param payload - The JSON payload to sign
 * @param secret - The HMAC secret
 * @returns The hex-encoded HMAC-SHA256 signature
 */
export async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Import the secret as a CryptoKey
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  // Sign the payload
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Dispatch a webhook to an external URL
 * 
 * @param webhookUrl - The URL to POST to
 * @param secret - The HMAC secret for signing
 * @param payload - The payload to send
 * @returns Promise<{ success: boolean, error?: string }>
 * 
 * Features:
 * - Generates HMAC-SHA256 signature
 * - Posts with proper headers (Content-Type, X-Knobase-Signature, X-Knobase-Event)
 * - 10-second timeout
 * - Returns immediately with success status
 */
export async function dispatchWebhook(
  webhookUrl: string,
  secret: string,
  payload: WebhookPayload
): Promise<WebhookDispatchResult> {
  try {
    // Serialize payload
    const body = JSON.stringify(payload);
    
    // Generate HMAC signature
    const signature = await generateHmacSignature(body, secret);
    
    // Dispatch webhook with 10-second timeout
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Knobase-Signature": signature,
        "X-Knobase-Event": payload.event,
        "X-Knobase-Timestamp": payload.timestamp,
        "User-Agent": "Knobase-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10-second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Webhook Dispatcher] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true };

  } catch (err: unknown) {
    let errorMessage: string;
    
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = "Request timeout (10s exceeded)";
      } else {
        errorMessage = err.message;
      }
    } else {
      errorMessage = "Unknown error";
    }
    
    console.error("[Webhook Dispatcher] Error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a test ping to a webhook endpoint
 */
export async function testWebhook(
  webhook: { id: string; url: string; secret: string }
): Promise<WebhookDispatchResult> {
  return dispatchWebhook(webhook.url, webhook.secret, {
    event: "ping",
    timestamp: new Date().toISOString(),
    webhookId: webhook.id,
  });
}

/**
 * Verify a webhook signature (for use by webhook receivers)
 * 
 * @param payload - The raw request body
 * @param signature - The signature from X-Knobase-Signature header
 * @param secret - The HMAC secret
 * @returns boolean indicating if signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateHmacSignature(payload, secret);
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}
