# Centralized API Key Vault Design
## Secure Credential Management for Knobase Agents

---

## Executive Summary

Build a secure API key vault within Knobase that allows agents to access credentials without manual .env configuration. Supports both centralized (shared) and independent (agent-specific) key management with proper access controls.

---

## Use Cases

### 1. Centralized API Keys (Shared)
```
OpenAI API Key
├── Stored once in workspace vault
├── All agents can access
└── Rotate once, updates everywhere
```

### 2. Agent-Specific Keys (Independent)
```
Personal Notion Token
├── Stored per agent
├── Only that agent can access
└ Other agents see "Key not available"
```

### 3. Scoped Keys (Hybrid)
```
AWS Credentials
├── Stored in vault
├── Scoped to: "dev", "staging", "prod"
├── Agent asks for specific scope
└── Returns appropriate credentials
```

---

## Security Architecture

### Encryption at Rest
```
┌─────────────────────────────────────────┐
│           PLAINTEXT API KEY             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      ENCRYPT with WORKSPACE KEY         │
│  (AES-256-GCM, unique per workspace)    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         STORED IN DATABASE              │
│  api_keys.encrypted_value (binary)      │
└─────────────────────────────────────────┘
```

### Workspace Key Derivation
```
MASTER_SECRET (environment variable, never stored)
    ↓
HKDF-SHA256
    ↓
WORKSPACE_KEY (per-workspace, derived from workspace_id)
```

### Encryption Flow
```typescript
// Encrypt
const workspaceKey = deriveKey(workspaceId, MASTER_SECRET);
const encrypted = crypto.encryptAES256GCM(plaintext, workspaceKey);
// Store: encrypted.ciphertext + encrypted.iv + encrypted.tag

// Decrypt
const workspaceKey = deriveKey(workspaceId, MASTER_SECRET);
const plaintext = crypto.decryptAES256GCM(encrypted, workspaceKey);
```

---

## Database Schema

### Table: `api_keys` (NEW)

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Key identification (NOT encrypted)
  name TEXT NOT NULL,                          -- "OpenAI Production Key"
  provider TEXT NOT NULL,                      -- "openai", "anthropic", "aws"
  scope TEXT DEFAULT 'global',                -- "global", "agent-{id}", "dev"
  
  -- Encrypted data
  encrypted_value BYTEA NOT NULL,             -- AES-256-GCM encrypted
  iv BYTEA NOT NULL,                          -- Initialization vector
  tag BYTEA NOT NULL,                         -- Auth tag
  
  -- Access control
  access_level TEXT DEFAULT 'private',        -- "private", "shared", "public"
  allowed_agents UUID[],                      -- NULL = all agents, [] = none
  
  -- Metadata
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_scope CHECK (scope IN ('global', 'shared', 'agent-specific')),
  CONSTRAINT valid_access_level CHECK (access_level IN ('private', 'shared', 'public'))
);

-- Indexes
CREATE INDEX idx_api_keys_school ON api_keys(school_id);
CREATE INDEX idx_api_keys_scope ON api_keys(school_id, scope);
CREATE INDEX idx_api_keys_provider ON api_keys(school_id, provider);
```

### Table: `api_key_usage_logs` (Audit)

```sql
CREATE TABLE api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  agent_id UUID REFERENCES users(id),          -- NULL = system access
  
  -- Request context
  action TEXT NOT NULL,                        -- "read", "decrypt", "rotate"
  ip_address INET,
  user_agent TEXT,
  
  -- Success/failure
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT now()
);

-- Auto-cleanup old logs (90 days)
CREATE INDEX idx_api_key_logs_key ON api_key_usage_logs(api_key_id, created_at);
```

---

## API Design

### Endpoints

#### 1. Store API Key
```typescript
POST /api/vault/keys
Authorization: Bearer {workspace_admin_token}

Body: {
  name: "OpenAI Production",
  provider: "openai",
  key: "sk-...",
  scope: "global",           // or "agent-{agentId}"
  accessLevel: "shared",     // "private" | "shared" | "public"
  allowedAgents?: ["uuid1", "uuid2"], // if accessLevel = "shared"
  expiresAt?: "2024-12-31"
}

Response: {
  id: "key-uuid",
  name: "OpenAI Production",
  provider: "openai",
  scope: "global",
  createdAt: "...",
  // NOTE: Key itself is NEVER returned
}
```

#### 2. List Available Keys (for agent)
```typescript
GET /api/vault/keys?agentId={agent_uuid}
Authorization: Bearer {agent_api_key}

Response: {
  keys: [
    {
      id: "key-uuid",
      name: "OpenAI Production",
      provider: "openai",
      scope: "global",
      accessLevel: "shared",
      // Can request decryption, but don't get key yet
    }
  ]
}
```

#### 3. Decrypt/Use API Key
```typescript
POST /api/vault/keys/{key_id}/decrypt
Authorization: Bearer {agent_api_key}

Body: {
  agentId: "agent-uuid",
  purpose: "chat_completion",  // Audit trail
  requestId: "req-uuid"        // For correlation
}

Response: {
  key: "sk-...",               // Decrypted, one-time use
  expiresIn: 60                // Seconds until invalidation
}

// NOTE: Key is logged but not stored in response cache
// Client must use within 60 seconds
```

#### 4. Rotate Key
```typescript
POST /api/vault/keys/{key_id}/rotate
Authorization: Bearer {workspace_admin_token}

Body: {
  newKey: "sk-new...",
  reason: "Quarterly rotation"
}

Response: {
  id: "key-uuid",
  rotatedAt: "...",
  previousVersion: 3
}

// Old key still decryptable for 24h (grace period)
// Then permanently deleted
```

#### 5. Revoke Key
```typescript
DELETE /api/vault/keys/{key_id}
Authorization: Bearer {workspace_admin_token}

Response: {
  id: "key-uuid",
  revokedAt: "...",
  message: "Key revoked, agents will lose access immediately"
}
```

---

## Access Control Matrix

| Role | Store Key | List Keys | Decrypt Key | Rotate | Revoke |
|------|-----------|-----------|-------------|--------|--------|
| **Workspace Admin** | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| **Workspace Editor** | ✅ Own | ✅ Shared | ✅ Shared | ❌ | ❌ |
| **Agent (own key)** | ❌ | ✅ Own | ✅ Own | ❌ | ❌ |
| **Agent (shared key)** | ❌ | ✅ Visible | ✅ With approval | ❌ | ❌ |
| **External API** | ❌ | ❌ | ✅ With scope | ❌ | ❌ |

---

## Integration with OpenClaw

### CLI Changes

#### 1. Request Key from Vault
```bash
$ openclaw-knobase vault list
Available API Keys:
  ✓ openai (OpenAI Production)
  ✓ anthropic (Claude API)
  ✗ aws (AWS - access denied)

$ openclaw-knobase vault use openai
🔓 Decrypted OpenAI key (expires in 60s)
Key available in environment: OPENAI_API_KEY

# Now agent can use it:
$ echo $OPENAI_API_KEY
sk-...
```

#### 2. Auto-Inject on Startup
```bash
# In daemon or setup:
openclaw-knobase vault inject --all

# This:
# 1. Lists all keys agent has access to
# 2. Decrypts each one (60s expiry)
# 3. Sets environment variables
# 4. OpenClaw inherits these env vars

$ openclaw
# Inside OpenClaw:
> process.env.OPENAI_API_KEY  // Available!
```

#### 3. Runtime Key Refresh
```typescript
// When key expires (after 60s), daemon auto-refreshes:
setInterval(async () => {
  const keys = await fetchAvailableKeys();
  for (const key of keys) {
    const decrypted = await decryptKey(key.id);
    process.env[key.provider.toUpperCase() + '_API_KEY'] = decrypted.key;
  }
}, 50000); // Refresh every 50s (before 60s expiry)
```

---

## Frontend UI

### Settings → API Keys Page

```
┌─────────────────────────────────────────────────────────┐
│  🔐 API Key Vault                              [+ Add]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Global Keys (Shared with all agents)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  OpenAI Production   shared   2 days ago      │   │
│  │    Last used: 5 min ago by @openclaw-agent     │   │
│  │    [Rotate] [Revoke] [View Logs]               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Anthropic API       shared   1 week ago      │   │
│  │    Last used: 2 hours ago                      │   │
│  │    [Rotate] [Revoke] [View Logs]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Private Keys (Agent-specific)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔴 Personal Notion     private  @dev-agent      │   │
│  │    Only accessible by @dev-agent               │   │
│  │    [Edit] [Delete]                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Audit Logs                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Today, 14:30 - @openclaw-agent used OpenAI key │   │
│  │ Today, 12:15 - Admin rotated Anthropic key     │   │
│  │ Yesterday, 09:00 - @dev-agent accessed Notion  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Add Key Modal

```
┌─────────────────────────────────────────────────────────┐
│  Add API Key                                     [✕]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Key Name                                               │
│  [OpenAI Production                          ]          │
│                                                         │
│  Provider                                               │
│  [▼ OpenAI                                   ]          │
│    Anthropic                                           │
│    AWS                                                 │
│    Custom                                              │
│                                                         │
│  API Key Value                                          │
│  [••••••••••••••••••••••••••••••••••••••••] 👁️        │
│                                                         │
│  Scope                                                  │
│  (•) All agents in workspace (shared)                  │
│  ( ) Specific agents: [▼ Select agents       ]          │
│  ( ) Only me (private)                                 │
│                                                         │
│  Expiration (optional)                                  │
│  [▼ Never                                    ]          │
│                                                         │
│         [Cancel]  [💾 Securely Store Key]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Security Best Practices

### 1. Never Log Plaintext Keys
```typescript
// ❌ BAD
logger.info(`Using API key: ${apiKey}`);

// ✅ GOOD
logger.info(`Using API key: ${maskKey(apiKey)}`);
// Output: Using API key: sk-••••••••••••••••
```

### 2. Rate Limit Decryption
```typescript
// Max 10 decryptions per minute per agent
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.agentId
});
```

### 3. IP Whitelisting (optional)
```typescript
// Only allow decryption from known IPs
if (key.allowedIPs && !key.allowedIPs.includes(clientIP)) {
  throw new UnauthorizedError('IP not whitelisted');
}
```

### 4. Key Rotation Reminders
```typescript
// Email admin if key is >90 days old
if (daysSince(key.createdAt) > 90) {
  await sendRotationReminder(key.createdBy);
}
```

---

## Implementation Phases

### Phase 1: Core Vault (Week 1)
- [ ] Database migration (`api_keys` table)
- [ ] Encryption/decryption utilities
- [ ] POST /api/vault/keys (store)
- [ ] POST /api/vault/keys/:id/decrypt (use)

### Phase 2: UI & Access Control (Week 2)
- [ ] Settings → API Keys page
- [ ] Add key modal
- [ ] List keys with permissions
- [ ] Audit logs view

### Phase 3: CLI Integration (Week 3)
- [ ] `openclaw-knobase vault list`
- [ ] `openclaw-knobase vault use <key>`
- [ ] `openclaw-knobase vault inject --all`
- [ ] Auto-refresh in daemon

### Phase 4: Advanced Features (Week 4)
- [ ] Key rotation with grace period
- [ ] Scoped keys (dev/staging/prod)
- [ ] IP whitelisting
- [ ] External secret providers (AWS Secrets Manager, HashiCorp Vault)

---

## Questions for You

1. **Who can store keys?** Only admins, or any workspace member?
2. **Key rotation:** Auto-rotate after X days, or manual only?
3. **External vaults:** Integrate with AWS Secrets Manager, HashiCorp Vault?
4. **Cost tracking:** Track API usage per key for billing?
5. **Emergency access:** "Break glass" procedure for lost keys?

---

## Summary

**The Vision:**
> No more .env files. No more "API_KEY not found" errors. 
> Keys live securely in Knobase. Agents request them on-demand.
> Rotate once, update everywhere. Audit everything.

**Key Innovation:**
- Centralized but scoped (global vs agent-specific)
- Secure but accessible (encrypted, but agents can request)
- Auditable (who used what key when)

**Ready to build the API Key Vault?**
