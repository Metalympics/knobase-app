-- Migration: Permission System - Page-level sharing
-- Created: 2024-03-11
-- Updated: uses page_permissions / page_public_links (not document_*)

-- ============================================
-- 1. Page Permissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('full', 'edit', 'comment', 'view')),
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_page ON page_permissions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON page_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_granted_by ON page_permissions(granted_by);

-- ============================================
-- 2. Page Public Links Table
-- ============================================

CREATE TABLE IF NOT EXISTS page_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id)
);

CREATE INDEX IF NOT EXISTS idx_page_public_links_token ON page_public_links(access_token);
CREATE INDEX IF NOT EXISTS idx_page_public_links_page ON page_public_links(page_id);

-- ============================================
-- 3. Helper Functions
-- ============================================

CREATE OR REPLACE FUNCTION can_access_page(p_page_id UUID, p_user_auth_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pages p
    WHERE p.id = p_page_id
    AND (
      p.created_by = p_user_auth_id
      OR p.visibility = 'public'
      OR (p.visibility IN ('shared', 'public') AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = p_user_auth_id
        AND u.school_id = p.school_id
      ))
      OR EXISTS (
        SELECT 1 FROM page_permissions pp
        JOIN users u ON u.id = pp.user_id
        WHERE pp.page_id = p_page_id
        AND u.auth_id = p_user_auth_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_page_permission(p_page_id UUID, p_user_auth_id UUID)
RETURNS TEXT AS $$
DECLARE
  is_owner BOOLEAN;
  explicit_perm TEXT;
  vis TEXT;
BEGIN
  SELECT (created_by = p_user_auth_id) INTO is_owner
  FROM pages WHERE id = p_page_id;

  IF is_owner THEN RETURN 'full'; END IF;

  SELECT pp.permission INTO explicit_perm
  FROM page_permissions pp
  JOIN users u ON u.id = pp.user_id
  WHERE pp.page_id = p_page_id
  AND u.auth_id = p_user_auth_id
  LIMIT 1;

  IF explicit_perm IS NOT NULL THEN RETURN explicit_perm; END IF;

  SELECT visibility INTO vis FROM pages WHERE id = p_page_id;

  IF vis = 'public' THEN
    SELECT permission INTO explicit_perm
    FROM page_public_links
    WHERE page_id = p_page_id AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    RETURN COALESCE(explicit_perm, 'view');
  END IF;

  IF vis = 'shared' THEN
    IF EXISTS (
      SELECT 1 FROM users u
      JOIN pages p ON p.school_id = u.school_id
      WHERE p.id = p_page_id AND u.auth_id = p_user_auth_id
    ) THEN
      RETURN 'edit';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Triggers for Updated At
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_page_permissions_updated_at
  BEFORE UPDATE ON page_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_public_links_updated_at
  BEFORE UPDATE ON page_public_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
