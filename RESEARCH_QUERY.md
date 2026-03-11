# Deep Research Query: Notion's Workspace/Document Architecture

## Research Questions for Perplexity

### Core Architecture Questions:

1. **URL Structure Deep Dive**
   - How does Notion structure URLs for workspace-owned documents (`/w/{workspaceId}/{docId}`) vs standalone shared documents (`/{docId}`)?
   - When does a document URL include the workspace prefix vs when is it document-only?
   - How does URL structure change based on who is accessing it (owner vs member vs external)?

2. **Sidebar Behavior & Document Lists**
   - When a user is "inside" a workspace context and views a document, what documents appear in their sidebar?
   - If User B (from Workspace B) views Document A (from Workspace A) via a shared link, what sidebar navigation appears?
   - Does the sidebar show Workspace B's documents even when viewing Workspace A's document?
   - How does Notion handle the "switch workspace" dropdown in these scenarios?

3. **Cross-Workspace Document Access Patterns**
   - When Document A is shared with User B (who belongs to Workspace B), where does Document A appear in User B's navigation?
   - Can a document appear in multiple workspaces' sidebars simultaneously?
   - How does Notion determine which workspace context to show when opening a shared document link?

4. **Workspace Context Switching Mechanics**
   - Does visiting `/w/{workspaceId}` always switch the user's active workspace context?
   - What happens if User B bookmarks `/w/workspaceA/doc123` and navigates there directly?
   - How does Notion preserve workspace context across page refreshes?

5. **Permission Models & UX**
   - How does Notion visually distinguish "you're viewing a document not in your workspace"?
   - What happens to workspace-specific features (templates, integrations, etc.) when viewing cross-workspace documents?
   - Do users see workspace branding/identity when viewing shared documents?

### Specific Scenarios:

**Scenario A: Cross-Workspace Collaboration**
- User A in Workspace A shares Document A with User B in Workspace B
- User B clicks the share link while currently "in" Workspace B
- What does User B see? What workspace context is active? What's in the sidebar?

**Scenario B: Document-First Navigation**
- User B has access to documents in Workspace A, B, and C
- User B navigates to a specific document URL directly (not via workspace)
- How does Notion determine which workspace context to activate?

**Scenario C: Nested Page Access**
- Document A has nested subpages (children)
- User B has access to Document A but not all children
- How does sidebar hierarchy display? What happens when clicking restricted child pages?

**Scenario D: External/Public Sharing**
- Document is shared via public link (no workspace membership)
- What URL structure is used? What sidebar/navigation appears?
- How does workspace context work for non-authenticated users?

### Technical Implementation Questions:

6. **Session & State Management**
   - How does Notion track "current workspace context" - cookies, localStorage, URL, or server session?
   - How do they handle the "last active workspace" when returning to the app?
   - Is workspace selection stored per-tab or globally across browser?

7. **Data Models & Database Schema**
   - How does Notion model the relationship between users, workspaces, and documents?
   - Do documents have a single "home workspace" plus additional "shared workspace" references?
   - How do they handle document permissions across workspace boundaries?

8. **Routing & SSR Architecture**
   - When serving a document page, how does the server know which workspace context to render?
   - Do they use middleware for workspace resolution, or is it client-side determined?

---

## Use in Perplexity

Copy this entire query into [Perplexity.ai](https://perplexity.ai) for a deep research report.
