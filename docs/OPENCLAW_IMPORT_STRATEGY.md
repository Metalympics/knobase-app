# OpenClaw Import Strategy for Knobase

## Vision
Enable one-click migration from local OpenClaw setup to Knobase Workspace cloud setup. Make Knobase the default knowledge room for OpenClaw agents.

---

## Import Tiers

### Tier 1: Essential (Minimum Viable Clone) - 4 files
**Files:** `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`

**What they control:**
- **SOUL.md**: Personality, tone, values, ethical boundaries (agent's "constitution")
- **IDENTITY.md**: Name, role, emoji, visual description (business card)
- **USER.md**: Human owner's profile - name, timezone, preferences, projects
- **AGENTS.md**: Operating rules, memory workflows, delegation patterns

**Result:** 90% of agent uniqueness transferred

---

### Tier 2: Full Personality - +3 files
**Additional files:** `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md`

**What they add:**
- **TOOLS.md**: Tool usage preferences, CLI patterns, API conventions
- **MEMORY.md**: Curated long-term memory, decisions, preferences
- **HEARTBEAT.md**: Periodic task checklist (proactive behavior)

**Result:** Complete personality + operational knowledge

---

### Tier 3: Complete Workspace - +folders
**Additional:** `memory/` folder, `skills/` folder

**What they add:**
- **memory/**: Daily logs, projects, lessons learned
- **skills/**: Custom skills with SKILL.md files

**Result:** Full historical context + custom capabilities

---

## What to NEVER Import

| File/Foder | Why Exclude |
|------------|-------------|
| `auth-profiles.json` | Contains API keys - security risk |
| `exec-approvals.json` | Local execution permissions |
| `sessions/` | Conversation logs (huge, unnecessary) |
| `logs/` | Runtime logs |
| `openclaw.json` | Runtime config - Knobase provides its own |

---

## User Flow

### Option A: Drag & Drop (Easiest)
```
┌─────────────────────────────────────────────┐
│  Import Your OpenClaw Agent 🤖              │
│                                             │
│  Drag & drop your .openclaw files:          │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │   📁 Drop files here                │    │
│  │      or click to browse             │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  💡 Need help? Run this in terminal:        │
│  zip -j openclaw-export.zip \               │
│    ~/.openclaw/workspace/{SOUL,IDENTITY,    │
│    USER,AGENTS,TOOLS,MEMORY,HEARTBEAT}.md   │
│                                             │
│  [What's imported?] [Privacy & Security]    │
└─────────────────────────────────────────────┘
```

### Option B: CLI Export → Upload
```bash
# One-command export
npx openclaw-knobase export

# Creates: openclaw-export.zip
# Upload this file to Knobase
```

### Option C: Paste Content (Manual)
```
Paste content of each file:
┌─────────────┬─────────────────────────────┐
│ SOUL.md     │ [paste here...      ]       │
│ IDENTITY.md │ [paste here...      ]       │
│ USER.md     │ [paste here...      ]       │
│ ...         │                             │
└─────────────┴─────────────────────────────┘
```

---

## Technical Implementation

### Processing Pipeline

```javascript
1. Receive files (drag-drop or upload)
   ↓
2. Validate file types (.md only)
   ↓
3. Parse each markdown file
   ↓
4. Extract metadata:
   - SOUL.md → agent persona
   - IDENTITY.md → name, avatar, description
   - USER.md → workspace owner info
   - AGENTS.md → operational rules
   ↓
5. Create Knobase agent:
   - Create public.users record (type='agent')
   - Populate agent profile
   - Store imported files as documents
   ↓
6. Generate API key
   ↓
7. Show success + connection instructions
```

### File Storage in Knobase

Imported files become documents in Knobase:
```
Workspace: "OpenClaw Import"
├── 📄 SOUL (imported)
├── 📄 IDENTITY (imported)
├── 📄 USER (imported)
├── 📄 AGENTS (imported)
└── 📄 TOOLS (imported, if provided)
```

This makes them:
- Searchable
- Editable
- Shareable with team
- Version controlled

---

## Marketplace Integration

### Agent Templates from Imports

Users can choose to:
1. **Keep private** - Personal agent only
2. **Share as template** - Publish to Knobase Marketplace
3. **Sell as pack** - Monetize unique agent personalities

### Marketplace Listing
```
┌─────────────────────────────────────────────┐
│  🤖 @ProductivePro (by @chris_lee)          │
│  ⭐ 4.9 · 📥 1,234 installs · 💰 $9         │
│                                             │
│  "A productivity-focused agent that helps   │
│   you ship faster and stay organized"       │
│                                             │
│  Imported from OpenClaw · Tier 2            │
│  Includes: SOUL, IDENTITY, USER, AGENTS,    │
│  TOOLS, MEMORY                              │
│                                             │
│  [Preview] [Install]                        │
└─────────────────────────────────────────────┘
```

---

## Privacy & Security

### User Controls
- ✅ Choose which tier to import (1, 2, or 3)
- ✅ Review each file before import
- ✅ Remove sensitive info before upload
- ✅ Option to encrypt at rest

### What Knobase Does
- ❌ Never stores API keys
- ❌ Never imports auth profiles
- ✅ Validates file safety
- ✅ Sandboxes imported agents

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Import completion rate | >80% |
| Tier 2+ adoption | >50% |
| Marketplace listings from imports | >20% |
| User satisfaction | >4.5/5 |

---

## Implementation Phases

### Phase 1: MVP
- Tier 1 import only (4 files)
- Drag & drop interface
- Basic validation

### Phase 2: Enhanced
- All 3 tiers
- CLI export command
- Marketplace integration

### Phase 3: Advanced
- Auto-sync (keep local + cloud in sync)
- Import analytics
- Template recommendations

---

## Next Steps

1. ✅ Create import page UI
2. ✅ Build file upload handler
3. ✅ Create markdown parser
4. ✅ Build agent creation pipeline
5. ✅ Test with real OpenClaw users
6. 🔄 Launch beta
7. 🔄 Marketplace integration
