-- Add position column for sibling ordering in the sub-page hierarchy.
-- parent_id already exists from migration 009.

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pages_parent_position
  ON public.pages (parent_id, position);

-- Recursive CTE function: returns the ancestor chain for breadcrumb navigation.
CREATE OR REPLACE FUNCTION public.get_page_ancestors(page_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  icon text,
  parent_id uuid,
  depth int
) AS $$
  WITH RECURSIVE ancestors AS (
    SELECT p.id, p.title, p.icon, p.parent_id, 0 AS depth
    FROM public.pages p
    WHERE p.id = page_uuid
    UNION ALL
    SELECT p.id, p.title, p.icon, p.parent_id, a.depth + 1
    FROM public.pages p
    JOIN ancestors a ON p.id = a.parent_id
  )
  SELECT ancestors.id, ancestors.title, ancestors.icon, ancestors.parent_id, ancestors.depth
  FROM ancestors
  ORDER BY ancestors.depth DESC;
$$ LANGUAGE sql STABLE;

-- Recursive CTE function: returns all descendants of a page (for cascading ops).
CREATE OR REPLACE FUNCTION public.get_page_descendants(page_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  parent_id uuid,
  depth int
) AS $$
  WITH RECURSIVE descendants AS (
    SELECT p.id, p.title, p.parent_id, 0 AS depth
    FROM public.pages p
    WHERE p.parent_id = page_uuid
    UNION ALL
    SELECT p.id, p.title, p.parent_id, d.depth + 1
    FROM public.pages p
    JOIN descendants d ON p.parent_id = d.id
  )
  SELECT descendants.id, descendants.title, descendants.parent_id, descendants.depth
  FROM descendants
  ORDER BY descendants.depth ASC;
$$ LANGUAGE sql STABLE;
