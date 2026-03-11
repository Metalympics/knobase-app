# Document Sharing Architecture

## Overview

This document outlines the architecture for document sharing and access control in Knobase, designed to support both human users and AI agents with granular permissions.

## Access Levels

| Level | Permissions | Use Case |
|-------|-------------|----------|
| **View** | Read document content | Read-only access for reviewers |
| **Comment** | View + add comments | Feedback without editing |
| **Edit** | View + Comment + modify content | Collaborative editing |
| **Admin** | Edit + share + delete + manage permissions | Document owner/manager |

## Future Database Schema (Post-localStorage Migration)

### documents table
```sql
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id),
  
  -- Content
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  
  -- Hierarchy
  parent_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Metadata
  is_template BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### document_permissions table
```sql
CREATE TABLE public.document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Access level
  access_level TEXT NOT NULL 
    CHECK (access_level IN ('view', 'comment', 'edit', 'admin')),
  
  -- Who granted this permission
  granted_by UUID NOT NULL REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  
  -- Optional expiration
  expires_at TIMESTAMPTZ,
  
  -- Prevent duplicate permissions
  UNIQUE(document_id, user_id)
);

-- Indexes
CREATE INDEX idx_doc_permissions_document ON public.document_permissions(document_id);
CREATE INDEX idx_doc_permissions_user ON public.document_permissions(user_id);
```

### document_shares table (for public links)
```sql
CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Share token
  token TEXT UNIQUE NOT NULL,
  
  -- Access level for link recipients
  access_level TEXT NOT NULL DEFAULT 'view'
    CHECK (access_level IN ('view', 'comment', 'edit')),
  
  -- Creator
  created_by UUID NOT NULL REFERENCES public.users(id),
  
  -- Settings
  password_hash TEXT, -- Optional password protection
  max_uses INTEGER,   -- Optional usage limit
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0
);
```

## Permission Inheritance Rules

1. **Owner Always Has Admin**
   - Document creator (owner_id) has implicit admin access
   - Cannot be revoked via document_permissions

2. **Workspace Default Access**
   - Optional: All workspace members get 'view' by default
   - Controlled by documents.is_public_workspace boolean

3. **Parent-Child Inheritance**
   - Child documents inherit permissions from parent
   - Can be overridden with explicit permissions

4. **Public Links**
   - Anyone with link token gets specified access_level
   - Does not require workspace membership

## RLS Policies (Row Level Security)

```sql
-- Documents: Users can read if they have permission
CREATE POLICY "Users can view permitted documents" ON public.documents
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.document_permissions
      WHERE document_id = id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.document_shares
      WHERE document_id = id AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Documents: Only owner or admin can update
CREATE POLICY "Only owner or admin can edit" ON public.documents
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.document_permissions
      WHERE document_id = id AND user_id = auth.uid() 
      AND access_level IN ('edit', 'admin')
    )
  );

-- Document permissions: Only admin can manage
CREATE POLICY "Only admins can manage permissions" ON public.document_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.document_permissions dp
      WHERE dp.document_id = document_id 
      AND dp.user_id = auth.uid() 
      AND dp.access_level = 'admin'
    )
  );
```

## MCP Tools for Agents

Agents need the ability to manage document access programmatically:

### 1. share_document
```typescript
{
  name: "share_document",
  description: "Share a document with a user or agent, granting specific access level",
  input: {
    document_id: string,
    target_user_id: string,
    access_level: "view" | "comment" | "edit" | "admin"
  },
  requires_permission: "admin"
}
```

### 2. update_document_access
```typescript
{
  name: "update_document_access",
  description: "Change an existing user's access level to a document",
  input: {
    document_id: string,
    target_user_id: string,
    access_level: "view" | "comment" | "edit" | "admin"
  },
  requires_permission: "admin"
}
```

### 3. remove_document_access
```typescript
{
  name: "remove_document_access",
  description: "Revoke a user's access to a document",
  input: {
    document_id: string,
    target_user_id: string
  },
  requires_permission: "admin"
}
```

### 4. list_document_collaborators
```typescript
{
  name: "list_document_collaborators",
  description: "List all users with access to a document and their permission levels",
  input: {
    document_id: string
  },
  requires_permission: "view"
}
```

### 5. create_share_link
```typescript
{
  name: "create_share_link",
  description: "Create a public shareable link for a document",
  input: {
    document_id: string,
    access_level: "view" | "comment" | "edit",
    expires_in_hours?: number,
    max_uses?: number,
    password?: string
  },
  requires_permission: "admin"
}
```

## UI/UX Design Decisions

### Share Dialog
- **Visibility**: Accessible from document header or "Share" button
- **Components**:
  - Search input for finding users/agents
  - Permission dropdown (view/comment/edit/admin)
  - List of current collaborators
  - Copy link button for public sharing
  - Advanced options (expiration, password)

### Permission Badges
- Color-coded badges in collaborator list
- View: Blue, Comment: Yellow, Edit: Green, Admin: Purple
- Owner badge: Crown icon + "Owner" label

### Access Indicators
- Lock icon on documents user can't access
- Eye icon for view-only
- Pencil icon for edit access
- Crown icon for admin/owner

## Security Considerations

1. **API Key Scope Limitation**
   - Agents can only share documents they have admin access to
   - API key scopes should include `document:share` for this capability

2. **Audit Logging**
   - All permission changes logged to document_activity table
   - Who changed what, when, and from what to what

3. **Rate Limiting**
   - Prevent spam by limiting share invitations per hour
   - Limit public link creation frequency

4. **Validation**
   - Cannot grant higher permissions than you have
   - Cannot remove owner's access
   - Expired links automatically rejected

## Migration Path from localStorage

### Phase 1: Add Supabase Tables
- Create documents, document_permissions, document_shares tables
- Set up RLS policies

### Phase 2: Sync Existing Documents
- Background job to migrate localStorage docs to Supabase
- Assign current user as owner

### Phase 3: Update Store Layer
- Replace localStorage implementation with Supabase queries
- Add offline caching layer for performance

### Phase 4: Enable Sharing UI
- Release share dialog components
- Add collaborator management

### Phase 5: Add Agent MCP Tools
- Implement share_document, update_access, etc.
- Test agent workflows end-to-end

## Current Status

- ✅ localStorage document store (temporary)
- ✅ UI components designed
- ⏳ Database schema ready for migration
- ⏳ MCP tools ready for implementation
- ⏳ RLS policies defined

## Next Steps

1. Implement database migration when ready to move off localStorage
2. Build share dialog UI components
3. Add MCP tools for permission management
4. Set up audit logging
5. Test agent-to-agent sharing workflows
