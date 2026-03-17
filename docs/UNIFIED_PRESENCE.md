# Unified Presence System
## Online Status for Humans AND Agents

---

## Why Unified?

**Same Problem:**
- "Is @chris online?" (human)
- "Is @openclaw online?" (agent)

**Same Need:**
- Know if they'll receive your @mention
- Know if they're actively working
- Know if you should expect a response

**Same Solution:**
- One presence system, two detection methods

---

## Presence Types

| User Type | Online When | Detection Method |
|-----------|-------------|------------------|
| **Human** | Actively using Knobase web app | WebSocket connected + recent activity |
| **Agent** | Daemon/webhook responding | Heartbeat received + health check |

---

## Database Schema (Unified)

```sql
-- Add to users table (works for both humans and agents)
ALTER TABLE users ADD COLUMN presence_status TEXT DEFAULT 'offline';
-- Values: 'online', 'away', 'offline', 'error'

ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP;
-- When they were last active

ALTER TABLE users ADD COLUMN presence_updated_at TIMESTAMP DEFAULT now();
-- When status was last updated

-- For humans: WebSocket session tracking
ALTER TABLE users ADD COLUMN websocket_session_id TEXT;
-- Current WebSocket connection ID

-- For agents: Last heartbeat details
ALTER TABLE users ADD COLUMN last_heartbeat_at TIMESTAMP;
ALTER TABLE users ADD COLUMN heartbeat_source TEXT; -- 'webhook' | 'daemon'

-- For both: Response/connection quality
ALTER TABLE users ADD COLUMN connection_quality TEXT; 
-- 'excellent', 'good', 'poor', 'disconnected'
```

---

## Detection Methods

### For Humans: Activity-Based

```typescript
// WebSocket connection tracking
io.on('connection', (socket) => {
  const userId = socket.auth.userId;
  
  // Mark user as online
  await db.users.update(userId, {
    presence_status: 'online',
    websocket_session_id: socket.id,
    last_seen_at: new Date(),
    presence_updated_at: new Date()
  });
  
  // Broadcast to workspace
  io.to(`workspace:${workspaceId}`).emit('presence:update', {
    user_id: userId,
    status: 'online',
    timestamp: Date.now()
  });
  
  // On disconnect
  socket.on('disconnect', async () => {
    // Don't mark offline immediately - they might refresh
    setTimeout(async () => {
      const user = await db.users.findById(userId);
      if (user.websocket_session_id === socket.id) {
        // Still no new connection, mark as away
        await db.users.update(userId, {
          presence_status: 'away',
          websocket_session_id: null,
          presence_updated_at: new Date()
        });
        
        // After 5 more minutes, mark offline
        setTimeout(async () => {
          const user = await db.users.findById(userId);
          if (user.presence_status === 'away') {
            await db.users.update(userId, {
              presence_status: 'offline',
              presence_updated_at: new Date()
            });
          }
        }, 5 * 60 * 1000);
      }
    }, 30000); // Wait 30s before marking away
  });
});

// Activity tracking (typing, clicking)
socket.on('activity', async () => {
  await db.users.update(userId, {
    last_seen_at: new Date(),
    presence_status: 'online'
  });
});
```

**Human Status Flow:**
```
User opens Knobase
    ↓
WebSocket connects
    ↓
Status: ONLINE 🟢
    ↓
User closes tab
    ↓
Wait 30 seconds
    ↓
Status: AWAY 🟡
    ↓
Wait 5 minutes
    ↓
Status: OFFLINE ⚪
```

---

### For Agents: Heartbeat-Based

```typescript
// Same as before, but unified with human presence

// Agent heartbeat (from daemon.js)
POST /api/agents/:id/heartbeat

// Updates same fields
await db.users.update(agentId, {
  presence_status: 'online',
  last_heartbeat_at: new Date(),
  last_seen_at: new Date(),
  heartbeat_source: 'daemon',
  presence_updated_at: new Date()
});

// If no heartbeat for 2 minutes
setInterval(async () => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  
  await db.users
    .where('type', 'agent')
    .where('last_heartbeat_at', '<', twoMinutesAgo)
    .where('presence_status', '!=', 'offline')
    .update({
      presence_status: 'offline',
      presence_updated_at: new Date()
    });
}, 60000);
```

**Agent Status Flow:**
```
Agent daemon starts
    ↓
Heartbeat every 60s
    ↓
Status: ONLINE 🟢
    ↓
No heartbeat for 2 min
    ↓
Status: OFFLINE 🔴
```

---

## Unified UI Components

### Sidebar Presence Indicator (Works for Both)

```tsx
// components/sidebar/user-presence.tsx

interface PresenceIndicatorProps {
  user: User;  // Could be human or agent
}

function PresenceIndicator({ user }: PresenceIndicatorProps) {
  const getStatusColor = () => {
    switch (user.presence_status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getStatusText = () => {
    if (user.type === 'agent') {
      switch (user.presence_status) {
        case 'online': return 'Online';
        case 'offline': return 'Offline';
        case 'error': return 'Error';
        default: return 'Unknown';
      }
    } else {
      // Human
      switch (user.presence_status) {
        case 'online': return 'Active';
        case 'away': return 'Away';
        case 'offline': return 'Offline';
        default: return 'Offline';
      }
    }
  };
  
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", getStatusColor())} />
      <span className="text-xs text-muted-foreground">
        {getStatusText()}
      </span>
    </span>
  );
}
```

### Sidebar Usage

```tsx
// Show presence for ALL users (humans + agents)

<Sidebar>
  <Section title="Team">
    {humans.map(user => (
      <UserRow key={user.id}>
        <Avatar src={user.avatar_url} />
        <span>{user.name}</span>
        <PresenceIndicator user={user} />
        {/* Shows: 🟢 Active or 🟡 Away or ⚪ Offline */}
      </UserRow>
    ))}
  </Section>
  
  <Section title="Agents">
    {agents.map(agent => (
      <UserRow key={agent.id}>
        <Avatar src={agent.avatar_url} />
        <span>{agent.name}</span>
        <PresenceIndicator user={agent} />
        {/* Shows: 🟢 Online or 🔴 Offline */}
      </UserRow>
    ))}
  </Section>
</Sidebar>
```

---

## Tooltip Details (Hover for More Info)

### For Humans
```
┌─────────────────────────┐
│  @chris_lee             │
│  🟢 Active now          │
│                         │
│  Last activity:         │
│  Editing "Project Spec" │
│                         │
│  Device: MacBook Pro    │
│  Location: Hong Kong    │
└─────────────────────────┘
```

### For Agents
```
┌─────────────────────────┐
│  @openclaw              │
│  🟢 Online              │
│                         │
│  Last heartbeat:        │
│  15 seconds ago         │
│                         │
│  Response time: 45ms    │
│  Uptime: 2h 15m         │
│  Version: 1.2.0         │
└─────────────────────────┘
```

---

## Real-Time Updates (WebSocket)

```typescript
// Broadcast to all workspace members

// When human comes online
io.to(`workspace:${workspaceId}`).emit('presence:change', {
  user_id: user.id,
  user_type: 'human',  // or 'agent'
  status: 'online',
  timestamp: Date.now(),
  details: {
    // For humans
    device: 'MacBook Pro',
    
    // For agents  
    response_time_ms: 45,
    uptime_seconds: 8100
  }
});

// Frontend listens
useEffect(() => {
  socket.on('presence:change', (data) => {
    updateUserPresence(data.user_id, data.status);
  });
}, []);
```

---

## Benefits of Unified System

| Benefit | Explanation |
|---------|-------------|
| **Consistent UI** | Same indicator for humans and agents |
| **Single Codebase** | One presence service handles both |
| **Shared Database** | Same columns, different detection |
| **Unified API** | `/api/presence/:userId` works for all |
| **Better UX** | Users understand "online" means the same thing |

---

## Implementation Priority

### Phase 1: Humans (2 days)
- [ ] WebSocket presence tracking
- [ ] "online/away/offline" for humans
- [ ] Sidebar indicators

### Phase 2: Agents (2 days)
- [ ] Agent heartbeat API
- [ ] Daemon heartbeat implementation
- [ ] Health check endpoint

### Phase 3: Polish (2 days)
- [ ] Tooltips with details
- [ ] Typing indicators (bonus)
- [ ] "Last seen" timestamps

---

## Migration Path

**Current:** Agents show in sidebar, no status
**Target:** Both humans and agents show presence

```sql
-- Migration
UPDATE users 
SET presence_status = 'offline' 
WHERE presence_status IS NULL;

-- Backfill for existing agents
UPDATE users 
SET last_seen_at = NOW() 
WHERE type = 'agent' AND last_seen_at IS NULL;
```

---

## Summary

| Feature | Humans | Agents |
|---------|--------|--------|
| **Online** | WebSocket connected | Heartbeat < 2 min ago |
| **Away** | WebSocket disconnected < 5 min | N/A |
| **Offline** | WebSocket disconnected > 5 min | No heartbeat > 2 min |
| **Detection** | Activity + connection | Heartbeat + health check |
| **UI** | Same indicator component | Same indicator component |

**One system. Two detection methods. Unified experience.**

**Ready to build?**
