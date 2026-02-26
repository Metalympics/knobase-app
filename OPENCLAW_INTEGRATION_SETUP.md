# OpenClaw Integration Setup for Knobase-App

## Overview
This document guides the implementation of OpenClaw skill integration into knobase-app, enabling users to connect their OpenClaw agents to Knobase workspaces for @mentions and notifications.

**Priority:** High
**Estimated Time:** 4-6 hours
**Skill Repo:** https://github.com/ChrisLeeML/openclaw-knobase

---

## Current State Analysis

### ✅ Already Implemented
- `agent_webhooks` table (Supabase migration 005)
- Outbound webhook dispatcher (`lib/webhooks/outbound.ts`)
- HMAC-SHA256 signature verification
- Event types: `task.created`, `mention.created`, etc.
- `/api/v1/agents/webhook` for agent communication
- `/api/v1/webhooks` for webhook management

### ❌ Still Needed
1. **Agent registration endpoint** - For OpenClaw to register with unique Agent ID
2. **Mention handler** - Detect @claw and trigger webhook
3. **UI for webhook configuration** - Settings page for users to add webhook URL
4. **API key generation UI** - For users to create agent API keys

---

## Database Changes (if any)

The current schema in `005_webhooks_and_api_keys.sql` is sufficient. Ensure these tables exist:

```sql
-- Verify these exist
SELECT * FROM agent_webhooks LIMIT 1;
SELECT * FROM agent_api_keys LIMIT 1;
```

---

## API Implementation

### 1. Create Agent Registration Endpoint

**File:** `app/api/v1/agents/register/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import crypto from "crypto";

const registerSchema = z.object({
  agent_id: z.string().regex(/^knobase_agent_[a-f0-9-]+$/),
  name: z.string().max(100),
  type: z.enum(["openclaw", "knobase_ai", "custom"]),
  version: z.string(),
  capabilities: z.array(z.string()),
  platform: z.string().optional(),
  hostname: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  
  // Validate API key from header
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  
  // Verify API key and get workspace
  const { data: keyData, error: keyError } = await supabase
    .from("agent_api_keys")
    .select("workspace_id, agent_id, revoked_at")
    .eq("key_hash", crypto.createHash("sha256").update(apiKey).digest("hex"))
    .single();
  
  if (keyError || !keyData || keyData.revoked_at) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  
  // Parse and validate body
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  
  const { agent_id, name, type, version, capabilities, platform, hostname } = parsed.data;
  
  // Register or update agent
  const { data: agent, error } = await supabase
    .from("agents")
    .upsert({
      agent_id,
      workspace_id: keyData.workspace_id,
      name,
      type,
      version,
      capabilities,
      platform: platform ?? null,
      hostname: hostname ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "agent_id" })
    .select()
    .single();
  
  if (error) {
    console.error("[Agent Register] Error:", error);
    return NextResponse.json({ error: "Failed to register agent" }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    agent: {
      id: agent.id,
      agent_id: agent.agent_id,
      workspace_id: agent.workspace_id,
      created_at: agent.created_at,
    },
  });
}
```

### 2. Create Mention Handler

**File:** Modify `lib/agents/mention-handler.ts` (create if doesn't exist)

```typescript
import { dispatchWebhookEvent } from "@/lib/webhooks/outbound";
import { createAdminClient } from "@/lib/supabase/admin";

interface MentionData {
  documentId: string;
  workspaceId: string;
  blockId: string;
  mentionedAgent: string; // @claw, @aria, etc.
  message: string;
  context: string;
  userId: string;
}

export async function handleMention(data: MentionData) {
  const supabase = createAdminClient();
  
  // Find agent by name (remove @ prefix)
  const agentName = data.mentionedAgent.replace("@", "");
  
  // Get agent details
  const { data: agent } = await supabase
    .from("agents")
    .select("agent_id, workspace_id, name")
    .eq("workspace_id", data.workspaceId)
    .ilike("name", agentName)
    .eq("is_active", true)
    .single();
  
  if (!agent) {
    console.log(`[Mention] Agent ${data.mentionedAgent} not found`);
    return { success: false, error: "Agent not found" };
  }
  
  // Create a task for the agent
  const { data: task, error: taskError } = await supabase
    .from("agent_tasks")
    .insert({
      workspace_id: data.workspaceId,
      document_id: data.documentId,
      agent_id: agent.agent_id,
      task_type: "mention_response",
      prompt: data.message,
      title: `Mention from @${data.userId}`,
      priority: "normal",
      status: "pending",
      target_context: data.context,
      created_by: data.userId,
    })
    .select()
    .single();
  
  if (taskError) {
    console.error("[Mention] Failed to create task:", taskError);
    return { success: false, error: "Failed to create task" };
  }
  
  // Trigger webhook notification
  await dispatchWebhookEvent(agent.agent_id, data.workspaceId, "mention.created", {
    task_id: task.id,
    document_id: data.documentId,
    block_id: data.blockId,
    message: data.message,
    context: data.context,
    mentioned_by: data.userId,
    timestamp: new Date().toISOString(),
  });
  
  return { success: true, taskId: task.id };
}
```

### 3. API Health Check Endpoint

**File:** `app/api/v1/health/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "knobase-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
```

---

## UI Implementation

### 1. Webhook Configuration in Settings

**File:** `app/settings/webhooks/page.tsx` (new page)

Create a settings page where users can:
- Add webhook URL
- Set webhook secret
- Select events to subscribe to
- Test webhook connection

**Key features:**
- Input field for webhook URL
- Auto-generated secret (with regenerate button)
- Event selection checkboxes
- "Test Connection" button
- Webhook status indicator

### 2. API Key Generation

**File:** `app/settings/api-keys/page.tsx` (modify existing or create)

Add section for Agent API Keys:
- Generate new API key
- Show key prefix only (full key shown once)
- Set expiration date
- Revoke keys
- Copy key to clipboard

**Display format:**
```
Name: OpenClaw Mac mini
Key: kb_a3f2...9d1 (click to reveal full key)
Created: 2024-01-15
Expires: Never
Status: Active
```

### 3. Agents List Page

**File:** `app/settings/agents/page.tsx` (new page)

Show connected agents:
- Agent name and ID
- Type (OpenClaw, Knobase AI, Custom)
- Status (online/offline)
- Last seen
- Capabilities
- Disconnect button

---

## Integration Flow

### User Experience

1. **User goes to Settings > Integrations**
   - Sees "OpenClaw" integration option
   - Clicks "Connect OpenClaw Agent"

2. **Generate API Key**
   - System creates API key
   - Shows one-time copy dialog with instructions

3. **User runs OpenClaw command**
   ```bash
   openclaw knobase auth
   ```
   - Prompts for API key
   - Generates unique Agent ID
   - Registers with Knobase

4. **Configure Webhook (optional)**
   - User pastes their webhook URL (from OpenClaw)
   - Sets secret
   - Tests connection

5. **@mention works**
   - User types @claw in document
   - Knobase detects mention
   - Sends webhook to OpenClaw
   - OpenClaw receives notification in Telegram

---

## Environment Variables

Add to `.env.local`:

```env
# Webhook configuration
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=1000

# Agent registration
AGENT_REGISTRATION_ENABLED=true
MAX_AGENTS_PER_WORKSPACE=10
```

---

## Testing Checklist

### Backend Tests
- [ ] Agent registration endpoint works
- [ ] API key validation works
- [ ] Mention handler creates tasks
- [ ] Webhook dispatcher sends events
- [ ] HMAC signature is correct
- [ ] Webhook retries work
- [ ] Auto-disable after 10 failures works

### Integration Tests
- [ ] OpenClaw skill can authenticate
- [ ] Agent ID is generated and stored
- [ ] @claw mention triggers webhook
- [ ] Telegram notification received
- [ ] Webhook signature verified

### UI Tests
- [ ] Settings page loads
- [ ] API key generation works
- [ ] Webhook configuration saves
- [ ] Test webhook button works
- [ ] Agents list shows connected agents

---

## NPM Publishing (Optional)

The skill can be published to npm for easier installation:

```bash
# In the skill repo
cd ~/Documents/Github/openclaw-knobase-skill
npm login
npm publish --access public
```

Then users can install with:
```bash
npx openclaw-knobase
# or
npm install -g openclaw-knobase
openclaw-knobase auth
```

---

## Documentation Links

- Skill Repo: https://github.com/ChrisLeeML/openclaw-knobase
- Install Script: https://raw.githubusercontent.com/ChrisLeeML/openclaw-knobase/main/install.sh
- Agent ID Spec: https://github.com/ChrisLeeML/openclaw-knobase/blob/main/AGENT_ID_SPEC.md

---

## Notes for Copilot

1. **Use existing patterns** - Follow the same auth patterns used in other API routes
2. **RLS policies** - Ensure all database queries respect workspace permissions
3. **Error handling** - Use existing error response format
4. **Types** - Add types to `lib/supabase/types.ts`
5. **Rate limiting** - Consider rate limiting for agent endpoints

## Questions?

Check the skill repo README and SKILL.md for detailed usage instructions.
