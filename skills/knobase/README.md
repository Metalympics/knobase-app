# Knobase Skill for OpenClaw

Integrate your Knobase workspace with OpenClaw for seamless AI-powered knowledge management.

## Installation

1. Copy the `.openclaw/knobase.json` config into your OpenClaw config directory
2. Set your API key in `.env.local`:
   ```
   MCP_API_KEY=your-api-key-here
   ```
3. Start your Knobase instance (`npm run dev`)
4. In OpenClaw, enable the Knobase skill

## Available Actions

### `open_knobase`
Opens the Knobase workspace and returns the current state.

**Example prompt:** "Open my knowledge base and show me recent documents"

### `create_document`
Creates a new document in Knobase with the specified title and content.

**Example prompt:** "Create a new document called 'Meeting Notes' with today's agenda"

### `edit_with_ai`
Uses the Knobase AI agent (Claw) to suggest edits to a document.

**Example prompt:** "Have Claw improve the writing in my 'Project Plan' document"

### `search_knowledge`
Searches across all documents in your Knobase workspace.

**Example prompt:** "Search my knowledge base for anything about API design"

### `list_documents`
Lists all documents with metadata.

**Example prompt:** "What documents do I have in my knowledge base?"

### `read_document`
Reads the full content of a specific document.

**Example prompt:** "Read my 'Weekly Review' document"

## Configuration

The skill connects to Knobase via the MCP (Model Context Protocol) endpoint:

- **Endpoint:** `http://localhost:3000/api/mcp`
- **Auth:** Bearer token (API key)
- **Protocol:** JSON-RPC 2.0 over HTTP
- **SSE:** `GET /api/mcp` for real-time updates

## Example OpenClaw Prompts

```
"Summarize all my recent documents"
"Create a document from this conversation"
"Search my notes for meeting decisions"
"What did I write about deployment last week?"
"Have Claw clean up my draft document"
```

## Bidirectional Sync

When connected, Knobase automatically:
- Pushes document changes to OpenClaw context
- Receives commands from OpenClaw
- Syncs agent suggestions as context
- Updates workspace structure in real-time
