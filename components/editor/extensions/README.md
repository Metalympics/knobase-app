# Inline Agent Extension for Tiptap

A Tiptap extension that enables inline agent mentions (@mentions) to trigger AI agent tasks directly in the editor.

## Features

- **@ Mention Detection**: Type `@` to trigger the agent selector
- **Agent Selection**: Choose from available AI agents (GPT-4, Claude, Gemini)
- **Task Management**: Creates and tracks agent tasks with real-time status updates
- **React Component Integration**: Uses PendingBlock to display task status inline
- **Keyboard Navigation**: Full keyboard support for agent selection and task submission

## Installation

The extension is already part of the project. To use it in your TiptapEditor:

1. Import the extension and components:

```typescript
import { InlineAgent } from "./extensions/inline-agent";
import { AgentSelector } from "./extensions/agent-selector";
```

2. Add the extension to your editor configuration:

```typescript
const editor = useEditor({
  extensions: [
    // ... other extensions
    InlineAgent.configure({
      HTMLAttributes: {
        class: "inline-agent-node",
      },
    }),
  ],
  // ... rest of config
});
```

3. Add the AgentSelector component to your editor UI:

```typescript
const [agentSelector, setAgentSelector] = useState({
  isOpen: false,
  position: { top: 0, left: 0 },
  query: "",
});

// Monitor editor storage for agent selector state
useEffect(() => {
  if (!editor) return;
  
  const updateAgentSelector = () => {
    const storage = editor.storage.inlineAgent;
    if (storage) {
      setAgentSelector({
        isOpen: storage.showAgentSelector,
        position: storage.position,
        query: storage.query || "",
      });
    }
  };

  editor.on("update", updateAgentSelector);
  return () => {
    editor.off("update", updateAgentSelector);
  };
}, [editor]);

// Render the selector
<AgentSelector
  editor={editor}
  isOpen={agentSelector.isOpen}
  position={agentSelector.position}
  query={agentSelector.query}
  documentId={documentId}
  documentTitle={documentTitle}
  onClose={() => {
    editor.storage.inlineAgent.showAgentSelector = false;
  }}
/>
```

## Usage

1. **Trigger Agent**: Type `@` in the editor to open the agent selector
2. **Select Agent**: Use arrow keys or mouse to select an AI agent
3. **Enter Prompt**: Type your instruction in the prompt field
4. **Submit**: Press Enter to create the task and insert the pending block
5. **Monitor**: Watch as the task progresses through queued → running → completed states

## Architecture

### Files

- **`inline-agent.ts`**: Main Tiptap extension definition
  - Defines the `inlineAgent` node type
  - Handles @ key detection and agent selector triggering
  - Provides commands for inserting and updating agent nodes
  - Manages task state synchronization

- **`inline-agent-view.tsx`**: React node view component
  - Renders the PendingBlock component for each agent task
  - Subscribes to task store updates
  - Handles task cancellation

- **`agent-selector.tsx`**: Agent selection UI
  - Displays available agents with descriptions
  - Handles keyboard navigation and selection
  - Collects user prompt and creates tasks

- **`index.ts`**: Exports for easy importing

### Node Structure

The `inlineAgent` node is an inline, atomic node with the following attributes:

```typescript
{
  taskId: string; // UUID of the associated AgentTask
}
```

### Commands

- `insertInlineAgent(taskId: string)`: Insert a new inline agent node
- `updateInlineAgent(taskId: string, updates: Partial<AgentTask>)`: Update an existing node

### Storage

The extension maintains the following state in `editor.storage.inlineAgent`:

```typescript
{
  showAgentSelector: boolean;
  position: { top: number; left: number };
  query: string;
  onTaskCreate: ((task: AgentTask) => void) | null;
  onTaskUpdate: ((taskId: string, updates: Partial<AgentTask>) => void) | null;
  onTaskCancel: ((taskId: string) => void) | null;
}
```

## Task Lifecycle

1. **Creation**: User selects agent and submits prompt
2. **Insertion**: Agent node inserted at cursor position
3. **Queue**: Task added to store with `queued` status
4. **Processing**: Status changes to `running`
5. **Completion**: Status changes to `completed` with result
6. **Display**: PendingBlock updates to show final state

## Integration with Task Store

The extension uses Zustand's `useTaskStore` to:

- Create new tasks when agents are invoked
- Subscribe to task updates
- Display real-time task status in the editor
- Handle task cancellation

## Customization

### Modify Available Agents

Edit `AGENT_OPTIONS` in `agent-selector.tsx`:

```typescript
const AGENT_OPTIONS: AgentOption[] = [
  {
    id: "custom-agent",
    model: "Custom Model",
    provider: "Custom Provider",
    icon: <YourIcon className="h-4 w-4" />,
    description: "Your custom agent description",
  },
  // ...
];
```

### Custom Task Execution

Replace `simulateTaskExecution` in `inline-agent.ts` with your actual agent execution logic:

```typescript
async function executeAgentTask(
  taskId: string,
  taskStore: ReturnType<typeof useTaskStore.getState>,
  prompt: string
): Promise<void> {
  taskStore.updateTask(taskId, { status: "running" });
  
  try {
    // Your agent execution logic here
    const result = await yourAgentAPI.execute(prompt);
    
    taskStore.updateTask(taskId, {
      status: "completed",
      result,
      completedAt: new Date(),
    });
  } catch (error) {
    taskStore.updateTask(taskId, {
      status: "failed",
      error: error.message,
    });
  }
}
```

### Styling

The extension uses Tailwind CSS classes. Customize by modifying:

- Node wrapper: `inline-agent-node` class in `inline-agent.ts`
- PendingBlock appearance: Edit `pending-block.tsx`
- AgentSelector UI: Edit styles in `agent-selector.tsx`

## Notes

- The extension currently uses a demo/simulation mode for task execution
- For production use, integrate with your actual AI agent backend
- Task persistence is in-memory via Zustand; add persistence if needed
- The @ trigger only works at the start of a line or after a space
