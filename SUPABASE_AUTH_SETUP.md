# Supabase Authentication Setup - Complete

This document provides a complete overview of the Supabase authentication system implemented for Knobase's multi-tenant architecture.

## Files Created

### Core Files

1. **`lib/supabase/client.ts`** - Supabase client factory
   - `createClient()` - Browser client for client-side usage
   - `createServerClient()` - Server client for API routes
   - `createAdminClient()` - Admin client for privileged operations
   - TypeScript Database types

2. **`lib/auth/provider.tsx`** - React Context for auth state
   - `AuthProvider` component
   - `useAuth()` hook
   - Auth methods: `signUp()`, `signIn()`, `signOut()`, `updateProfile()`
   - Automatic profile creation in `public.users`

3. **`lib/auth/use-user-profile.ts`** - Hook to fetch user profile
   - `useUserProfile()` - Returns user profile from `public.users`

4. **`lib/auth/utils.ts`** - Server-side auth utilities
   - `getCurrentUser()` - Get current user profile
   - `getUserWorkspaces()` - Get user's workspaces
   - `getUserWorkspaceRole()` - Get user's role in workspace
   - `canEditDocument()` - Check document edit permission
   - `canDeleteDocument()` - Check document delete permission
   - `isWorkspaceAdmin()` - Check if user is workspace admin
   - `getUsersByWorkspace()` - Get all users in workspace
   - `getWorkspaceDocuments()` - Get workspace documents

5. **`lib/auth/index.ts`** - Barrel export file

### Example Files

6. **`lib/auth/example.tsx`** - Example auth component
7. **`lib/auth/example-api-route.ts`** - Example API route with auth
8. **`lib/auth/README.md`** - Comprehensive documentation

### Database Migration

9. **`supabase/migrations/003_multi_tenant_auth.sql`** - Database schema
   - Creates `users`, `workspaces`, `workspace_members` tables
   - Updates `documents` table with workspace relation
   - Row Level Security (RLS) policies
   - Auto-update triggers
   - Automatic profile creation trigger

### Middleware

10. **`middleware.ts`** - Next.js middleware for route protection
    - Protects routes requiring authentication
    - Redirects authenticated users from auth pages
    - Cookie-based session management

### Configuration

11. **`.env.local.example`** - Updated with service role key

## Multi-Tenant Architecture

```
auth.users (Supabase built-in)
    ↓
public.users (auth_id → auth.users.id)
    ↓
workspace_members (user_id → users.id)
    ↓
public.workspaces
    ↓
public.documents (workspace_id → workspaces.id)
```

### Key Concepts

- **Users** belong to multiple **workspaces**
- **Documents** belong to **workspaces**, not users
- **Permissions** are managed through workspace membership roles
- **Roles**: `admin`, `editor`, `viewer`

## Quick Start

### 1. Environment Setup

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Run Database Migration

Copy and run `supabase/migrations/003_multi_tenant_auth.sql` in Supabase SQL Editor.

### 3. Wrap App with AuthProvider

```tsx
// app/layout.tsx
import { AuthProvider } from '@/lib/auth';

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

### 4. Use in Components

```tsx
'use client';
import { useAuth } from '@/lib/auth';

export default function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return (
    <div>
      <p>Welcome {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 5. Use in API Routes

```tsx
// app/api/my-route/route.ts
import { createServerClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/utils';

export async function GET() {
  const supabase = await createServerClient();
  const user = await getCurrentUser(supabase);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch data with RLS policies applied
  const { data } = await supabase
    .from('workspaces')
    .select('*');
  
  return NextResponse.json(data);
}
```

## Features Implemented

### ✅ Authentication
- Email/password sign up
- Email/password sign in
- Sign out
- Session management
- Auto profile creation

### ✅ User Profiles
- Stored in `public.users`
- Links to `auth.users` via `auth_id`
- Display name and avatar support
- Update profile functionality

### ✅ Multi-Tenancy
- Users can belong to multiple workspaces
- Workspace ownership
- Member roles (admin, editor, viewer)
- Invite codes for joining workspaces

### ✅ Row Level Security
- Users can only read their own profile
- Users can only see workspaces they belong to
- Document access controlled by workspace membership
- Role-based permissions (admin, editor, viewer)

### ✅ TypeScript Support
- Full database type definitions
- Type-safe queries
- IntelliSense for tables and columns

### ✅ Next.js App Router
- Client components support
- Server components support
- API routes support
- Middleware for route protection
- Cookie-based session management

## Security Best Practices

### ✅ Row Level Security (RLS)
All tables have RLS enabled with appropriate policies.

### ✅ Service Role Protection
Service role key is server-side only and never exposed to client.

### ✅ Session Management
Cookie-based sessions with automatic refresh.

### ✅ Permission Checks
Helper functions to check permissions before operations.

### ✅ Input Validation
Validate all inputs on server-side before database operations.

## Testing

You can test the authentication system using the example component:

```tsx
// In any page
import { AuthExample } from '@/lib/auth/example';

export default function Page() {
  return <AuthExample />;
}
```

## Common Operations

### Create a Workspace

```typescript
const supabase = await createServerClient();
const user = await getCurrentUser(supabase);

const { data: workspace } = await supabase
  .from('workspaces')
  .insert({
    name: 'My Workspace',
    slug: 'my-workspace',
    owner_id: user.id,
    invite_code: 'ABC123',
  })
  .select()
  .single();

// Add creator as admin
await supabase.from('workspace_members').insert({
  workspace_id: workspace.id,
  user_id: user.id,
  role: 'admin',
});
```

### Create a Document

```typescript
const { data: doc } = await supabase
  .from('documents')
  .insert({
    title: 'My Document',
    content: 'Document content',
    workspace_id: 'workspace-uuid',
    created_by: user.id,
    visibility: 'shared',
  })
  .select()
  .single();
```

### Check Permissions

```typescript
import { canEditDocument, isWorkspaceAdmin } from '@/lib/auth/utils';

const canEdit = await canEditDocument(supabase, docId, userId);
const isAdmin = await isWorkspaceAdmin(supabase, workspaceId, userId);
```

## Migration Path

If you have existing data in local storage, you'll need to:

1. Run the database migration
2. Create user accounts
3. Create workspaces for each user
4. Migrate documents to workspaces
5. Update components to use Supabase instead of local storage

## Troubleshooting

### "Missing NEXT_PUBLIC_SUPABASE_URL" error
Add environment variables to `.env.local`.

### RLS policy errors
Verify user has proper workspace membership and role.

### Session not persisting
Check that cookies are enabled and middleware is configured.

### Admin operations failing
Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and using `createAdminClient()`.

## Next Steps

1. Add email verification
2. Add password reset
3. Add OAuth providers (Google, GitHub, etc.)
4. Add magic link authentication
5. Add two-factor authentication
6. Add role-based UI components
7. Add workspace invitation system
8. Add audit logging

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/guides/api/generating-types)

## Support

For issues or questions:
1. Check the README in `lib/auth/README.md`
2. Review example files in `lib/auth/`
3. Check Supabase documentation
4. Review RLS policies in migration file
