# knobase

Official Python SDK for the Knobase API.

## Installation

```bash
pip install knobase
```

## Quick Start

```python
from knobase import KnobaseClient

client = KnobaseClient(
    api_url="https://your-knobase-instance.com",
    api_key="kb_your_api_key",
)

# List documents
docs = client.list_docs(limit=10)
print(docs["data"])

# Create a document
doc = client.create_doc(
    title="My Document",
    content="Hello, world!",
    tags=["example"],
)

# Search
results = client.search("project plan", tags=["work"])

# Get a single document
single = client.get_doc("document-id")

# Update
client.update_doc("document-id", title="Updated Title")

# Delete
client.delete_doc("document-id")
```

## Collections

```python
collections = client.list_collections()

client.create_collection(
    name="Research",
    description="Research papers and notes",
    icon="📚",
    color="#8B5CF6",
)
```

## Agents

```python
agents = client.list_agents()

response = client.invoke_agent(
    action="summarize",
    content="Long document text here...",
)
print(response["data"]["content"])
```

## Webhooks

```python
client.create_webhook(
    url="https://your-server.com/webhook",
    events=["document.created", "document.updated"],
)
```

## Error Handling

```python
from knobase.client import KnobaseError

try:
    client.get_doc("nonexistent-id")
except KnobaseError as e:
    print(e, e.code, e.status)
```

## Configuration

| Parameter | Type | Default | Description           |
|-----------|------|---------|-----------------------|
| api_url   | str  | —       | Your Knobase API URL  |
| api_key   | str  | —       | Your API key          |
| timeout   | int  | 30      | Request timeout (sec) |
