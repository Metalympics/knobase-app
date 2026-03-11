# Knobase Permission & Invitation System Proposal

## Overview

We need two distinct invitation flows that mirror Google Workspace + Google Docs:

1. **Workspace-level invitation** = Adding a member to the organization
2. **Document-level sharing** = Sharing a specific document for collaboration

Both humans and agents use the SAME permission model.

---

## 1. Workspace-Level Invitation (Teammates)

**Purpose:** Add permanent members to the workspace (like adding someone to a Google Workspace)

### Who Can Invite
- Admins: Can invite anyone (humans/agents) with any role
- Editors: Can invite viewers only
- Viewers: Cannot invite

### Roles (Same for Humans & Agents)

| Role | Description | Can Invite? | Can Delete Docs? | Billing |
|------|-------------|-------------|------------------|---------|
| **Admin** | Full workspace control | Yes (any role) | Yes | Managed by admin |
| **Editor** | Create, edit, share docs | Yes (viewers only) | No (own docs only) | Managed by admin |
| **Viewer** | Read + comment only | No | No | Managed by admin |

### Human Invitation Flow
```
Invite Modal → Human Tab
├─ Email: [input]
├─ Role: [Admin | Editor | Viewer] (dropdown)
└─ [Send Invite]
   ↓
Email sent → Click → Auto-join workspace
```

### Agent Invitation Flow (Simplified)
```
Invite Modal → Agent Tab
├─ Name: @ [agent-name] (e.g., @research-bot)
├─ Description: [what this agent does]
├─ Role: [Admin | Editor | Viewer] (same as humans!)
└─ [Create Agent & Generate Key]
   ↓
API Key shown once: knb_live_xxxx
```

**Key Change:** Agents get the SAME role options as humans. No technical scopes.

---

## 2. Document-Level Sharing (Sharing Modal)

**Purpose:** Share a specific document with specific permissions (like sharing a Google Doc)

### Access Levels (Same for Humans & Agents)

| Level | Can View | Can Comment | Can Edit | Can Share |
|-------|----------|-------------|----------|-----------|
| **Full Access** | ✅ | ✅ | ✅ | ✅ |
| **Can Edit** | ✅ | ✅ | ✅ | ❌ |
| **Can Comment** | ✅ | ✅ | ❌ | ❌ |
| **View Only** | ✅ | ❌ | ❌ | ❌ |

### Document Sharing UI
```
Share Dialog
├─ Access: [Full Access | Can Edit | Can Comment | View Only]
├─ Share with:
│  ├─ Search people & agents... (dropdown)
│  └─ Shows workspace teammates (humans + agents)
├─ Link sharing: [Off | View Only | Comment | Edit]
└─ [Copy Link] [Done]
```

### Permission Inheritance
- Document inherits workspace role as BASELINE
- Document-level sharing can ONLY restrict further, not expand
- Example: Editor in workspace → Can be given "View Only" on specific doc

---

## 3. Unified Permission Model

### The Rule
**"An agent is just another user with an API key"**

- Humans authenticate via Google/Email
- Agents authenticate via API Key
- Both have the same roles: Admin, Editor, Viewer
- Both can be @mentioned in documents
- Both receive notifications
- Both show in "Teammates" list

### Document-Level vs Workspace-Level

| Feature | Workspace Level | Document Level |
|---------|----------------|----------------|
| **Scope** | All documents | Single document |
| **Who sets** | Admin/Existing member | Document owner |
| **Can downgrade?** | No | Yes (restrict further) |
| **Affects** | Default access | Override access |

---

## 4. UI Changes Needed

### A. Invite Modal (Workspace Level)

Current (Too Technical):
```
Agent Tab:
├─ Name: @_____
├─ Description: _____
└─ Scopes: ☑ Receive mentions  ☑ MCP read  ☑ MCP write  ☑ List agents
```

Proposed (Simple):
```
Agent Tab:
├─ Name: @_____ (required)
├─ Description: What this agent does (optional)
├─ Role: [Admin | Editor | Viewer] ← Same as humans!
│   └─ Admin: Full workspace control
│   └─ Editor: Can create and edit documents
│   └─ Viewer: Can view and comment only
└─ [Create Agent & Generate API Key]
    
    ⚠️ Save this key - it won't be shown again!
    
    knb_live_xxxxxxxxxxxxxxxx
    
    [Copy Key] [I've Saved It]
```

### B. Share Dialog (Document Level)

New Share Dialog:
```
Share "Document Title"

Who has access
├─ Private to you
├─ Workspace (default for workspace members)
└─ Anyone with the link

Share with specific people
├─ [Search teammates...]
│   └─ Shows: John Doe (human) | @research-bot (agent)
└─ [Select permission: Full Access | Can Edit | Can Comment | View Only]

People with access
├─ You (Owner)
├─ @research-bot (Can Edit) [Change] [Remove]
└─ Jane Smith (View Only) [Change] [Remove]

[Copy Link] [Done]
```

---

## 5. Database Schema Changes

### Current (Too Complex)
```sql
-- agents table with scopes
-- api_keys table with scopes
-- users table with role
```

### Proposed (Unified)
```sql
-- Single users table for both humans and agents
users:
  - id
  - auth_id (null for agents)
  - type: 'human' | 'agent'
  - role: 'admin' | 'editor' | 'viewer'
  - school_id
  - email (for humans) / bot_id (for agents)
  - name
  - ...

-- Document permissions table (for document-level sharing)
document_permissions:
  - document_id
  - user_id
  - permission: 'full' | 'edit' | 'comment' | 'view'
  - granted_by
  - created_at
```

---

## 6. Implementation Priority

### Phase 1: Simplify Agent Invitation
1. ✅ Remove technical scopes from InviteModal
2. ✅ Use role-based system (Admin/Editor/Viewer) for agents
3. ✅ Remove "Receive mentions" checkbox (assumed for all)
4. ✅ Change "List agents" → "Can view collaborators"

### Phase 2: Document-Level Sharing
1. Create ShareDialog component (Google Docs style)
2. Add document_permissions table
3. Implement permission checking in document editor
4. Add "Share" button to document header

### Phase 3: Advanced Features
1. Link sharing (public links with view/comment/edit)
2. Request access flow
3. Transfer ownership
4. Bulk permission changes

---

## 7. Questions for You

1. **Should agents have avatars/profiles?** Like @research-bot having a bot icon and description?

2. **Agent visibility:** Should agents show as "online" when active? Or just always "available"?

3. **Document owner:** Can an agent own a document? Or only humans?

4. **Transfer docs:** If a human leaves, can their docs auto-transfer to an admin agent?

5. **Guest access:** Do you want "guest" role for external collaborators (like Google Docs "Anyone with link")?

---

**Recommendation:** Start with Phase 1 immediately (simplify the current InviteModal), then build the ShareDialog for document-level permissions.

Does this align with your vision? Any adjustments needed?