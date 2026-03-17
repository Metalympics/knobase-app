# API Key Vault - Simple Clarification

---

## What I Mean By Scoped Keys (NOT in MVP)

**Scoped keys = Different keys for different environments**

Example:
- OpenAI Key (dev) - for testing, cheap model
- OpenAI Key (prod) - for production, expensive model

**We're NOT doing this for MVP.** Just one key per provider.

---

## What I Mean By Auto Refresh

**Problem:**
- Key expires in 5 minutes
- Agent using it for API call
- Suddenly key expires → API call fails

**Auto Refresh Solution:**
```javascript
// Daemon automatically gets new key every 4 minutes
// So key never actually expires while agent is running

setInterval(async () => {
  const freshKey = await fetchKeyFromKnobase('openai');
  process.env.OPENAI_API_KEY = freshKey;  // Always fresh!
}, 4 * 60 * 1000);  // Every 4 minutes
```

**Result:** Agent never sees expired key. Always works.

---

## No Redundant API Reference Names

**Rule: One key per provider name**

❌ NOT ALLOWED:
- OpenAI Key #1
- OpenAI Key #2
- My OpenAI

✅ ALLOWED:
- openai (just one)

**Why:** Simple. No confusion which key to use.

---

## Simplified Even More

### Database (Super Simple)
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  school_id UUID,
  provider TEXT UNIQUE,     -- "openai" - only one allowed!
  encrypted_key TEXT,       -- the actual API key (encrypted)
  created_by UUID,
  created_at TIMESTAMP
);
```

Notice `provider TEXT UNIQUE` - prevents duplicates!

### API (3 Endpoints)

**Store key (admin):**
```
POST /api/keys
Body: { provider: "openai", key: "sk-..." }
```

**Get key (agent):**
```
GET /api/keys/openai
Returns: { key: "sk-...", expiresIn: 300 }
```

**List keys (agent):**
```
GET /api/keys
Returns: ["openai", "anthropic"]
```

### UI (Super Simple)

```
Settings → API Keys

OpenAI          [🗑️ Delete]
  Added by chris

Anthropic       [🗑️ Delete]  
  Added by chris

[+ Add Key]

---

Add Key:
Provider: [▼ OpenAI    ]
Key:      [sk-**********]
          [Save]
```

Can't add "OpenAI" twice because UNIQUE constraint!

---

## Auto-Refresh Flow

```
Agent starts
    ↓
Daemon fetches all keys from Knobase
    ↓
Sets environment variables
    OPENAI_API_KEY=sk-...
    ANTHROPIC_API_KEY=sk-...
    ↓
Every 4 minutes:
    Fetch fresh keys (expires in 5 min)
    Update environment variables
    ↓
Agent always has valid key!
```

---

## Summary

| Concept | Simple Meaning |
|---------|----------------|
| **Scoped keys** | Multiple keys per provider (dev/prod). **NOT in MVP.** |
| **Auto refresh** | Daemon gets new key every 4 min so it never expires |
| **No redundant names** | `provider` column is UNIQUE - one key per provider |

**That's it. Simple.**
