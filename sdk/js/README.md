# @knobase/sdk

Official JavaScript/TypeScript SDK for the Knobase API.

## Installation

```bash
npm install @knobase/sdk
```

## Quick Start

```typescript
import { KnobaseClient } from "@knobase/sdk";

const client = new KnobaseClient({
  apiUrl: "https://your-knobase-instance.com",
  apiKey: "kb_your_api_key",
});

// List documents
const docs = await client.listDocs({ limit: 10 });
console.log(docs.data);

// Create a document
const doc = await client.createDoc({
  title: "My Document",
  content: "Hello, world!",
  tags: ["example"],
});

// Search
const results = await client.search("project plan", {
  filters: { tags: ["work"] },
});

// Get a single document
const single = await client.getDoc("document-id");

// Update
await client.updateDoc("document-id", { title: "Updated Title" });

// Delete
await client.deleteDoc("document-id");
```

## Collections

```typescript
const collections = await client.listCollections();

await client.createCollection({
  name: "Research",
  description: "Research papers and notes",
  icon: "📚",
  color: "#8B5CF6",
});
```

## Agents

```typescript
const agents = await client.listAgents();

const response = await client.invokeAgent({
  action: "summarize",
  content: "Long document text here...",
});
console.log(response.data.content);
```

## Webhooks

```typescript
await client.createWebhook({
  url: "https://your-server.com/webhook",
  events: ["document.created", "document.updated"],
});
```

## Error Handling

```typescript
try {
  await client.getDoc("nonexistent-id");
} catch (err) {
  if (err instanceof Error && err.name === "KnobaseError") {
    console.error(err.message, (err as any).code, (err as any).status);
  }
}
```

## Configuration

| Option   | Type   | Default | Description           |
|----------|--------|---------|-----------------------|
| apiUrl   | string | —       | Your Knobase API URL  |
| apiKey   | string | —       | Your API key          |
| timeout  | number | 30000   | Request timeout (ms)  |
