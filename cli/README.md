# knobase-cli

Command-line interface for managing Knobase documents.

## Installation

```bash
npm install -g knobase-cli
```

## Authentication

```bash
knobase login
```

You'll need your API URL and API key. Generate an API key from your Knobase dashboard under Settings > API Keys.

## Commands

### Push a document

```bash
knobase push my-notes.md
```

Uploads a markdown file as a new document. Frontmatter tags are preserved.

### Pull a document

```bash
knobase pull <document-id> [output-file]
```

Downloads a document as a markdown file with frontmatter.

### List documents

```bash
knobase list
knobase list --limit 50
knobase list --search "project"
```

### Search

```bash
knobase search "quarterly review"
knobase search "meeting notes" --tags work,meetings
```

### Sync a folder

```bash
knobase sync
knobase sync ./my-docs/
```

Recursively finds all `.md` files and uploads them.

## Configuration

Config is stored at `~/.knobase/config.json`:

```json
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "kb_your_api_key_here"
}
```
