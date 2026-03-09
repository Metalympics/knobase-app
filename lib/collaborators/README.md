# Agent Discovery API

A comprehensive system for workspace collaboration where agents can discover and query workspace members (humans + agents) to find the right collaborator for a task.

## Overview

The Agent Discovery API enables intelligent matching of tasks to the most suitable workspace members based on:
- **Capabilities**: Specific skills like `data-analysis`, `writing`, `coding`
- **Expertise**: Domain knowledge like `finance`, `healthcare`, `legal`
- **Availability**: Current status (`online`, `busy`, `offline`)
- **Performance**: Success rates and activity metrics
- **Semantic matching**: Natural language understanding of requirements

## Use Case Example

```typescript
// 1. General agent receives task: "Analyze Q3 financial data"
// 2. Agent realizes: "I need a data specialist"
// 3. Agent queries the discovery API
const specialists = await mcpClient.call('collaborators/discover', {
  query: 'I need help analyzing Q3 financial data',
  type: 'agent',
  limit: 3
});

// 4. System returns: @data-analyst (specialist agent)
// Result: {
//   name: "Data Analyst",
//   capabilities: ["data-analysis", "sql", "finance"],
//   confidence: 0.95,
//   mention_syntax: "@data-analyst"
// }

// 5. General agent can now mention the specialist
await agent.mention('@data-analyst', 'Can you analyze Q3 financial data?');

// 6. Data analyst agent picks up the task
```

## Architecture

### Files Created

1. **`lib/collaborators/types.ts`**
   - Type definitions for `WorkspaceMember`, `CollaboratorQuery`, `CollaboratorSearchResult`
   - Unified interface for both human and agent profiles

2. **`lib/collaborators/discovery.ts`**
   - Core discovery logic with semantic matching
   - Intelligent ranking algorithm considering multiple factors
   - Keyword extraction from natural language queries

3. **`supabase/migrations/013_agent_discovery.sql`**
   - Database schema extensions for discovery fields
   - Unified view `workspace_members_unified`
   - Full-text search indices and helper functions

4. **`app/api/collaborators/route.ts`**
   - REST API endpoints for discovery
   - `GET /api/collaborators` - List members
   - `POST /api/collaborators/search` - Advanced search

5. **`app/api/mcp/tools/collaborators/discover/route.ts`**
   - MCP tool endpoint for agents
   - Returns top-ranked collaborators with mention syntax

6. **`lib/supabase/types.ts`**
   - Extended type definitions for discovery features

## Database Schema

### Extended `agents` Table

```sql
ALTER TABLE agents ADD COLUMN:
- description TEXT              -- Rich description of capabilities
- expertise TEXT[]              -- Domain expertise tags
- availability TEXT             -- 'online' | 'busy' | 'offline'
- total_invocations INTEGER     -- Total tasks executed
- successful_invocations INT    -- Successfully completed tasks
- success_rate DECIMAL          -- Computed: (successful / total) * 100
- avg_response_time_ms INT      -- Average completion time
- primary_persona_id UUID       -- Link to persona
```

### Extended `users` Table

```sql
ALTER TABLE users ADD COLUMN:
- description TEXT              -- User skills description
- capabilities TEXT[]           -- Skill tags
- expertise TEXT[]              -- Domain expertise
- availability TEXT             -- Current status
- last_active_at TIMESTAMPTZ    -- Last activity timestamp
```

### Unified View

```sql
CREATE VIEW workspace_members_unified AS
  -- Combines users and agents into single queryable view
  SELECT ... FROM workspace_members JOIN users
  UNION ALL
  SELECT ... FROM agents WHERE is_active = true;
```

## API Usage

### REST API

#### List All Members

```bash
GET /api/collaborators?type=all&limit=10
```

#### Search by Query

```bash
GET /api/collaborators?query=data+analysis&limit=5
```

#### Advanced Search

```bash
POST /api/collaborators/search
Content-Type: application/json

{
  "query": "I need someone to analyze Q3 financial data",
  "type": "agent",
  "available_only": true,
  "limit": 3,
  "min_confidence": 0.5
}
```

Response:
```json
{
  "success": true,
  "collaborators": [
    {
      "member": {
        "id": "agent-uuid",
        "type": "agent",
        "name": "Data Analyst",
        "description": "Specializes in financial data analysis...",
        "capabilities": ["data-analysis", "sql", "finance"],
        "availability": "online",
        "agent_profile": {
          "success_rate": 94.5,
          "total_invocations": 127
        }
      },
      "confidence": 0.95,
      "matched_capabilities": ["data-analysis", "finance"],
      "match_reason": "Has data-analysis, finance capabilities; Currently online"
    }
  ],
  "total": 1
}
```

### MCP Tool (For Agents)

```typescript
// Agent code
import { MCPClient } from '@/lib/mcp/client';

const mcpClient = new MCPClient(process.env.AGENT_API_KEY);

// Natural language query
const result = await mcpClient.call('collaborators/discover', {
  query: 'I need help analyzing Q3 earnings data and creating charts',
  type: 'agent',
  limit: 3
});

console.log(result.message);
// "Found 2 matching collaborators. Top match: @data-analyst (Data Analyst)"

// Get top collaborator
const specialist = result.collaborators[0];

// Mention them in the document
await agent.createMention({
  target: specialist.mention_syntax,
  prompt: 'Can you analyze Q3 earnings and create visualizations?'
});
```

## Smart Matching Logic

The discovery system ranks collaborators using a weighted scoring algorithm:

### Ranking Factors

1. **Capability Match (30%)**: Direct match of required capabilities
2. **Expertise Match (25%)**: Domain knowledge overlap
3. **Semantic Match (25%)**: Description similarity to query
4. **Availability (10%)**: Current online status
5. **Success Rate (5%)**: Historical performance
6. **Activity (5%)**: Recent activity recency

### Online Boost

Members with `availability: 'online'` receive a +0.2 boost to their total score.

### Example Scoring

```typescript
Query: "I need financial data analysis"

Candidate 1: Data Analyst Agent
- Capabilities: ["data-analysis", "sql", "finance"] ✓ Match
- Expertise: ["finance", "accounting"] ✓ Match
- Description: "Specializes in financial..." ✓ Match
- Availability: online (+0.2 boost)
- Success rate: 94%
→ Total Score: 0.95

Candidate 2: General Agent
- Capabilities: ["general"]
- Description: "General purpose assistant"
- Availability: busy
- Success rate: 87%
→ Total Score: 0.42
```

## Configuring Agent Profiles

To make agents discoverable, add rich metadata:

```typescript
// When creating/updating an agent
await supabase
  .from('agents')
  .update({
    description: 'Specializes in financial data analysis, SQL queries, statistical modeling, and creating insightful visualizations for executive decision-making',
    capabilities: ['data-analysis', 'sql', 'statistics', 'visualization'],
    expertise: ['finance', 'accounting', 'business-intelligence'],
    availability: 'online'
  })
  .eq('id', agentId);
```

### Capability Tags

Common capability tags:
- `data-analysis`, `sql`, `statistics`, `visualization`
- `writing`, `content`, `copywriting`, `documentation`
- `coding`, `debugging`, `code-review`, `testing`
- `design`, `ui-ux`, `branding`, `mockups`
- `research`, `fact-checking`, `summarization`

### Expertise Tags

Domain expertise examples:
- `finance`, `accounting`, `economics`
- `healthcare`, `medical`, `clinical`
- `legal`, `compliance`, `contracts`
- `marketing`, `sales`, `customer-success`
- `engineering`, `devops`, `infrastructure`

## Performance Tracking

Update agent metrics after task completion:

```typescript
import { updateAgentMetrics } from '@/lib/collaborators/discovery';

// After agent completes a task
await updateAgentMetrics(
  agentId,
  success: true,        // Task succeeded
  responseTimeMs: 2500  // Took 2.5 seconds
);

// This automatically updates:
// - total_invocations++
// - successful_invocations++ (if success=true)
// - avg_response_time_ms (rolling average)
// - success_rate (computed column)
// - last_seen_at = now()
```

## Natural Language Query Processing

The system automatically extracts keywords from natural language:

```typescript
Query: "I need someone to analyze Q3 financial data"

Extracted:
- Capabilities: ["data-analysis", "finance"]
- Keywords: ["analyze", "financial", "data"]

Then searches for agents with:
- capabilities containing "data-analysis" OR "finance"
- description containing "analyze" OR "financial" OR "data"
- expertise containing "finance"
```

## Integration Examples

### Example 1: General Agent Delegates to Specialist

```typescript
// In general agent code
async function handleTask(task: string) {
  // Step 1: Determine if specialist needed
  const needsSpecialist = await analyzeTaskComplexity(task);
  
  if (needsSpecialist) {
    // Step 2: Find specialist
    const specialists = await mcpClient.call('collaborators/discover', {
      query: task,
      type: 'agent',
      available_only: true,
      limit: 1
    });
    
    if (specialists.collaborators.length > 0) {
      const specialist = specialists.collaborators[0];
      
      // Step 3: Delegate via mention
      await this.createMention({
        target: specialist.mention_syntax,
        prompt: `${task}. I'm delegating this to you as you're the expert.`
      });
      
      return { 
        delegated: true, 
        to: specialist.name 
      };
    }
  }
  
  // Step 4: Handle ourselves if no specialist found
  return await this.handleTaskDirectly(task);
}
```

### Example 2: User Searches for Help

```typescript
// In frontend component
async function findHelp(query: string) {
  const response = await fetch('/api/collaborators/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      type: 'all', // Both humans and agents
      available_only: true,
      limit: 5
    })
  });
  
  const { collaborators } = await response.json();
  
  // Display results to user
  return collaborators.map(c => ({
    name: c.member.name,
    type: c.member.type,
    description: c.member.description,
    canMention: c.member.type === 'agent' ? c.mention_syntax : `@${c.member.name}`,
    confidence: c.confidence
  }));
}
```

### Example 3: Auto-Assignment Based on Availability

```typescript
// Route tasks to available specialists
async function autoAssignTask(task: AgentTask) {
  const specialists = await findCollaborators(task.workspace_id, {
    capabilities: [task.required_capability],
    available_only: true,
    type: 'agent',
    limit: 5,
    min_confidence: 0.6
  });
  
  if (specialists.collaborators.length === 0) {
    // Fall back to general agent
    return assignToGeneralAgent(task);
  }
  
  // Pick the top-ranked available specialist
  const best = specialists.collaborators[0];
  
  await supabase
    .from('agent_tasks')
    .update({ 
      agent_id: best.member.id,
      status: 'assigned' 
    })
    .eq('id', task.id);
    
  return best.member;
}
```

## RLS Policies

Ensure Row Level Security is configured:

```sql
-- Users can only see members in their workspace
CREATE POLICY "workspace_members_visible_to_members"
ON workspace_members_unified
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

## Testing

```bash
# Run migration
psql -d your_database -f supabase/migrations/013_agent_discovery.sql

# Test REST API
curl -X POST http://localhost:3000/api/collaborators/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "data analysis",
    "type": "agent",
    "limit": 3
  }'

# Test MCP Tool
curl -X POST http://localhost:3000/api/mcp/tools/collaborators/discover \
  -H "x-api-key: your-agent-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need financial analysis help",
    "available_only": true
  }'
```

## Future Enhancements

- **Machine Learning**: Train models on past successful collaborations
- **Context-Aware Matching**: Consider current workload and task history
- **Reputation System**: User ratings and feedback
- **Skill Endorsements**: Team members can endorse each other's skills
- **Automated Profile Updates**: Learn capabilities from completed tasks
- **Collaboration History**: Track which agents work well together

## Support

For issues or questions, see the main project documentation or contact the development team.
