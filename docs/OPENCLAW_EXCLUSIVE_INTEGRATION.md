# Making OpenClaw Exclusive to Knobase
## Strategy for Deep Integration

---

## The Vision

> OpenClaw doesn't know about local files. 
> It only knows about Knobase.
> Every write goes to Knobase.
> Every read comes from Knobase.
> Knobase IS the workspace.

---

## Understanding OpenClaw's File System

### Current Architecture
```
OpenClaw Core
    ↓
Reads ~/.openclaw/workspace/SOUL.md
    ↓
Injects into system prompt
```

### File Resolution Order
1. `~/.openclaw/workspace/SOUL.md` (primary)
2. `~/.openclaw/workspace/IDENTITY.md`
3. `~/.openclaw/workspace/USER.md`
4. ... etc

### When OpenClaw Writes
- **Never writes** to SOUL.md, IDENTITY.md, etc. (these are user-managed)
- **Writes to:** `memory/YYYY-MM-DD.md` (daily logs)
- **Writes to:** `MEMORY.md` (curated memory)
- **Writes to:** `TOOLS.md` (user can edit, but agent appends)

---

## Strategy: Virtual Workspace Mount

### Concept
Replace `~/.openclaw/workspace/` with a **virtual filesystem** that:
- Reads/writes to Knobase API instead of disk
- Presents the same file interface to OpenClaw
- Caches locally for performance, but syncs immediately

### Implementation Options

#### Option 1: FUSE Filesystem (Linux/Mac)
**Best for:** Technical users, maximum transparency

```bash
# Mount Knobase as filesystem
openclaw-knobase mount ~/my-workspace

# Now ~/.openclaw/workspace is a FUSE mount
# Every file read/write goes to Knobase API
```

**Implementation:**
```javascript
// fuse-knobase.js
const fuse = require('fuse-native')

const ops = {
  read: async (path, fd, buf, len, pos, cb) => {
    // 1. Fetch file from Knobase API
    const content = await fetchFromKnobase(path)
    // 2. Return content
    cb(content.length)
  },
  
  write: async (path, fd, buf, len, pos, cb) => {
    // 1. Write to Knobase API
    await writeToKnobase(path, buf)
    // 2. Return bytes written
    cb(len)
  }
}

const fuse = new Fuse(mountPath, ops)
fuse.mount()
```

**Pros:**
- OpenClaw needs zero changes
- Works with any OpenClaw version
- Real-time sync

**Cons:**
- Requires FUSE (macOS needs macFUSE, Linux native, Windows needs WinFsp)
- Complex to maintain
- Performance overhead

**Verdict:** ❌ Too complex for general users

---

#### Option 2: Symbolic Link + Proxy Script (Recommended)
**Best for:** Easy setup, good performance

```bash
# 1. Backup original workspace
mv ~/.openclaw/workspace ~/.openclaw/workspace-backup

# 2. Create symlink to our proxy directory
ln -s ~/.openclaw/knobase-workspace ~/.openclaw/workspace

# 3. Proxy script watches this directory
# Every read/write is intercepted and sent to Knobase
```

**Proxy Implementation:**
```javascript
// bin/workspace-proxy.js
const chokidar = require('chokidar')
const fs = require('fs/promises')

const WORKSPACE_PATH = '~/.openclaw/knobase-workspace'

class KnobaseWorkspaceProxy {
  constructor() {
    this.cache = new Map()  // filename → content
    this.pendingWrites = new Map()
  }
  
  async init() {
    // 1. Fetch all files from Knobase
    const files = await this.fetchAllFiles()
    
    // 2. Write to local directory (OpenClaw reads from here)
    for (const [filename, content] of files) {
      await fs.writeFile(
        `${WORKSPACE_PATH}/${filename}`,
        content,
        'utf8'
      )
      this.cache.set(filename, content)
    }
    
    // 3. Watch for changes
    this.startWatching()
    
    // 4. Poll for remote changes
    this.startPolling()
  }
  
  startWatching() {
    chokidar.watch(`${WORKSPACE_PATH}/*.md`)
      .on('change', async (filepath) => {
        const filename = path.basename(filepath)
        const content = await fs.readFile(filepath, 'utf8')
        
        // Debounce writes to Knobase
        clearTimeout(this.pendingWrites.get(filename))
        const timeout = setTimeout(async () => {
          await this.uploadToKnobase(filename, content)
          console.log(`📝 ${filename} synced to Knobase`)
        }, 500)
        this.pendingWrites.set(filename, timeout)
      })
  }
  
  async uploadToKnobase(filename, content) {
    await fetch(`${KNOBASE_API}/agents/${AGENT_ID}/files/${filename}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ content })
    })
  }
  
  async fetchAllFiles() {
    const res = await fetch(`${KNOBASE_API}/agents/${AGENT_ID}/files`)
    return await res.json()
  }
}

const proxy = new KnobaseWorkspaceProxy()
proxy.init()
```

**Usage:**
```bash
# User runs:
openclaw-knobase workspace-proxy start

# Now OpenClaw thinks it's using local files
# But they're actually backed by Knobase
```

**Pros:**
- Works with current OpenClaw
- Good performance (local cache)
- Can work offline (sync when back)

**Cons:**
- Two sources of truth (cache vs cloud)
- Potential sync conflicts

**Verdict:** ✅ Good balance

---

#### Option 3: OpenClaw Configuration Override
**Best for:** Clean, but requires OpenClaw support

**Proposal:** Add to OpenClaw's config:
```json
// ~/.openclaw/openclaw.json
{
  "workspace": {
    "provider": "knobase",
    "config": {
      "apiEndpoint": "https://app.knobase.com",
      "agentId": "agent-uuid",
      "apiKey": "kb_xxx"
    }
  }
}
```

**OpenClaw would:**
1. Check if workspace.provider is set
2. If "knobase", use KnobaseProvider class
3. KnobaseProvider implements:
   - `readFile(path)` → fetch from API
   - `writeFile(path, content)` → POST to API
   - `listFiles()` → GET /files

**This requires OpenClaw core changes.**

**Verdict:** ❌ Not in our control (but ideal long-term)

---

## Recommended Approach: Hybrid Proxy

### Phase 1: Transparent Proxy (Now)
```
OpenClaw reads/writes → Local files (cache)
                               ↕ (real-time sync)
                         Knobase API (source of truth)
```

**Implementation:**
```bash
# Install the workspace proxy
npm install -g openclaw-knobase

# Enable exclusive mode
openclaw-knobase mode exclusive

# This:
# 1. Moves ~/.openclaw/workspace → ~/.openclaw/workspace-local
# 2. Creates proxy at ~/.openclaw/workspace
# 3. Starts background sync daemon
```

### Phase 2: Educate Users

**Documentation:**
```markdown
# Using Knobase as Your Exclusive OpenClaw Workspace

## Quick Start

1. **Connect to Knobase:**
   ```bash
   openclaw-knobase connect --device-code XXX
   ```

2. **Enable Exclusive Mode:**
   ```bash
   openclaw-knobase mode exclusive
   ```

3. **Your files are now in Knobase!**
   - Edit at: https://app.knobase.com/s/your-workspace
   - Changes sync automatically to OpenClaw
   - No more local file management

## What Changes?

**Before:**
- Edit files in VS Code ~/openclaw/workspace/
- Files only on your computer
- Risk of losing work

**After:**
- Edit files in Knobase web app
- Files in cloud (accessible anywhere)
- Auto-synced to OpenClaw
- Never lose work

## How It Works

The proxy creates a virtual filesystem:
- OpenClaw reads from local cache
- Every write goes to Knobase immediately
- Changes from Knobase download automatically
- Works offline (syncs when reconnected)
```

### Phase 3: OpenClaw Skill (Future)

Create an official OpenClaw skill:
```bash
openclaw skills install knobase-workspace

# This would add native Knobase support to OpenClaw
# As a first-class workspace provider
```

---

## Making Knobase the "Great Tool"

### 1. Feature Parity
Ensure Knobase can do everything OpenClaw users need:

| Feature | Status | Notes |
|---------|--------|-------|
| Edit markdown | ✅ | Tiptap editor |
| Version history | ✅ | Supabase built-in |
| Search files | ✅ | Full-text search |
| Collaboration | ✅ | Real-time with Yjs |
| Offline editing | ⚠️ | Needs PWA support |
| Mobile app | ❌ | Future |
| CLI editing | ⚠️ | `knobase edit SOUL.md`? |

### 2. Knobase CLI Commands

Add CLI for terminal users who prefer command line:

```bash
# Edit file in Knobase
knobase edit SOUL.md

# Opens $EDITOR with file content from cloud
# Saves back to cloud on exit

# List files
knobase files list

# Download file
knobase files get SOUL.md

# Upload file
knobase files put SOUL.md

# Sync local directory to Knobase
knobase sync --up ./my-local-workspace/
```

### 3. IDE Integration

**VS Code Extension:**
```json
// .vscode/settings.json
{
  "knobase.workspace": "https://app.knobase.com/s/my-workspace",
  "knobase.autoSync": true
}
```

**Features:**
- File explorer showing Knobase files
- Edit in VS Code, auto-sync
- Status bar showing sync status

### 4. Migration Tool

```bash
# One-command migration
openclaw-knobase migrate-to-cloud

# This:
# 1. Uploads all local files to Knobase
# 2. Verifies upload
# 3. Enables exclusive mode
# 4. Backs up local files
# 5. Shows success message
```

---

## User Journey

### New User
```bash
# 1. Install
npm install -g openclaw-knobase

# 2. Connect (automatically enables exclusive mode)
openclaw-knobase connect --device-code XXX

# 3. Open Knobase
# Browser opens to https://app.knobase.com/s/workspace

# 4. Edit files in browser
# Changes sync to OpenClaw automatically
```

### Existing User Migration
```bash
# 1. Check current setup
openclaw-knobase status
# Shows: "Local workspace with 7 files"

# 2. Migrate
openclaw-knobase migrate-to-cloud
# Uploads files...
# Enables exclusive mode...
# Done!

# 3. Verify
openclaw-knobase status
# Shows: "Knobase exclusive mode - 7 files synced"
```

---

## Implementation Checklist

**Short Term (This Week):**
- [ ] Build workspace proxy daemon
- [ ] Add `openclaw-knobase mode exclusive` command
- [ ] Add migration tool
- [ ] Update documentation

**Medium Term (Next Month):**
- [ ] VS Code extension
- [ ] CLI commands (`knobase edit`, etc.)
- [ ] Offline PWA support

**Long Term (Next Quarter):**
- [ ] Propose OpenClaw workspace provider API
- [ ] Native Knobase skill for OpenClaw

---

## Summary

**The Goal:** Make Knobase the exclusive brain for OpenClaw agents.

**The Strategy:** 
1. **Proxy Pattern** - Transparent filesystem mount (works now)
2. **Education** - Show users the benefits
3. **Tooling** - CLI, IDE extensions, migration tools
4. **Upstream** - Eventually propose native OpenClaw support

**Key Message:**
> Knobase isn't just a sync target. 
> It's THE workspace.
> OpenClaw reads from it, writes to it, lives in it.
> Your agent's brain is in the cloud.

**Ready to build the workspace proxy?**
