# Authentication and Multi-Tenant Architecture

This directory contains the authentication and Supabase client setup for Knobase's multi-tenant architecture.

## Architecture Overview

### Database Schema

- **auth.users** - Supabase's built-in authentication table
- **public.users** - User profiles with `auth_id` referencing `auth.users(id)`
- **public.workspaces** - Workspaces owned by users
- **public.workspace_members** - Many-to-many relationship between users and workspaces
- **public.documents** - Documents belong to workspaces, not users directly

### Multi-Tenant Flow

1. User signs up → Creates entry in `auth.users`
2. Trigger automatically creates profile in `public.users`
3. User creates or joins workspaces
4. Documents are scoped to workspaces
5. Users access documents through workspace membership

## Files

### `lib/supabase/client.ts`

Provides three types of Supabase clients:

```typescript
import { createClient, createServerClient, createAdminClient } from '@/lib/supabase/client';

// Browser client (client components)
const supabase = createClient();

// Server client (API routes, server components)
const supabase = await createServerClient();

// Admin client (admin operations, bypasses RLS)
const adminSupabase = createAdminClient();
```

#### Browser Client
- Use in client components
- Automatic cookie-based session management
- Respects Row Level Security (RLS)

#### Server Client
- Use in API routes and Server Components
- Uses Next.js cookies for session
- Respects Row Level Security (RLS)

#### Admin Client
- Use only in server-side code
- Uses service role key
- **Bypasses RLS** - use with caution
- For admin operations like creating users, bulk operations

### `lib/auth/provider.tsx`

React Context provider for authentication state.

```typescript
import { AuthProvider, useAuth } from '@/lib/auth/provider';

// Wrap your app
<AuthProvider>
  <YourApp />
</AuthProvider>

// Use in components
function MyComponent() {
  const { user, session, loading, signUp, signIn, signOut, updateProfile } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome {user.email}</div>;
}
```

#### Features

- `user` - Current authenticated user from `auth.users`
- `session` - Current session
- `loading` - Auth state loading indicator
- `signUp(email, password, displayName?)` - Register new user
  - Automatically creates profile in `public.users`
- `signIn(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `updateProfile({ displayName?, avatarUrl? })` - Update user profile

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Only for admin operations
```

### 2. Database Migration

Run the migration file `supabase/migrations/003_multi_tenant_auth.sql` in the Supabase SQL Editor.

This creates:
- User profiles table
- Workspaces and workspace members tables
- Row Level Security policies
- Automatic profile creation trigger

### 3. Wrap Your App

```tsx
// app/layout.tsx
import { AuthProvider } from '@/lib/auth/provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Usage Examples

### Sign Up

```typescript
const { signUp } = useAuth();

const handleSignUp = async () => {
  const { error } = await signUp(
    'user@example.com',
    'password123',
    'John Doe'
  );
  
  if (error) {
    console.error('Sign up failed:', error);
  } else {
    // User created and profile set up automatically
  }
};
```

### Sign In

```typescript
const { signIn } = useAuth();

const handleSignIn = async () => {
  const { error } = await signIn('user@example.com', 'password123');
  
  if (error) {
    console.error('Sign in failed:', error);
  }
};
```

### Protected Routes

```tsx
// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <div>Dashboard content</div>;
}
```

### Server-Side Data Fetching

```typescript
// app/api/workspaces/route.ts
import { createServerClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch user's workspaces (RLS policies apply)
  const { data, error } = await supabase
    .from('workspaces')
    .select('*, workspace_members(*)')
    .eq('workspace_members.user_id', user.id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
```

### Admin Operations

```typescript
// app/api/admin/users/route.ts
import { createAdminClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Verify admin permissions here
  
  const adminSupabase = createAdminClient();
  
  // Admin can bypass RLS
  const { data, error } = await adminSupabase
    .from('users')
    .select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with the following rules:

- **Users**: Can only read/update their own profile
- **Workspaces**: Users can only see workspaces they own or are members of
- **Workspace Members**: Can be managed by workspace admins
- **Documents**: 
  - Public documents visible to all
  - Workspace documents visible to members
  - Only editors/admins can create/update
  - Only document creator or admins can delete

### Service Role Key

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client
- Only use in server-side code (API routes, server actions)
- Has full database access, bypassing all RLS policies
- Use only for legitimate admin operations

### Best Practices

1. Always use browser client in client components
2. Use server client for API routes and server components
3. Only use admin client when absolutely necessary
4. Validate user permissions before admin operations
5. Never trust client-side data - always verify on server
6. Use RLS policies as the primary security layer

## TypeScript Types

The client exports TypeScript types for the database schema:

```typescript
import type { Database, Tables, InsertDto, UpdateDto } from '@/lib/supabase/client';

// Get row type
type User = Tables<'users'>;

// Get insert type
type NewUser = InsertDto<'users'>;

// Get update type
type UpdateUser = UpdateDto<'users'>;
```

## Migration from Local Storage

If you're migrating from local storage to Supabase:

1. Export existing data from local storage
2. Run the migration SQL
3. Update components to use `useAuth` instead of local state
4. Update data fetching to use Supabase client
5. Import existing data into workspaces for each user

## Troubleshooting

### "No user logged in" error

Make sure you're using `useAuth()` within a component wrapped by `<AuthProvider>`.

### Session not persisting

Check that cookies are enabled and `createBrowserClient` is being used in client components.

### RLS policy errors

Verify that:
1. The user is authenticated
2. The user has proper workspace membership
3. RLS policies match your intended access patterns

### Admin client not working

Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and you're using the admin client only in server-side code.
