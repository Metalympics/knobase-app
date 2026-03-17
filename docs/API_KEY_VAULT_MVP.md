# API Key Vault MVP
## Simple, Secure, Agent-Focused

---

## Simplified Architecture

### Core Use Case
> Agents need API keys to call external services (OpenAI, etc.)
> Store them securely in Knobase, agents fetch on demand
> No manual .env files

---

## MVP Features Only

### 1. Simple Storage
- Admins add keys via Knobase UI
- Keys encrypted at rest (AES-256)
- One key per provider per workspace

### 2. Agent Access
- Agents request keys via API
- Keys returned with 5-minute expiry
- Agents use immediately, no local storage

### 3. Basic Audit
- Log who requested which key when
- View in admin dashboard

### 4. No Complex Features (for MVP)
❌ No auto-rotation
❌ No external vaults
❌ No cost tracking
❌ No scoped keys (dev/prod)
❌ No agent-specific keys

---

## User Experience Flow

### For Admin (Adding Keys)

```
Settings → API Keys

┌─────────────────────────────────────────┐
│  🔐 API Keys                   [+ Add]  │
├─────────────────────────────────────────┤
│                                         │
│  OpenAI API Key              [Delete]   │
│  Added by: chris@example.com            │
│  Last used: 2 minutes ago               │
│                                         │
│  [+ Add New Key]                        │
│                                         │
└─────────────────────────────────────────┘

Click "+ Add":

┌─────────────────────────────────────────┐
│  Add API Key                            │
├─────────────────────────────────────────┤
│                                         │
│  Provider                               │
│  [▼ OpenAI                          ]   │
│                                         │
│  API Key                                │
│  [sk-********************************]  │
│                                         │
│         [Cancel]  [Save Securely]       │
│                                         │
└─────────────────────────────────────────┘
```

**Simple. No scope selection. No expiration. Just store it.**

---

### For Agent (Using Keys)

**Option A: Auto-Inject on Connect**
```bash
$ openclaw-knobase connect --device-code XXX

✓ Connected to Knobase
✓ Fetched API keys from vault:
  • OPENAI_API_KEY (expires in 5 min)
  • ANTHROPIC_API_KEY (expires in 5 min)

# Keys available in OpenClaw environment
# Auto-refreshes every 4 minutes
```

**Option B: On-Demand Request**
```bash
# Inside OpenClaw session
@openclaw I need to use GPT-4

[OpenClaw internally calls Knobase API]
[Gets OPENAI_API_KEY, uses it, discards it]

Here's your GPT-4 response...
```

---

## Simplified Database

```sql
-- Just two tables

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Simple identification
  provider TEXT NOT NULL,           -- "openai", "anthropic"
  encrypted_key TEXT NOT NULL,      -- AES encrypted
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  last_used_at TIMESTAMP
);

CREATE TABLE api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  agent_id UUID REFERENCES users(id),
  action TEXT,                      -- "decrypt"
  created_at TIMESTAMP DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_api_keys_school_provider ON api_keys(school_id, provider);
```

**No scope. No access levels. No allowed_agents array. Simple.**

---

## Simplified API

### Store Key (Admin only)
```typescript
POST /api/keys
Authorization: Admin

Body: {
  provider: "openai",
  key: "sk-..."
}

Response: {
  id: "uuid",
  provider: "openai",
  message: "Key stored securely"
}
```

### Get Key (Agent only)
```typescript
GET /api/keys/:provider
Authorization: Agent API Key

Response: {
  key: "sk-...",
  expiresAt: "2024-03-17T14:25:00Z"  // 5 min from now
}
```

### List Available Keys (Agent)
```typescript
GET /api/keys
Authorization: Agent API Key

Response: {
  keys: [
    { provider: "openai", available: true },
    { provider: "anthropic", available: true }
  ]
}
```

### Delete Key (Admin)
```typescript
DELETE /api/keys/:provider
Authorization: Admin

Response: { message: "Key deleted" }
```

---

## OpenClaw Integration

### Daemon Enhancement
```javascript
// In daemon.js, add key refresh loop

async function refreshApiKeys() {
  // Every 4 minutes
  const keys = await fetch(`${KNOBASE_API}/api/keys`, {
    headers: { 'Authorization': `Bearer ${AGENT_API_KEY}` }
  });
  
  for (const key of keys) {
    // Set environment variable
    process.env[`${key.provider.toUpperCase()}_API_KEY`] = key.key;
  }
  
  // OpenClaw inherits these env vars
}

setInterval(refreshApiKeys, 4 * 60 * 1000);  // 4 minutes
```

### CLI Command
```bash
# Check what keys are available
$ openclaw-knobase keys
Available API keys:
  ✓ openai (expires in 3 minutes)
  ✓ anthropic (expires in 3 minutes)

# Force refresh
$ openclaw-knobase keys refresh
✓ Refreshed all keys from vault
```

---

## Security (Keep it Simple)

### Encryption
```javascript
// Simple AES-256 encryption
const crypto = require('crypto');

function encrypt(key, masterSecret) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    deriveKey(masterSecret),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted, iv, tag };
}
```

### Access Control
- **Store:** Admins only
- **Read:** Agents in same workspace
- **No complex roles:** You're either admin or agent

---

## UI Mockup (Final)

### Admin View
```
Settings → API Keys
┌─────────────────────────────────────────┐
│  🔐 API Keys                   [+ Add]  │
├─────────────────────────────────────────┤
│                                         │
│  OpenAI                                   │
│  Added by chris • Used 2 min ago      [🗑️]│
│                                         │
│  Anthropic                                │
│  Added by chris • Used 1 hour ago     [🗑️]│
│                                         │
└─────────────────────────────────────────┘

Click [+ Add]:

Provider: [▼ OpenAI    ]
API Key:  [•••••••••••]

          [Cancel] [Save]
```

### Agent View (Read-Only)
```
Settings → API Keys
┌─────────────────────────────────────────┐
│  🔐 API Keys (Read-Only)                │
├─────────────────────────────────────────┤
│                                         │
│  Available keys:                        │
│  ✓ OpenAI                               │
│  ✓ Anthropic                            │
│                                         │
│  Keys are automatically injected        │
│  into your OpenClaw environment.        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation (1 Week)

### Day 1-2: Backend
- [ ] Database migration (2 simple tables)
- [ ] Encrypt/decrypt utilities
- [ ] POST /api/keys (store)
- [ ] GET /api/keys/:provider (retrieve)

### Day 3: Admin UI
- [ ] Settings → API Keys page
- [ ] Add key form
- [ ] List keys with delete

### Day 4: Agent Integration
- [ ] Daemon key refresh loop
- [ ] CLI `keys` command
- [ ] Auto-inject on connect

### Day 5: Polish
- [ ] Error handling
- [ ] Audit logs view
- [ ] Documentation

---

## Success Criteria

- [ ] Admin can add OpenAI key in 3 clicks
- [ ] Agent can use key without manual .env
- [ ] Key refreshes automatically (no expiry errors)
- [ ] Admin can see who used keys when
- [ ] Keys never stored in plaintext

---

## Future Enhancements (Post-MVP)

When you're ready:
- Agent-specific keys
- Scoped keys (dev/prod)
- Auto-rotation
- External vault integration
- Cost tracking

---

## Summary

**MVP = Simple + Working**

| Feature | MVP? | Future? |
|---------|------|---------|
| Store keys | ✅ Yes | - |
| Encrypt at rest | ✅ Yes | - |
| Agents fetch keys | ✅ Yes | - |
| Auto-refresh | ✅ Yes | - |
| Audit logs | ✅ Basic | ✅ Full |
| Scoped keys | ❌ No | ✅ Yes |
| Auto-rotation | ❌ No | ✅ Yes |
| External vaults | ❌ No | ✅ Yes |

**This gives you a working vault in 1 week.**

**Ready to build MVP?**
