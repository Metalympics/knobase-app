# API Key Vault - Final Design
## Environment Variable Based with Descriptions

---

## Database Schema

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- What agents see
  env_name TEXT NOT NULL,           -- "OPENAI_API_KEY"
  description TEXT,                 -- "OpenAI GPT-4 API for chat completion"
  
  -- The secret
  encrypted_value TEXT NOT NULL,    -- AES-256 encrypted "sk-..."
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  last_used_at TIMESTAMP,
  
  -- Unique per workspace
  UNIQUE(school_id, env_name)
);

-- For audit
CREATE TABLE api_key_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  agent_id UUID REFERENCES users(id),
  accessed_at TIMESTAMP DEFAULT now(),
  ip_address INET
);
```

---

## Admin UI

### Add API Key
```
┌─────────────────────────────────────────┐
│  Add API Key                            │
├─────────────────────────────────────────┤
│                                         │
│  Environment Variable Name              │
│  [OPENAI_API_KEY                      ] │
│  ↑ This is how agents will access it    │
│                                         │
│  Description (for agents)               │
│  [OpenAI GPT-4 API for text generation ] │
│  ↑ Agents see this to understand usage  │
│                                         │
│  API Key Value                          │
│  [sk-********************************] │
│                                         │
│         [Cancel]  [Save Securely]       │
│                                         │
└─────────────────────────────────────────┘
```

### List API Keys
```
Settings → API Keys

┌─────────────────────────────────────────┐
│  🔐 API Keys                   [+ Add]  │
├─────────────────────────────────────────┤
│                                         │
│  OPENAI_API_KEY                     [🗑️]│
│  OpenAI GPT-4 API for text generation   │
│  Added by chris • Used 2 min ago        │
│                                         │
│  ANTHROPIC_API_KEY                  [🗑️]│
│  Claude API for long context tasks      │
│  Added by chris • Used 1 hour ago       │
│                                         │
│  NOTION_TOKEN                       [🗑️]│
│  Notion integration for document export │
│  Added by chris • Never used            │
│                                         │
└─────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Agent Lists Available Keys (Metadata Only)
```typescript
GET /api/keys
Authorization: Bearer {agent_api_key}

Response: {
  keys: [
    {
      id: "uuid",
      env_name: "OPENAI_API_KEY",
      description: "OpenAI GPT-4 API for text generation",
      available: true
      // NOTE: No value here!
    },
    {
      id: "uuid", 
      env_name: "ANTHROPIC_API_KEY",
      description: "Claude API for long context tasks",
      available: true
    }
  ]
}
```

**Use case:** Agent sees what tools are available without getting secrets.

---

### 2. Agent Gets Key Value (Decrypt)
```typescript
GET /api/keys/:id/value
Authorization: Bearer {agent_api_key}

Response: {
  env_name: "OPENAI_API_KEY",
  description: "OpenAI GPT-4 API for text generation", 
  value: "sk-...",
  expires_in: 300  // 5 minutes
}
```

**Use case:** Agent needs actual key to make API call.

---

### 3. MCP Tool - List Available APIs
```typescript
// This is an MCP tool that agents can call

mcp_tool: "knobase_list_apis"
description: "List all available API keys with their descriptions"

Response: {
  apis: [
    {
      env_name: "OPENAI_API_KEY",
      description: "OpenAI GPT-4 API for text generation"
    },
    {
      env_name: "ANTHROPIC_API_KEY", 
      description: "Claude API for long context tasks"
    }
  ]
}
```

**Use case:** Agent asks "What APIs do I have access to?"

---

### 4. MCP Tool - Get API Key
```typescript
mcp_tool: "knobase_get_api_key"
description: "Get an API key by environment variable name"

Parameters: {
  env_name: "OPENAI_API_KEY",  // Required
  purpose: "chat_completion"   // For audit log
}

Response: {
  env_name: "OPENAI_API_KEY",
  description: "OpenAI GPT-4 API for text generation",
  value: "sk-...",  // Decrypted!
  expires_in: 300
}
```

**Use case:** Agent needs to call OpenAI API.

---

## Agent Experience

### Scenario 1: Agent Explores Available Tools
```
User: @openclaw What APIs do you have access to?

Agent: [Calls MCP tool knobase_list_apis]

I have access to these APIs:

🔑 OPENAI_API_KEY
   OpenAI GPT-4 API for text generation

🔑 ANTHROPIC_API_KEY
   Claude API for long context tasks

🔑 NOTION_TOKEN
   Notion integration for document export
```

### Scenario 2: Agent Uses API Key
```
User: @openclaw Write a poem using GPT-4

Agent: [Calls MCP tool knobase_get_api_key]
        [Parameter: env_name="OPENAI_API_KEY"]
        
[Response includes:
  env_name: "OPENAI_API_KEY",
  description: "OpenAI GPT-4 API for text generation",
  value: "sk-..."]

[Agent uses key to call OpenAI API]

Here's a poem...
```

### Scenario 3: Daemon Auto-Provides Keys
```bash
# Daemon runs in background
# Fetches all keys on startup

$ openclaw-knobase daemon start

🔐 Fetched API keys from Knobase vault:
  • OPENAI_API_KEY - OpenAI GPT-4 API
  • ANTHROPIC_API_KEY - Claude API  
  • NOTION_TOKEN - Notion integration

# Now OpenClaw environment has:
process.env.OPENAI_API_KEY = "sk-..."
process.env.ANTHROPIC_API_KEY = "sk-..."

# Agent can use without requesting!
```

---

## OpenClaw Integration

### Option A: Daemon Auto-Inject (Recommended)
```javascript
// daemon.js

async function fetchAndInjectKeys() {
  // 1. Get metadata (what keys exist)
  const keys = await fetch('/api/keys');
  
  // 2. Get values for each
  for (const key of keys) {
    const details = await fetch(`/api/keys/${key.id}/value`);
    
    // 3. Inject into environment
    process.env[key.env_name] = details.value;
    
    // 4. Also store description for reference
    process.env[`${key.env_name}_DESCRIPTION`] = details.description;
  }
}

// Run every 4 minutes
setInterval(fetchAndInjectKeys, 4 * 60 * 1000);
```

**Result:**
```bash
$ env | grep OPENAI
OPENAI_API_KEY=sk-...
OPENAI_API_KEY_DESCRIPTION=OpenAI GPT-4 API for text generation
```

---

### Option B: On-Demand MCP Tools
```javascript
// MCP server in OpenClaw skill

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "knobase_list_apis") {
    const keys = await fetchKnobaseKeys();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          apis: keys.map(k => ({
            env_name: k.env_name,
            description: k.description
          }))
        })
      }]
    };
  }
  
  if (request.params.name === "knobase_get_api_key") {
    const { env_name, purpose } = request.params.arguments;
    const key = await fetchKeyValue(env_name);
    
    // Log access for audit
    await logKeyAccess(env_name, agentId, purpose);
    
    return {
      content: [{
        type: "text", 
        text: JSON.stringify({
          env_name: key.env_name,
          description: key.description,
          value: key.value,
          expires_in: 300
        })
      }]
    };
  }
});
```

---

## Security

### Encryption
```javascript
// Master secret from environment
const MASTER_SECRET = process.env.KNOBASE_MASTER_SECRET;

// Derive workspace key
const workspaceKey = crypto.scryptSync(
  MASTER_SECRET,
  workspaceId,
  32  // 256 bits
);

// Encrypt
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', workspaceKey, iv);
const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
const tag = cipher.getAuthTag();

// Store: encrypted + iv + tag
```

### Access Control
- **Store key:** Admin only
- **List keys (metadata):** Any agent in workspace
- **Get key value:** Any agent in workspace
- **Delete key:** Admin or creator only

### Audit
Every `GET /api/keys/:id/value` is logged:
- Who accessed it
- When
- From what IP
- Which agent

---

## Summary

| Feature | Implementation |
|---------|----------------|
| **Storage** | `env_name` + `description` + encrypted `value` |
| **Agent Discovery** | List API shows env_name + description (no value) |
| **Agent Usage** | Get value endpoint returns all 3 fields |
| **MCP Tools** | `knobase_list_apis`, `knobase_get_api_key` |
| **Auto-inject** | Daemon fetches and sets env vars |

**Result:**
- Agent knows what APIs are available (via description)
- Agent can request key when needed
- Or daemon auto-injects for seamless use
- Everything audited and secure

**Ready to build?**
