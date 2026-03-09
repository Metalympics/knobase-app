-- Migration 012: Marketplace System
-- Adapted for schools-based multi-tenancy
--
-- Creates marketplace tables for knowledge packs, purchases, and reviews
-- Optional: Only needed if launching marketplace feature
--
-- Dependencies:
-- - schools table
-- - users table

-- ============================================
-- 1. knowledge_packs - Marketplace listings
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  
  -- Creator (can be a user in a school, or system admin with null school)
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  creator_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  readme TEXT,
  
  -- Package content definition
  manifest JSONB NOT NULL DEFAULT '{}',
  
  -- Content counts (denormalized for listing)
  agent_count INTEGER DEFAULT 0,
  document_count INTEGER DEFAULT 0,
  workflow_count INTEGER DEFAULT 0,
  
  -- Pricing
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Stats
  sales_count INTEGER DEFAULT 0,
  rating_average DECIMAL(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  
  -- Publishing state
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_review', 'active', 'rejected', 'archived')),
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  
  -- Media
  preview_images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  demo_video_url TEXT,
  package_url TEXT,
  
  -- Categorization
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  education_level TEXT[] DEFAULT '{}', -- e.g., ['elementary', 'middle', 'high']
  subject_areas TEXT[] DEFAULT '{}',   -- e.g., ['math', 'science', 'history']
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_slug ON public.knowledge_packs(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_creator ON public.knowledge_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_status ON public.knowledge_packs(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_featured ON public.knowledge_packs(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_categories ON public.knowledge_packs USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_tags ON public.knowledge_packs USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_education ON public.knowledge_packs USING gin(education_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_subjects ON public.knowledge_packs USING gin(subject_areas);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_fts ON public.knowledge_packs 
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Auto-update timestamp
DROP TRIGGER IF EXISTS knowledge_packs_updated_at ON public.knowledge_packs;
CREATE TRIGGER knowledge_packs_updated_at
  BEFORE UPDATE ON public.knowledge_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. pack_purchases - Purchase records
-- ============================================

CREATE TABLE IF NOT EXISTS public.pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was bought
  pack_id UUID NOT NULL REFERENCES public.knowledge_packs(id) ON DELETE CASCADE,
  
  -- Who bought it
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  
  -- Payment info
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  
  -- Amount
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- One purchase per pack per user
  UNIQUE(pack_id, buyer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pack_purchases_pack ON public.pack_purchases(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_buyer ON public.pack_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_status ON public.pack_purchases(status);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_completed ON public.pack_purchases(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================
-- 3. pack_reviews - User reviews and ratings
-- ============================================

CREATE TABLE IF NOT EXISTS public.pack_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was reviewed
  pack_id UUID NOT NULL REFERENCES public.knowledge_packs(id) ON DELETE CASCADE,
  
  -- Who reviewed
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One review per pack per user
  UNIQUE(pack_id, reviewer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pack_reviews_pack ON public.pack_reviews(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_reviews_rating ON public.pack_reviews(pack_id, rating);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS pack_reviews_updated_at ON public.pack_reviews;
CREATE TRIGGER pack_reviews_updated_at
  BEFORE UPDATE ON public.pack_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 4. Functions for marketplace stats
-- ============================================

-- Update pack rating when reviews change
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

DROP TRIGGER IF EXISTS trg_update_pack_rating_insert ON public.pack_reviews;
CREATE TRIGGER trg_update_pack_rating_insert
  AFTER INSERT ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

DROP TRIGGER IF EXISTS trg_update_pack_rating_update ON public.pack_reviews;
CREATE TRIGGER trg_update_pack_rating_update
  AFTER UPDATE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

DROP TRIGGER IF EXISTS trg_update_pack_rating_delete ON public.pack_reviews;
CREATE TRIGGER trg_update_pack_rating_delete
  AFTER DELETE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

-- Increment sales count on purchase completion
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

DROP TRIGGER IF EXISTS trg_increment_sales ON public.pack_purchases;
CREATE TRIGGER trg_increment_sales
  AFTER UPDATE ON public.pack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.increment_sales_count();

-- ============================================
-- 5. Comments
-- ============================================

COMMENT ON TABLE public.knowledge_packs IS 'Marketplace listings for agent/document/workflow packs';
COMMENT ON TABLE public.pack_purchases IS 'Purchase records for knowledge packs';
COMMENT ON TABLE public.pack_reviews IS 'User ratings and reviews for packs';

-- ============================================
-- 6. Override: align already-applied schema
--    Safe to re-run; all statements are idempotent
-- ============================================

-- Rename bot_count → agent_count if the old column still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'knowledge_packs' AND column_name = 'bot_count') THEN
    ALTER TABLE public.knowledge_packs RENAME COLUMN bot_count TO agent_count;
  END IF;
END $$;

-- ============================================
-- 7. Extend user_type enum for agent support
--    MUST be committed here (in 012) so that migration 013 can use
--    the new values in the same transaction without hitting the
--    "unsafe use of new enum value" restriction.
-- ============================================

ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'human';
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'agent';
