# Knobase ↔ OpenClaw Integration - Migration & Spec Documentation

## Table of Contents
1. [Database Migrations](#database-migrations)
2. [System Architecture](#system-architecture)
3. [User Flow & Behavior](#user-flow--behavior)
4. [Implementation Specs](#implementation-specs)

---

## Database Migrations

### Migration 1: User Webhooks Table
**File:** `supabase/migrations/20240310_add_user_webhooks.sql`

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: user_webhooks
-- Purpose: Store webhook URLs for agents/users to receive events
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('mention', 'comment', 'invite', 'task_assigned')),
    webhook_url text NOT NULL,
    secret text NOT NULL, -- For HMAC signature verification
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by user + event type
CREATE INDEX idx_user_webhooks_lookup 
    ON public.user_webhooks(user_id, event_type) 
    WHERE is_active = true;

-- Index for cleanup jobs
CREATE INDEX idx_user_webhooks_created 
    ON public.user_webhooks(created_at);

-- ============================================
-- Table: mentions
-- Purpose: Track all @mentions in documents
-- ============================================
CREATE TABLE IF NOT EXISTS public.mentions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id text NOT NULL, -- References localStorage document ID
    block_id text NOT NULL,    -- TiPTap block ID
    mentioned_user_id uuid NOT NULL REFERENCES public.users(id),
    author_id uuid NOT NULL REFERENCES public.users(id),
    mention_text text NOT NULL,
    context_before text,       -- Text before mention (for context)
    context_after text,        -- Text after mention (for context)
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'read')),
    error text,                -- Error message if dispatch failed
    delivered_at timestamptz,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Index for document mentions
CREATE INDEX idx_mentions_document 
    ON public.mentions(document_id, created_at DESC);

-- Index for user's mentions
CREATE INDEX idx_mentions_user 
    ON public.mentions(mentioned_user_id, status, created_at DESC);

-- Index for author's mentions
CREATE INDEX idx_mentions_author 
    ON public.mentions(author_id, created_at DESC);

-- ============================================
-- Trigger: Update updated_at on user_webhooks
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_user_webhooks_updated_at ON public.user_webhooks;
CREATE TRIGGER trg_user_webhooks_updated_at
    BEFORE UPDATE ON public.user_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies (Enable after migration)
-- ============================================
ALTER TABLE public.user_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own webhooks
CREATE POLICY user_webhooks_own_only ON public.user_webhooks
    FOR ALL
    USING (user_id = auth.uid());

-- Policy: Users can see mentions where they are author or recipient
CREATE POLICY mentions_visible ON public.mentions
    FOR SELECT
    USING (author_id = auth.uid() OR mentioned_user_id = auth.uid());

-- Policy: Users can create mentions
CREATE POLICY mentions_insert ON public.mentions
    FOR INSERT
    WITH CHECK (author_id = auth.uid());

-- Policy: Only system can update mention status (via service role)
CREATE POLICY mentions_update ON public.mentions
    FOR UPDATE
    USING (false)  -- Only via service role
    WITH CHECK (false);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE public.user_webhooks IS 'Stores webhook endpoints for users/agents to receive real-time events';
COMMENT ON TABLE public.mentions IS 'Tracks all @mentions in documents with delivery status';
COMMENT ON COLUMN public.user_webhooks.secret IS 'HMAC secret for webhook signature verification';
COMMENT ON COLUMN public.mentions.block_id IS 'TiPTap block ID for precise document targeting';
```

---

### Migration 2: Document Blocks (Future - Phase 2)
**File:** `supabase/migrations/20240315_add_document_blocks.sql`

```sql
-- ============================================
-- Table: document_blocks
-- Purpose: Block-level storage for collaborative editing (Phase 2)
-- Note: This is for future database migration, not needed for Phase 1
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id text NOT NULL,
    block_id text NOT NULL UNIQUE,
    block_type text NOT NULL, -- paragraph, heading, list, etc.
    position integer NOT NULL,
    attrs jsonb DEFAULT '{}',
    content jsonb NOT NULL,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(document_id, position)
);

CREATE INDEX idx_document_blocks_lookup 
    ON public.document_blocks(document_id, block_id);

-- Version history for audit/undo
CREATE TABLE IF NOT EXISTS public.document_block_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id uuid REFERENCES public.document_blocks(id),
    content jsonb NOT NULL,
    changed_by uuid REFERENCES public.users(id),
    change_summary text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_block_versions_block 
    ON public.document_block_versions(block_id, created_at DESC);
```

---

## System Architecture

### Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         Knobase App                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Editor     │  │   API Routes │  │   MCP Server         │  │
│  │  (TiPTap)    │──│  (/api/...)  │──│  (/api/mcp)          │  │
│  │              │  │              │  │                      │  │
│  │ • Block IDs  │  │ • mentions   │  │ • read_document      │  │
│  │ • @mentions  │  │ • webhooks   │  │ • write_document     │  │
│  │ • Detection  │  │ • register   │  │ • block_operations   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             │                                   │
│                    ┌────────▼────────┐                         │
│                    │   Supabase DB   │                         │
│                    │  • mentions     │                         │
│                    │  • user_webhooks│                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Webhook (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Skill (Node.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Webhook     │  │   MCP Client │  │   Agent Trigger      │  │
│  │  Receiver    │──│  (fetch)     │──│  (OpenClaw Core)     │  │
│  │              │  │              │  │                      │  │
│  │ • Verify HMAC│  │ • call tools │  │ • Process mention    │  │
│  │ • Parse event│  │ • read/write │  │ • Generate response  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flow & Behavior

### Flow 1: Agent Registration (One-time setup)

**Purpose:** Allow agents (like @claw) to register webhook URLs for receiving events

**User Story:**
> As an agent owner, I want to connect my OpenClaw agent to Knobase so it can respond to @mentions

**Steps:**
1. User navigates to Settings → Integrations → OpenClaw
2. Clicks "Connect OpenClaw Agent"
3. Enters their OpenClaw webhook URL (e.g., `https://user-openclaw.ngrok.io/webhook/knobase`)
4. System generates HMAC secret
5. Secret displayed once - user copies to OpenClaw `.env`
6. System saves webhook registration

**Expected Behavior:**
- Webhook URL must be HTTPS
- Secret is never displayed again after initial setup
- User can regenerate secret (invalidates old one)
- User can disable/enable webhook without deleting

---

### Flow 2: Mentioning an Agent

**Purpose:** Trigger agent action via @mention in document

**User Story:**
> As a human user, I want to ask @claw to help with my document by typing @claw

**Steps:**
1. User types `@` in editor
2. Suggestion dropdown appears showing:
   - Humans (regular users)
   - Agents (with 🤖 icon) - @claw, @gpt4, etc.
3. User selects @claw
4. Continues typing: "@claw summarize this section"
5. Hits Enter or clicks outside mention
6. Mention becomes styled (purple background, agent icon)
7. System immediately:
   - Saves mention to database
   - Dispatches webhook to agent
   - Shows in-app notification "Waiting for @claw..."

**Expected Behavior:**
- Mention is detected in real-time
- Block ID is captured for precise targeting
- Context (±200 chars) is included
- Webhook dispatched asynchronously (non-blocking)
- User sees loading indicator while waiting
- If agent responds, document updates automatically

---

### Flow 3: Agent Processing & Response

**Purpose:** Agent receives mention, processes, edits document

**User Story:**
> As @claw, I want to understand the context and make precise edits to help the user

**Steps:**
1. OpenClaw skill receives webhook:
   ```json
   {
     "event": "agent.mentioned",
     "mention": {
       "document_id": "doc-123",
       "block_id": "blk-abc",
       "text": "@claw summarize this section",
       "context": { "before": "...", "after": "..." }
     },
     "mcp": {
       "endpoint": "https://app.knobase.com/api/mcp",
       "token": "short-lived-token"
     }
   }
   ```

2. OpenClaw processes with LLM:
   ```
   User mentioned you: "@claw summarize this section"
   
   Context:
   [200 chars before]
   [CURSOR HERE - mention location]
   [200 chars after]
   
   MCP Endpoint: https://app.knobase.com/api/mcp
   Available tools: read_document, write_document
   
   What would you like to do?
   ```

3. OpenClaw decides to:
   - Call MCP `read_document` to get full context
   - Generate summary
   - Call MCP `write_document` with operation:
     ```json
     {
       "type": "insert_after_block",
       "block_id": "blk-abc",
       "content": "<div class='callout'>📝 Summary: ...</div>"
     }
     ```

4. Document updates in real-time
5. In-app notification: "@claw added a summary"

**Expected Behavior:**
- Agent has full context via MCP
- Can read entire document if needed
- Can target specific blocks for edits
- Can insert, replace, or append content
- Operations are atomic (all succeed or fail together)

---

### Flow 4: Error Handling

**Purpose:** Graceful failure when agent/webhook unavailable

**Scenarios:**

**A. Webhook fails (timeout, 500 error)**
- Mention saved as `status: 'failed'`
- User sees: "@claw is not responding. Retry?"
- Retry button re-dispatches webhook

**B. MCP token expired**
- Agent gets 401 Unauthorized
- Prompts user to re-authenticate
- Mention remains in `pending` state

**C. Invalid block ID**
- MCP returns error: "Block not found"
- Agent falls back to `append` operation
- Adds content at end with note: "(Couldn't locate exact position)"

---

## Implementation Specs

### Component: TiPTap Block ID Extension

**Purpose:** Add stable IDs to every block for targeting

**Location:** `lib/editor/extensions/block-id.ts`

**Requirements:**
- Generate unique ID for each block on creation
- Persist ID in HTML as `data-block-id` attribute
- Preserve IDs during copy/paste (optional)
- Handle ID conflicts gracefully

**Behavior:**
```html
<!-- Before -->
<p>This is a paragraph</p>

<!-- After -->
<p data-block-id="blk-a1b2c3d4">This is a paragraph</p>
```

---

### Component: TiPTap Agent Mention Extension

**Purpose:** Detect and style @agent mentions

**Location:** `lib/editor/extensions/agent-mention.ts`

**Requirements:**
- Extend @tiptap/extension-mention
- Query `public.users` where `type = 'agent'`
- Different styling for agents vs humans
- Store agent `user_id` in mention node

**Behavior:**
- `@` triggers suggestion dropdown
- Agents show with 🤖 icon
- Selected mention shows purple background
- Clicking mention shows agent profile card

---

### Component: Mention API

**Purpose:** Receive and process mention events from editor

**Location:** `app/api/mentions/route.ts`

**Method:** `POST`

**Request Body:**
```typescript
{
  document_id: string;      // localStorage document ID
  block_id: string;         // TiPTap block ID
  mentioned_user_id: uuid;  // Agent's user.id
  mention_text: string;     // Full mention text
  context_before: string;   // 200 chars before
  context_after: string;    // 200 chars after
}
```

**Response:**
```typescript
{
  mention: {
    id: uuid;
    status: 'pending' | 'delivered' | 'failed';
    // ...
  };
  dispatched: boolean;
  error?: string;
}
```

**Behavior:**
1. Validate user is authenticated
2. Save mention to database
3. Lookup agent's webhook URL
4. Dispatch webhook asynchronously
5. Return immediately (don't wait for webhook)
6. Update mention status in background

---

### Component: MCP Block Operations

**Purpose:** Enable precise document editing

**Location:** `app/api/mcp/route.ts` (modify existing)

**New Tool:** `write_document` with operations

**Operations:**

| Operation | Description | Use Case |
|-----------|-------------|----------|
| `replace_block` | Replace entire block content | Rewrite paragraph |
| `insert_after_block` | Insert new block after target | Add summary, callout |
| `insert_before_block` | Insert new block before target | Add heading |
| `replace_selection` | Replace text within block | Edit specific text |
| `append` | Add to document end | Add conclusion |
| `prepend` | Add to document start | Add introduction |
| `delete_block` | Remove block entirely | Delete section |

**Example:**
```json
{
  "document_id": "doc-123",
  "operations": [
    {
      "type": "insert_after_block",
      "block_id": "blk-abc",
      "content": {
        "type": "callout",
        "attrs": { "emoji": "📝" },
        "content": [
          { "type": "text", "text": "AI Summary: ..." }
        ]
      }
    }
  ]
}
```

---

### Component: OpenClaw Skill Webhook Handler

**Purpose:** Receive and process Knobase webhooks

**Location:** `openclaw-knobase-skill/src/webhook-handler.ts`

**Requirements:**
- Express route: `POST /webhook/knobase`
- Verify HMAC signature
- Parse mention event
- Trigger OpenClaw agent
- Handle MCP tool calls

**Environment Variables:**
```bash
KNOBASE_WEBHOOK_SECRET=abc123  # From Knobase settings
KNOBASE_MCP_ENDPOINT=https://app.knobase.com/api/mcp
```

**Behavior:**
1. Receive webhook
2. Verify signature
3. Extract mention data
4. Build prompt for OpenClaw
5. Trigger agent processing
6. Handle agent's MCP calls
7. Return 200 OK

---

## Testing Checklist

### Unit Tests
- [ ] Block ID generation
- [ ] Mention detection regex
- [ ] HMAC signature verification
- [ ] MCP tool execution

### Integration Tests
- [ ] End-to-end @mention flow
- [ ] Webhook dispatch with retries
- [ ] MCP read/write operations
- [ ] Block-level targeting

### E2E Tests
- [ ] User registers webhook
- [ ] User types @claw in document
- [ ] OpenClaw receives and responds
- [ ] Document updates automatically
- [ ] Error scenarios (timeout, invalid block)

---

## Deployment Notes

### Environment Variables
```bash
# Knobase App
NEXT_PUBLIC_APP_URL=https://app.knobase.com
MCP_API_KEY=optional-api-key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenClaw Skill
KNOBASE_WEBHOOK_SECRET=
KNOBASE_MCP_ENDPOINT=
```

### Rollback Plan
- Migration 1: Can drop `user_webhooks` and `mentions` tables
- MCP changes: Revert to simple write_document without operations
- Editor changes: Disable agent mention extension

---

**Document Version:** 1.0  
**Last Updated:** 2024-03-10  
**Author:** Knobase Product Agent  
**Status:** Ready for Implementation
