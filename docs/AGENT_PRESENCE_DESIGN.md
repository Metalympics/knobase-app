# Agent Online Status / Presence Design
## Showing Real-Time Agent Availability

---

## The Problem

Currently agents show in sidebar but we don't know if they're actually online:
- ❌ Webhook server might be down
- ❌ Agent process might have crashed  
- ❌ Network issues blocking messages
- ❌ Agent is "ghost" - visible but not receiving

**User sees:** "@openclaw is here"  
**Reality:** Messages go to dead webhook, user waits forever

---

## Solution Options

### Option 1: Health Check Polling (Recommended)

**How it works:**
1. Knobase periodically pings agent's webhook health endpoint
2. Agent responds with status
3. Knobase updates "online" indicator in real-time

**Implementation:**

```typescript
// Agent webhook server (already exists)
// Add health endpoint:

// POST /webhook/knobase/health
app.post('/webhook/knobase/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent_id: process.env.AGENT_ID,
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: '1.2.0'
  });
});
```

```typescript
// Knobase backend - health checker service

class AgentHealthChecker {
  constructor() {
    this.checkInterval = 30000; // 30 seconds
    this.agents = new Map(); // agent_id → status
  }
  
  async start() {
    setInterval(() => this.checkAllAgents(), this.checkInterval);
  }
  
  async checkAllAgents() {
    // Get all agents with webhooks
    const agents = await db.agents.where('webhook_url IS NOT NULL');
    
    for (const agent of agents) {
      const status = await this.checkAgent(agent);
      await this.updateAgentStatus(agent.id, status);
    }
  }
  
  async checkAgent(agent) {
    try {
      const response = await fetch(`${agent.webhook_url}/health`, {
        method: 'POST',
        timeout: 5000,  // 5 second timeout
        headers: {
          'X-Knobase-Health-Check': 'true',
          'Authorization': `Bearer ${agent.webhook_secret}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          online: true,
          last_seen: Date.now(),
          uptime: data.uptime,
          version: data.version,
          response_time: Date.now() - startTime
        };
      }
      
      return { online: false, reason: 'unhealthy_response' };
      
    } catch (error) {
      return { 
        online: false, 
        reason: error.code === 'ECONNREFUSED' ? 'offline' : 'error',
        error: error.message
      };
    }
  }
  
  async updateAgentStatus(agentId, status) {
    // Update database
    await db.agents.update(agentId, {
      is_online: status.online,
      last_seen_at: status.online ? new Date() : null,
      health_status: status.online ? 'healthy' : status.reason,
      response_time_ms: status.response_time,
      updated_at: new Date()
    });
    
    // Broadcast to connected clients (WebSocket)
    await this.broadcastStatusChange(agentId, status);
  }
}
```

```sql
-- Add to users table (agents)
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN health_status TEXT; -- 'healthy', 'offline', 'error'
ALTER TABLE users ADD COLUMN response_time_ms INTEGER;
```

---

### Option 2: Agent Heartbeat (Push Model)

**How it works:**
1. Agent periodically sends "I'm alive" to Knobase
2. Knobase marks agent online when heartbeat received
3. If no heartbeat for 2 minutes → mark offline

**Implementation:**

```typescript
// In daemon.js - add heartbeat

class AgentHeartbeat {
  constructor() {
    this.interval = 60000; // 1 minute
  }
  
  start() {
    setInterval(() => this.sendHeartbeat(), this.interval);
  }
  
  async sendHeartbeat() {
    try {
      await fetch(`${KNOBASE_API}/agents/${AGENT_ID}/heartbeat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          timestamp: Date.now(),
          uptime: process.uptime(),
          status: 'healthy'
        })
      });
    } catch (error) {
      // Silent fail - will retry in 1 minute
    }
  }
}
```

```typescript
// Knobase API endpoint

POST /api/agents/:id/heartbeat
Authorization: Agent API Key

Body: {
  timestamp: 1710662400000,
  uptime: 3600,
  status: 'healthy'
}

Response: { received: true }
```

```typescript
// Knobase - mark offline if no heartbeat

setInterval(async () => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  
  await db.agents
    .where('type', 'agent')
    .where('last_seen_at', '<', twoMinutesAgo)
    .update({
      is_online: false,
      health_status: 'offline'
    });
}, 60000);
```

---

### Option 3: Hybrid (Best of Both)

**Combine both approaches:**

1. **Agent sends heartbeat** every 1 minute (push)
2. **Knobase health checks** every 30 seconds (pull)
3. **Either one keeps agent marked online**
4. **Both must fail for 2 minutes** before marking offline

**Benefits:**
- ✅ Immediate online detection (heartbeat)
- ✅ Verification health checks work (polling)
- ✅ Graceful degradation if one fails
- ✅ Double confirmation before marking offline

---

## UI Implementation

### Sidebar Indicator

```tsx
// components/sidebar/agent-list.tsx

function AgentStatus({ agent }: { agent: Agent }) {
  if (agent.is_online) {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-green-600">Online</span>
      </span>
    );
  }
  
  if (agent.last_seen_at) {
    const lastSeen = formatDistance(new Date(agent.last_seen_at), new Date());
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-xs text-gray-500">Last seen {lastSeen} ago</span>
      </span>
    );
  }
  
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 bg-red-500 rounded-full" />
      <span className="text-xs text-red-500">Offline</span>
    </span>
  );
}
```

### Agent Detail View

```
┌─────────────────────────────────────────┐
│  @openclaw                              │
│  Product & Coding Agent                 │
├─────────────────────────────────────────┤
│                                         │
│  Status                                 │
│  🟢 Online (last checked 10s ago)       │
│                                         │
│  Health                                 │
│  • Response time: 45ms                  │
│  • Uptime: 2 hours 15 minutes           │
│  • Version: 1.2.0                       │
│                                         │
│  Last Seen                              │
│  Active now                             │
│                                         │
│  [Ping Agent] [View Logs] [Restart]     │
│                                         │
└─────────────────────────────────────────┘
```

### When Mentioning Offline Agent

```tsx
// In editor, when typing @agent

if (agent.is_online === false) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
      <span className="text-yellow-700">
        ⚠️ @{agent.name} appears to be offline. 
        Messages may not be received.
      </span>
      <button onClick={pingAgent}>
        Check status
      </button>
    </div>
  );
}
```

---

## Real-Time Updates

### WebSocket Broadcast

```typescript
// When agent status changes

io.to(`workspace:${workspaceId}`).emit('agent:status', {
  agent_id: agent.id,
  is_online: true,
  last_seen: Date.now(),
  response_time: 45
});
```

### Frontend Subscription

```typescript
// React hook

function useAgentStatus(agentId: string) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  
  useEffect(() => {
    // Initial fetch
    fetchAgentStatus(agentId).then(setStatus);
    
    // Subscribe to real-time updates
    const socket = io();
    socket.on('agent:status', (data) => {
      if (data.agent_id === agentId) {
        setStatus(data);
      }
    });
    
    return () => socket.disconnect();
  }, [agentId]);
  
  return status;
}
```

---

## Implementation Recommendation

**Go with Hybrid Approach (Option 3):**

**Phase 1: Heartbeat (Agent → Knobase)**
- Add to daemon.js: Send heartbeat every 60s
- Add API endpoint: POST /api/agents/:id/heartbeat
- Update database: last_seen_at timestamp
- Show online/offline in sidebar

**Phase 2: Health Checks (Knobase → Agent)**
- Add health endpoint to webhook server
- Add health checker service in Knobase
- Verify both directions work
- Show detailed health metrics

**Phase 3: Real-Time UI**
- Add WebSocket broadcast
- Update sidebar with live status
- Show warnings when mentioning offline agents

---

## Database Migration

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN health_status TEXT; -- 'online', 'offline', 'error'
ALTER TABLE users ADD COLUMN response_time_ms INTEGER;
ALTER TABLE users ADD COLUMN last_health_check_at TIMESTAMP;

-- Index for fast queries
CREATE INDEX idx_users_online ON users(is_online) WHERE type = 'agent';
CREATE INDEX idx_users_last_seen ON users(last_seen_at);
```

---

## Summary

| Approach | Direction | Frequency | Reliability |
|----------|-----------|-----------|-------------|
| **Heartbeat** | Agent → Knobase | Every 60s | High |
| **Health Check** | Knobase → Agent | Every 30s | High |
| **Hybrid** | Both | Combined | Very High |

**Recommendation:** Start with heartbeat (simpler), add health checks later.

**Ready to implement heartbeat first?**
