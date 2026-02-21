# Quick Reference - Supabase Auth

## Installation

Already installed! Dependencies:
- `@supabase/ssr` - Next.js App Router support
- `@supabase/supabase-js` - Supabase client

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Client Components

### Basic Auth

```tsx
'use client';
import { useAuth } from '@/lib/auth';

export default function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <LoginForm />;
  
  return (
    <div>
      <p>Welcome {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### User Profile

```tsx
'use client';
import { useUserProfile } from '@/lib/auth';

export default function Profile() {
  const { profile, loading } = useUserProfile();
  
  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;
  
  return <div>{profile.display_name}</div>;
}
```

### Workspaces

```tsx
'use client';
import { useWorkspaces } from '@/lib/auth';

export default function WorkspaceList() {
  const { workspaces, loading, refetch } = useWorkspaces();
  
  return (
    <div>
      {workspaces.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## API Routes

### Basic Authentication

```tsx
// app/api/my-route/route.ts
import { createServerClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/utils';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerClient();
  const user = await getCurrentUser(supabase);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Your logic here
  return NextResponse.json({ message: 'Success' });
}
```

### Fetch Data with RLS

```tsx
export async function GET() {
  const supabase = await createServerClient();
  const user = await getCurrentUser(supabase);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}
```

### Create Workspace

```tsx
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const user = await getCurrentUser(supabase);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { name } = await request.json();
  
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      owner_id: user.id,
      invite_code: generateInviteCode(),
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Add creator as admin
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'admin',
  });
  
  return NextResponse.json({ workspace }, { status: 201 });
}
```

## Server Components

```tsx
// app/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = await createServerClient();
  const user = await getCurrentUser(supabase);
  
  if (!user) {
    redirect('/login');
  }
  
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*');
  
  return (
    <div>
      <h1>Welcome {user.display_name}</h1>
      {/* Render workspaces */}
    </div>
  );
}
```

## Permission Checks

```tsx
import { canEditDocument, isWorkspaceAdmin } from '@/lib/auth/utils';

// Check if user can edit document
const canEdit = await canEditDocument(supabase, documentId, userId);

// Check if user is workspace admin
const isAdmin = await isWorkspaceAdmin(supabase, workspaceId, userId);
```

## Admin Operations

```tsx
// Only in server-side code!
import { createAdminClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  // Verify admin permissions first!
  const isAdmin = await verifyAdminPermissions(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const adminSupabase = createAdminClient();
  
  // Admin operations bypass RLS
  const { data } = await adminSupabase
    .from('users')
    .select('*');
  
  return NextResponse.json({ data });
}
```

## TypeScript Types

```tsx
import type {
  UserProfile,
  Workspace,
  Document,
  WorkspaceRole,
} from '@/lib/supabase/types';

const profile: UserProfile = { ... };
const workspace: Workspace = { ... };
const role: WorkspaceRole = 'admin' | 'editor' | 'viewer';
```

## Common Queries

### Get user's workspaces

```tsx
const { data } = await supabase
  .from('workspaces')
  .select(`
    *,
    workspace_members!inner (
      role,
      joined_at
    )
  `)
  .eq('workspace_members.user_id', userId);
```

### Get workspace members

```tsx
const { data } = await supabase
  .from('workspace_members')
  .select(`
    role,
    users (*)
  `)
  .eq('workspace_id', workspaceId);
```

### Get workspace documents

```tsx
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('workspace_id', workspaceId)
  .order('updated_at', { ascending: false });
```

### Create document

```tsx
const { data } = await supabase
  .from('documents')
  .insert({
    title: 'My Document',
    content: '',
    workspace_id: workspaceId,
    created_by: userId,
    visibility: 'shared',
  })
  .select()
  .single();
```

## Error Handling

```tsx
try {
  const { data, error } = await supabase
    .from('documents')
    .select('*');
  
  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ data });
} catch (error) {
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Realtime Subscriptions

```tsx
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RealtimeComponent() {
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel('documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          console.log('Change received!', payload);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return <div>Listening for changes...</div>;
}
```
