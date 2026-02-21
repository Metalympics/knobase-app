-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Creates multi-tenant architecture with users, workspaces, and workspace members.
-- Documents belong to workspaces, not directly to users.
-- Users can belong to multiple workspaces through workspace_members.

-- Create users table (maps to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{"isPublic": false, "allowGuests": false, "defaultAgent": null}'::jsonb,
  invite_code TEXT NOT NULL UNIQUE,
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workspace_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Update documents table to reference workspaces
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'shared' CHECK (visibility IN ('private', 'shared', 'public'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop old policies on documents if they exist
DROP POLICY IF EXISTS "Allow authenticated access" ON public.documents;
DROP POLICY IF EXISTS "Allow anon access" ON public.documents;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- RLS Policies for workspaces table
CREATE POLICY "Users can read workspaces they belong to" ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Workspace owners can update their workspaces" ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Workspace owners can delete their workspaces" ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- RLS Policies for workspace_members table
CREATE POLICY "Users can read members of their workspaces" ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      INNER JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND (wm.role = 'admin' OR w.owner_id = wm.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      INNER JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND (wm.role = 'admin' OR w.owner_id = wm.user_id)
    )
  );

-- RLS Policies for documents table
CREATE POLICY "Users can read documents in their workspaces" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can create documents in their workspaces" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND wm.role IN ('admin', 'editor')
    )
    AND created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update documents they created or have editor/admin role" ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND wm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND wm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can delete documents in their workspaces" ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND wm.role = 'admin'
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS workspaces_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to automatically create user profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
