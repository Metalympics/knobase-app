-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Creates marketplace tables for knowledge packs, purchases, and import jobs.
-- Depends on: 003_multi_tenant_auth.sql (users, workspaces)

-- ============================================
-- 1. KNOWLEDGE PACKS (marketplace listings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_packs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  creator_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Metadata
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  short_description   TEXT,
  readme              TEXT,

  -- Package manifest (agents, docs, workflows definition)
  manifest            JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Pricing
  price_cents         INTEGER NOT NULL DEFAULT 0,
  currency            TEXT DEFAULT 'USD',

  -- Stats
  sales_count         INTEGER DEFAULT 0,
  rating_average      DECIMAL(2,1) DEFAULT 0.0,
  rating_count        INTEGER DEFAULT 0,

  -- Publishing
  status              TEXT DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending_review', 'active', 'rejected', 'archived')),
  featured            BOOLEAN DEFAULT false,
  published_at        TIMESTAMPTZ,

  -- Media
  preview_images      TEXT[] DEFAULT '{}',
  thumbnail_url       TEXT,
  demo_video_url      TEXT,
  package_url         TEXT,        -- URL to the .openclaw file in Supabase Storage

  -- Categorization
  categories          TEXT[] DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',

  -- Content counts (denormalized for listing cards)
  agent_count         INTEGER DEFAULT 0,
  document_count      INTEGER DEFAULT 0,
  workflow_count      INTEGER DEFAULT 0,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_packs_slug
  ON public.knowledge_packs(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_status
  ON public.knowledge_packs(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_creator
  ON public.knowledge_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_featured
  ON public.knowledge_packs(featured)
  WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_categories
  ON public.knowledge_packs USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_tags
  ON public.knowledge_packs USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_fts
  ON public.knowledge_packs
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE TRIGGER knowledge_packs_updated_at
  BEFORE UPDATE ON public.knowledge_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. PACK PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id                  UUID NOT NULL REFERENCES public.knowledge_packs(id) ON DELETE CASCADE,
  buyer_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_session_id        TEXT,

  -- Amount
  amount_cents             INTEGER NOT NULL,
  currency                 TEXT DEFAULT 'USD',

  -- Status
  status                   TEXT DEFAULT 'pending'
                           CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),

  created_at               TIMESTAMPTZ DEFAULT now(),
  completed_at             TIMESTAMPTZ,

  UNIQUE(pack_id, buyer_id)   -- one purchase per user per pack
);

CREATE INDEX IF NOT EXISTS idx_pack_purchases_pack_id
  ON public.pack_purchases(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_buyer_id
  ON public.pack_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_status
  ON public.pack_purchases(status);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_stripe
  ON public.pack_purchases(stripe_session_id);

-- ============================================
-- 3. IMPORT JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Source
  source_type           TEXT NOT NULL CHECK (source_type IN ('file_upload', 'marketplace_purchase', 'url')),
  source_id             UUID,               -- pack_id if from marketplace
  original_filename     TEXT,

  -- Progress
  status                TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  manifest              JSONB,              -- parsed manifest for preview

  -- Result
  created_documents     UUID[] DEFAULT '{}',
  created_agents        TEXT[] DEFAULT '{}',
  error_message         TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id
  ON public.import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_workspace_id
  ON public.import_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status
  ON public.import_jobs(status);

-- ============================================
-- 4. PACK REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       UUID NOT NULL REFERENCES public.knowledge_packs(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(pack_id, reviewer_id) -- one review per user per pack
);

CREATE INDEX IF NOT EXISTS idx_pack_reviews_pack_id
  ON public.pack_reviews(pack_id);

CREATE TRIGGER pack_reviews_updated_at
  BEFORE UPDATE ON public.pack_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- TRIGGER: Update rating stats on review change
-- ============================================
CREATE OR REPLACE FUNCTION public.update_pack_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.knowledge_packs
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.pack_reviews
      WHERE pack_id = COALESCE(NEW.pack_id, OLD.pack_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.pack_reviews
      WHERE pack_id = COALESCE(NEW.pack_id, OLD.pack_id)
    )
  WHERE id = COALESCE(NEW.pack_id, OLD.pack_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_pack_rating_insert
  AFTER INSERT ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

CREATE TRIGGER trg_update_pack_rating_update
  AFTER UPDATE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

CREATE TRIGGER trg_update_pack_rating_delete
  AFTER DELETE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

-- ============================================
-- TRIGGER: Increment sales_count on purchase completion
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.knowledge_packs
    SET sales_count = sales_count + 1
    WHERE id = NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_sales
  AFTER UPDATE ON public.pack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.increment_sales_count();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.knowledge_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_reviews ENABLE ROW LEVEL SECURITY;

-- knowledge_packs: anyone can view active, creators manage their own
CREATE POLICY "Anyone can view active packs"
  ON public.knowledge_packs FOR SELECT
  TO authenticated
  USING (status = 'active' OR status = 'featured');

CREATE POLICY "Creators can view their own packs"
  ON public.knowledge_packs FOR SELECT
  TO authenticated
  USING (creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Creators can create packs"
  ON public.knowledge_packs FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Creators can update their packs"
  ON public.knowledge_packs FOR UPDATE
  TO authenticated
  USING (creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1))
  WITH CHECK (creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Creators can delete draft packs"
  ON public.knowledge_packs FOR DELETE
  TO authenticated
  USING (
    creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    AND status = 'draft'
  );

CREATE POLICY "Service role full access to packs"
  ON public.knowledge_packs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- pack_purchases: buyers see their own
CREATE POLICY "Buyers can view their purchases"
  ON public.pack_purchases FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Creators can view purchases of their packs"
  ON public.pack_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_packs kp
      WHERE kp.id = pack_purchases.pack_id
      AND kp.creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Service role full access to purchases"
  ON public.pack_purchases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- import_jobs: users see their own
CREATE POLICY "Users can view their import jobs"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create import jobs"
  ON public.import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Service role full access to import jobs"
  ON public.import_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- pack_reviews: anyone can read, authenticated can write
CREATE POLICY "Anyone can view reviews"
  ON public.pack_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Purchasers can create reviews"
  ON public.pack_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM public.pack_purchases pp
      WHERE pp.pack_id = pack_reviews.pack_id
      AND pp.buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
      AND pp.status = 'completed'
    )
  );

CREATE POLICY "Reviewers can update their reviews"
  ON public.pack_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1))
  WITH CHECK (reviewer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

-- ============================================
-- ENABLE REALTIME for import jobs (progress tracking)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;

-- ============================================
-- STORAGE BUCKET for .openclaw packages
-- ============================================
-- Run this separately in Supabase Dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('openclaw-packages', 'openclaw-packages', false);
