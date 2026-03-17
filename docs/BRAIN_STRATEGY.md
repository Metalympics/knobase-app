# Knobase as the "Brain" Strategy
## Making Cloud the Source of Truth for OpenClaw Agents

---

## Current State Analysis

### What We Have Built

**Knobase Side:**
- ✅ `agent_files` table linking to pages
- ✅ Sync API (push/pull files)
- ✅ Public API for anonymous access
- ✅ Domain support for docs

**OpenClaw Side:**
- ✅ `openclaw-knobase sync` command
- ✅ Two-way sync (local ↔ cloud)
- ✅ File selection during connect
- ✅ Exports files to local ~/.openclaw/workspace/

**Current Flow:**
```
User writes in Knobase → Saves to pages table
                            ↓
User runs "sync" → Downloads to ~/.openclaw/workspace/
                            ↓
OpenClaw reads from local files
```

**Problem:** Local files are source of truth. Knobase is backup.

---

## Goal: Knobase as the "Brain"

**Target Flow:**
```
User writes in Knobase → Saves to pages table (SOURCE OF TRUTH)
                            ↓
OpenClaw reads DIRECTLY from Knobase API
                            ↓
Optional: Local cache for offline
```

**Key Principle:** OpenClaw doesn't know files are "local" vs "cloud"
It just reads from a provider. Knobase IS the provider.

---

## Strategy Options

### Option 1: Virtual Filesystem Mount (Complex)
**Concept:** Mount Knobase API as a filesystem at ~/.openclaw/workspace/

**Implementation:**
- Use FUSE (macOS/Linux) or WinFsp (Windows)
- Create daemon that intercepts file reads
- Read from Knobase API, cache locally
- Write back to Knobase immediately

**Pros:**
- OpenClaw needs ZERO changes
- Works with any OpenClaw version
- Transparent to user

**Cons:**
- OS-specific complexity
- Performance overhead
- Requires kernel-level integration
- Hard to maintain across platforms

**Verdict:** ❌ Too complex, not maintainable

---

### Option 2: OpenClaw Workspace Provider (Clean)
**Concept:** Teach OpenClaw to load workspace from API, not files

**Implementation:**
- Add "workspace provider" interface to OpenClaw
- Default: FileSystemProvider (current)
- New: KnobaseProvider (cloud)

**In openclaw.json:**
```json
{
  "agents": {
    "defaults": {
      "workspace": "knobase://agent-uuid",
      "workspaceProvider": "knobase"
    }
  }
}
```

**KnobaseProvider would:**
- On startup: Fetch SOUL.md, IDENTITY.md, etc. from API
- Cache in memory (not files)
- On session end: No-op (changes already in Knobase)

**Pros:**
- Clean architecture
- No filesystem hacks
- Works across all platforms
- Can support multiple providers (S3, GitHub, etc.)

**Cons:**
- Requires OpenClaw core changes
- Not in our control
- Long timeline

**Verdict:** ❌ Requires upstream changes

---

### Option 3: Sync-on-Demand (Recommended)
**Concept:** Make sync automatic and invisible. Local files are cache only.

**Implementation:**

**A. Auto-Sync Daemon**
```javascript
// ~/.openclaw/skills/knobase/bin/daemon.js
// Runs continuously in background

// Every 5 seconds:
1. Poll Knobase API for file changes
2. If changes detected:
   - Download new content
   - Write to ~/.openclaw/workspace/
   - Trigger OpenClaw heartbeat to reload

// On local file change:
1. Upload to Knobase immediately
2. Conflict resolution: Knobase wins (cloud is truth)
```

**B. Session Wrapper**
```bash
# New command: openclaw-knobase session

# 1. Pre-sync: Download latest from Knobase
openclaw-knobase sync --direction down --force

# 2. Start OpenClaw with files
openclaw

# 3. Post-sync: Upload any local changes
openclaw-knobase sync --direction up
```

**C. File Watcher**
```javascript
// Watch ~/.openclaw/workspace/
// On any file change:
//   - Debounce 500ms
//   - Upload to Knobase
//   - Mark as "synced"
```

**Pros:**
- Works with current OpenClaw (no changes needed)
- Simple to implement
- Can be optional (users choose)
- Fast (local files still used, just auto-synced)

**Cons:**
- Still uses local files (dual source of truth)
- Potential sync conflicts
- Delay on startup (download files)

**Verdict:** ✅ Best balance of feasibility and "brain" experience

---

### Option 4: HTTP Filesystem Protocol (Hybrid)
**Concept:** Create HTTP protocol that OpenClaw can read

**Implementation:**
- Knobase exposes `/api/files/content?path=SOUL.md`
- Returns file content as text
- Local "proxy" translates file reads to HTTP

**In ~/.openclaw/workspace-knobase/SOUL.md:**
```
# Actually a symlink or stub
# Reading it triggers HTTP fetch
# Content returned from Knobase API
```

**Pros:**
- Works with current OpenClaw
- No sync needed (always fresh)
- Could use Service Worker or proxy

**Cons:**
- Write operations complex
- Offline mode problematic
- High latency (every read is HTTP request)

**Verdict:** ❌ Too slow, complex writes

---

## Recommended Implementation: Option 3 + Enhancements

### Phase 1: Enhanced Auto-Sync (Week 1)

**New Command:** `openclaw-knobase daemon`
```javascript
// bin/daemon.js
// Runs in background

import chokidar from 'chokidar'

const daemon = {
  // Config from .env
  agentId: process.env.AGENT_ID,
  apiKey: process.env.KNOBASE_API_KEY,
  
  // Settings
  syncInterval: 5000,      // Poll Knobase every 5s
  debounceUpload: 500,     // Wait 500ms after local change
  conflictResolution: 'cloud', // Cloud always wins
  
  async start() {
    // 1. Initial sync: Download everything from Knobase
    await this.fullSyncDown()
    
    // 2. Start file watcher
    this.watchLocalFiles()
    
    // 3. Start polling Knobase for changes
    this.pollCloudChanges()
    
    console.log('🧠 Knobase Brain daemon running...')
  },
  
  async fullSyncDown() {
    // Force download all files from Knobase
    // Overwrite local files
    // Called on daemon start
  },
  
  watchLocalFiles() {
    chokidar.watch('~/.openclaw/workspace/*.md')
      .on('change', debounce(async (path) => {
        // Upload to Knobase
        await this.uploadFile(path)
      }, this.debounceUpload))
  },
  
  async pollCloudChanges() {
    setInterval(async () => {
      const remoteFiles = await this.fetchRemoteFiles()
      const localFiles = await this.readLocalFiles()
      
      for (const file of remoteFiles) {
        if (file.updated_at > localFiles[file.name].updated_at) {
          // Cloud is newer, download
          await this.downloadFile(file)
          
          // Notify OpenClaw to reload
          this.notifyOpenClawReload(file.name)
        }
      }
    }, this.syncInterval)
  },
  
  notifyOpenClawReload(filename) {
    // Send signal to OpenClaw
    // Or write to a "reload.trigger" file
    // OpenClaw heartbeat checks this
  }
}

daemon.start()
```

### Phase 2: "Brain Mode" Configuration (Week 2)

**In .env:**
```bash
# Sync mode
KNOBASE_SYNC_MODE=brain  # Options: brain, mirror, manual

# Brain mode settings
KNOBASE_CLOUD_PRIORITY=true  # Cloud always wins conflicts
KNOBASE_AUTO_SYNC=true       # Auto-start daemon
KNOBASE_SYNC_INTERVAL=5000   # Poll every 5s
KNOBASE_OFFLINE_CACHE=true   # Allow offline with cache
```

**New Commands:**
```bash
# Enable brain mode
openclaw-knobase mode brain

# Check sync status
openclaw-knobase status --brain

# Force cloud to override local
openclaw-knobase sync --cloud-wins

# See what's cached locally vs cloud
openclaw-knobase diff
```

### Phase 3: OpenClaw Integration (Week 3)

**Create HEARTBEAT.md integration:**
```markdown
# Knobase Brain Integration

- Check for file updates from Knobase cloud: `node ~/.openclaw/skills/knobase/bin/check-updates.js`
- If updates found, suggest reload: "Knobase files updated. Reload to see changes? [Y/n]"
```

**Auto-reload on change:**
```javascript
// In OpenClaw session
// Watch for changes from daemon
// If SOUL.md changed, offer to reload session
```

### Phase 4: Conflict Resolution UI (Week 4)

**When conflicts detected:**
```
⚠️  Conflict Detected

SOUL.md has changes in both locations:

Cloud (Knobase)          Local (OpenClaw)
─────────────────        ─────────────────
Last edit: 2 min ago     Last edit: 5 min ago
By: chris@knobase.ai     By: local session

[View Cloud] [View Local] [Use Cloud] [Use Local] [Merge]
```

---

## User Experience

### First Time Setup
```bash
# User connects agent
openclaw-knobase connect --device-code XXX

# Prompt appears:
☁️  Enable Brain Mode?
    
    Knobase becomes the source of truth for your agent's personality.
    
    ✓ Auto-sync files between OpenClaw and Knobase
    ✓ Edit files in Knobase, see changes instantly in OpenClaw
    ✓ Cloud always wins conflicts (deterministic)
    ✓ Offline support with smart caching
    
[Enable Brain Mode] [Manual Sync Only]
```

### Daily Usage
```bash
# Daemon auto-starts
🧠 Knobase Brain: Syncing with cloud...
✓ SOUL.md synced (cloud → local)
✓ IDENTITY.md synced (local → cloud)

# User edits in Knobase UI
# Within 5 seconds, OpenClaw sees changes
🧠 Knobase Brain: SOUL.md updated in cloud
? Reload session to see changes? [Y/n] Y
[OpenClaw reloads with new SOUL.md]
```

### Offline Mode
```bash
🧠 Knobase Brain: Offline mode activated
📦 Using cached files (last sync: 2 hours ago)
⚠️  Changes will sync when back online

[User works offline]

🧠 Knobase Brain: Back online
🔄 Syncing 3 changes to cloud...
✓ All changes synced
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ Knobase UI  │    │ OpenClaw    │    │ OpenClaw        │ │
│  │ (Browser)   │    │ Terminal    │    │ Editor          │ │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────┘ │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      KNOBASE CLOUD                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ pages table │    │ agent_files │    │ Public API      │ │
│  │ (SOUL.md)   │    │ (links)     │    │ /api/files      │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   KNOBASE DAEMON                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ File Watcher│    │ Sync Engine │    │ Conflict        │ │
│  │ (chokidar)  │◄──►│ (polling)   │    │ Resolver        │ │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────┘ │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   LOCAL FILESYSTEM                          │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │ ~/.openclaw │    │ HEARTBEAT   │                        │
│  │ /workspace/ │    │ .md         │                        │
│  │ (cache)     │    │ (reload)    │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

1. **Sync Mode: "Brain" vs "Mirror" vs "Manual"**
   - Brain: Cloud is truth, auto-sync
   - Mirror: Bidirectional, conflict prompts
   - Manual: User runs sync command

2. **Conflict Resolution: Cloud Wins**
   - Deterministic (no ambiguity)
   - Matches "brain" concept
   - Can be overridden with `--force-local`

3. **Polling vs WebSocket**
   - Polling: Simpler, works everywhere
   - WebSocket: Real-time, requires persistent connection
   - **Decision:** Start with polling (5s), add WebSocket later

4. **Offline Strategy**
   - Cache last known files
   - Queue changes
   - Sync on reconnect
   - Show "offline mode" indicator

---

## Success Metrics

- [ ] User can edit SOUL.md in Knobase, see in OpenClaw within 5 seconds
- [ ] User can work offline, syncs automatically when back
- [ ] Zero data loss (cloud backup always available)
- [ ] Performance: Sync doesn't slow down OpenClaw
- [ ] Adoption: 80% of users enable Brain Mode

---

## Next Steps

1. ✅ Decision: Use Option 3 (Sync-on-Demand with daemon)
2. 🔄 Implement: `openclaw-knobase daemon` command
3. 🔄 Integrate: HEARTBEAT.md reload trigger
4. 🔄 Test: Brain mode with power users
5. 🔄 Iterate: Add WebSocket for real-time

---

**The Vision:**
> Knobase is the brain. OpenClaw is the body.
> The brain stores the personality.
> The body acts on it.
> They're always in sync.

**Ready to build the Brain Mode?**
