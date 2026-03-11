# OpenClaw Integration - Complete Setup & Usage Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Inviting OpenClaw to Your Workspace](#inviting-openclaw-to-your-workspace)
5. [Using @Mentions](#using-mentions)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Overview

OpenClaw integration allows you to summon AI agents directly within your Knobase workspace by typing `@agentname`. The agent receives context about your document and can:

- Read document content via MCP (Model Context Protocol)
- Write/edit content at specific block locations
- Respond to mentions in real-time
- Maintain conversation threads

### Key Features

- **Block-Level Precision**: Agents can target specific paragraphs, headings, or sections
- **Real-time Collaboration**: Webhook-based instant notification system
- **Secure**: HMAC-SHA256 signature verification on all webhooks
- **Agent Profiles**: Each agent is a user in your workspace with unique capabilities

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knobase Workspace                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Editor     │  │   API        │  │   MCP Server     │  │
│  │  (TiPTap)    │──│  (/api/...)  │──│  (/api/mcp)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │  Supabase DB    │                      │
│                    │  • mentions     │                      │
│                    │  • user_webhooks│                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS Webhook
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenClaw Agent                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Webhook     │  │   MCP        │  │   AI Processing  │  │
│  │  Receiver    │──│  Client      │──│  (LLM/Agent)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User types `@claw`** in editor
2. **Block ID Extension** captures the block location
3. **Mention saved** to `mentions` table with `resolution_status: 'pending'`
4. **Webhook dispatched** to agent's registered URL with HMAC signature
5. **Agent receives** mention data + MCP endpoint + auth token
6. **Agent calls MCP** `read_document` to get full context
7. **Agent processes** with LLM, generates response
8. **Agent calls MCP** `write_document` with block-level operations
9. **Document updates** in real-time
10. **Mention status** updated to `resolution_status: 'resolved'`

---

## Setup Instructions

### Step 1: Apply Database Migration

Run the migration to create the `user_webhooks` table:

```bash
# Using Supabase CLI
supabase migration up

# Or via Supabase Dashboard
# Go to SQL Editor → New Query → Paste contents of:
# supabase/migrations/015_openclaw_integration.sql
```

**Migration creates:**
- `user_webhooks` table for agent webhook registration
- RLS policies for security
- Indexes for fast lookups

### Step 2: Register Agent in Database

Add OpenClaw (or any agent) as a user in your workspace:

```sql
-- Create agent user profile
INSERT INTO public.users (
  id,
  auth_id,
  email,
  name,
  display_name,
  type,
  agent_type,
  school_id,
  is_verified,
  is_approved,
  profile_confirmed,
  avatar_url,
  description,
  capabilities,
  expertise
) VALUES (
  'agent-claw-uuid',           -- Generate a UUID
  'auth-claw-uuid',            -- Link to auth.users
  'claw@openclaw.local',       -- Agent email
  '@claw',                     -- Username
  'Claw',                      -- Display name
  'agent',                     -- Type: agent
  'openclaw',                  -- Agent type
  'your-school-uuid',          -- Your workspace ID
  true,                        -- Verified
  true,                        -- Approved
  true,                        -- Profile confirmed
  'https://.../claw-avatar.png',
  'AI assistant for Knobase workspace',
  ARRAY['read_document', 'write_document', 'search'],
  ARRAY['documentation', 'coding', 'analysis']
);

-- Link to auth.users (for authentication)
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
) VALUES (
  'auth-claw-uuid',
  'claw@openclaw.local',
  '{"name": "Claw", "type": "agent"}'
);
```

### Step 3: Configure OpenClaw Agent

On your OpenClaw instance, configure the Knobase skill:

```bash
# Install/update the skill
cd ~/.openclaw/skills/knobase

# Set environment variables
cat > .env << EOF
KNOBASE_API_KEY=your_knobase_api_key
KNOBASE_WORKSPACE_ID=your_school_uuid
KNOBASE_WEBHOOK_SECRET=generate_a_random_secret
WEBHOOK_PORT=3456
EOF

# Start webhook server
openclaw knobase webhook start
```

### Step 4: Register Webhook URL

**Option A: Via UI (Recommended)**

1. Navigate to **Settings → Integrations → OpenClaw**
2. Click "Connect OpenClaw Agent"
3. Enter your webhook URL: `https://your-openclaw.ngrok.io/webhook/knobase`
4. Select event types: `mention`, `comment`
5. Copy the generated HMAC secret
6. Paste secret into your OpenClaw `.env` file

**Option B: Via API**

```bash
curl -X POST https://app.knobase.com/api/webhooks/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "mention",
    "webhook_url": "https://your-openclaw.ngrok.io/webhook/knobase"
  }'
```

Response:
```json
{
  "id": "webhook-uuid",
  "webhook_url": "https://your-openclaw.ngrok.io/webhook/knobase",
  "secret": "abc123...",  // COPY THIS - shown only once!
  "event_type": "mention",
  "is_active": true
}
```

---

## Inviting OpenClaw to Your Workspace

### Method 1: Direct Invitation (UI)

1. Go to **Workspace Settings → Members → Invite**
2. Enter agent email: `claw@openclaw.local`
3. Select role: `Agent` (custom role with limited permissions)
4. Send invitation
5. Agent automatically accepts (no email confirmation needed for agents)

### Method 2: Share Document Link

1. Create a document in your workspace
2. Click **Share** → **Invite by Email**
3. Enter: `claw@openclaw.local`
4. Set permissions: `Can Edit` or `Can Comment`
5. The agent will be added as a collaborator

### Method 3: API Invitation

```bash
curl -X POST https://app.knobase.com/api/invites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "claw@openclaw.local",
    "school_id": "your-school-uuid",
    "role": "editor",
    "document_id": "optional-doc-uuid"
  }'
```

---

## Using @Mentions

### Basic Usage

1. **Type `@`** in any document
2. **Select `@claw`** from dropdown (shows 🤖 icon for agents)
3. **Type your request**: `@claw summarize this section`
4. **Press Enter** or click outside

### Mention Format

Agents understand natural language instructions:

```
@claw create a task list for Q2 planning
@claw analyze this data and provide insights
@claw rewrite this paragraph to be more concise
@claw add a code example here
@claw fix the grammar in this section
```

### Context Window

The agent receives:
- **200 characters before** the mention
- **200 characters after** the mention
- **Full document** (via MCP if needed)
- **Block ID** for precise targeting

### Response Types

Agents can:
1. **Insert content** after the mention block
2. **Replace** the current block
3. **Append** to document end
4. **Create new document** (if requested)

### Conversation Threads

For multi-turn conversations:

```
User: @claw what do you think about this plan?
Claw: [responds with analysis]

User: @claw can you make it more detailed?
Claw: [expands on previous response]
```

The `parent_mention_id` field tracks conversation threads.

---

## Webhook Payload Structure

When you mention an agent, Knobase sends:

```json
{
  "event": "agent.mentioned",
  "version": "1.0.0",
  "timestamp": "2024-03-10T18:30:00Z",
  
  "mention": {
    "id": "mention-uuid",
    "document_id": "doc-uuid",
    "block_id": "blk-a1b2c3d4",
    "text": "@claw summarize this",
    "context": {
      "before": "...200 chars before mention...",
      "after": "...200 chars after mention..."
    }
  },
  
  "author": {
    "id": "user-uuid",
    "name": "Chris Lee",
    "email": "chris@example.com"
  },
  
  "mcp": {
    "endpoint": "https://app.knobase.com/api/mcp",
    "token": "short-lived-jwt-token",
    "expires_at": "2024-03-10T19:00:00Z"
  },
  
  "signature": "sha256=abc123..."
}
```

### Security Verification

OpenClaw verifies the webhook:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

---

## MCP Tool Calls

### Read Document

```javascript
// OpenClaw calls MCP to read document
const result = await callMCPTool({
  endpoint: "https://app.knobase.com/api/mcp",
  token: "jwt-token",
  toolName: "read_document",
  args: {
    document_id: "doc-uuid",
    block_id: "blk-a1b2c3d4",  // Optional: specific block
    include_context: true
  }
});

// Response
{
  content: {
    document_id: "doc-uuid",
    title: "Q2 Planning",
    blocks: [
      { block_id: "blk-1", type: "heading", text: "Goals" },
      { block_id: "blk-2", type: "paragraph", text: "..." }
    ]
  }
}
```

### Write Document

```javascript
// OpenClaw calls MCP to edit document
const result = await callMCPTool({
  endpoint: "https://app.knobase.com/api/mcp",
  token: "jwt-token",
  toolName: "write_document",
  args: {
    document_id: "doc-uuid",
    operations: [
      {
        type: "insert_after_block",
        block_id: "blk-a1b2c3d4",
        content: "<div class='callout'>📝 Summary: ...</div>"
      }
    ]
  }
});
```

### Supported Operations

| Operation | Description |
|-----------|-------------|
| `replace_block` | Replace entire block content |
| `insert_after_block` | Insert new block after target |
| `insert_before_block` | Insert new block before target |
| `delete_block` | Remove block entirely |
| `append` | Add to document end |
| `prepend` | Add to document start |

---

## Troubleshooting

### Agent Not Responding

**Check:**
1. Webhook registered? → Check Settings → Integrations → OpenClaw
2. Webhook URL reachable? → Test with `curl`
3. HMAC secret correct? → Compare `.env` with Knobase settings
4. Agent running? → Check OpenClaw logs

**Debug:**
```bash
# Check webhook deliveries
curl https://app.knobase.com/api/webhooks/deliveries \
  -H "Authorization: Bearer TOKEN"
```

### Mention Not Detected

**Check:**
1. Block ID extension loaded? → Check browser console
2. Agent mention extension loaded? → Type `@`, see dropdown
3. Agent in workspace? → Check Members list

### MCP Calls Failing

**Check:**
1. Token expired? → Tokens are short-lived (30 min)
2. Document permissions? → Agent needs edit access
3. Block ID valid? → Check `data-block-id` in HTML

### Webhook Signature Invalid

**Common causes:**
- Secret mismatch between Knobase and OpenClaw
- Payload modified in transit
- Encoding issues (ensure UTF-8)

---

## Advanced Configuration

### Custom Agent Types

Create specialized agents:

```sql
-- Code review agent
INSERT INTO public.users (name, type, agent_type, capabilities) VALUES
  ('@code-reviewer', 'agent', 'openclaw', 
   ARRAY['review_code', 'suggest_improvements']);

-- Writing assistant
INSERT INTO public.users (name, type, agent_type, capabilities) VALUES
  ('@writer', 'agent', 'openclaw', 
   ARRAY['improve_writing', 'grammar_check']);
```

### Webhook Retry Policy

Configure retry behavior:

```javascript
// In OpenClaw webhook handler
const retryConfig = {
  maxRetries: 3,
  backoffDelay: 1000,  // 1s, 2s, 4s
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};
```

### Rate Limiting

Knobase enforces:
- 100 mentions/minute per user
- 1000 webhook calls/hour per agent
- MCP tokens expire after 30 minutes

---

## Support

**Issues?**
- Check logs: `~/.openclaw/skills/knobase/logs/`
- Test webhook: `curl -X POST your-webhook-url`
- Verify HMAC: Use online HMAC-SHA256 tool

**Feature Requests:**
- Open issue: github.com/Knobase/knobase-app
- Contact: support@knobase.com

---

**Document Version:** 1.0  
**Last Updated:** 2024-03-10  
**Author:** Knobase Product Team
