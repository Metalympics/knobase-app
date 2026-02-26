-- ── Migration 009: Workspace Files ──
-- Standalone file storage and management, separate from the markdown documents table.
-- Supports file uploads to Supabase Storage with metadata tracking.

CREATE TABLE IF NOT EXISTS public.workspace_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  file_path       TEXT NOT NULL,                -- Supabase Storage path (relative)
  public_url      TEXT,                         -- Full public URL
  file_type       TEXT NOT NULL CHECK (
    file_type = ANY(ARRAY[
      'pdf','docx','doc','txt','pptx','ppt','html','csv',
      'xlsx','xls','xlsm','json','xml','md','rtf','odt','ods','odp',
      'png','jpg','jpeg','gif','svg','webp','bmp','ico',
      'mp3','mp4','wav','webm','ogg',
      'zip','gz','tar',
      'epub','file'
    ])
  ),
  file_size       BIGINT NOT NULL DEFAULT 0,    -- bytes
  mime_type       TEXT,
  status          TEXT NOT NULL DEFAULT 'ready' CHECK (
    status = ANY(ARRAY['uploading','ready','processing','completed','failed'])
  ),
  uploaded_by     UUID NOT NULL,                -- user who uploaded
  folder_path     TEXT DEFAULT '/',             -- virtual folder path
  description     TEXT,
  tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata        JSONB DEFAULT '{}'::JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workspace_files_workspace ON public.workspace_files(workspace_id);
CREATE INDEX idx_workspace_files_uploader ON public.workspace_files(uploaded_by);
CREATE INDEX idx_workspace_files_type ON public.workspace_files(file_type);
CREATE INDEX idx_workspace_files_folder ON public.workspace_files(workspace_id, folder_path);
CREATE INDEX idx_workspace_files_created ON public.workspace_files(created_at DESC);
CREATE INDEX idx_workspace_files_tags ON public.workspace_files USING GIN (tags);

-- RLS
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

-- Workspace members can view files
CREATE POLICY "Workspace members can view files"
  ON public.workspace_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_files.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

-- Workspace members (editor+) can upload files
CREATE POLICY "Workspace editors can insert files"
  ON public.workspace_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_files.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role IN ('admin', 'editor')
    )
  );

-- File owners and admins can update
CREATE POLICY "File owners and admins can update files"
  ON public.workspace_files FOR UPDATE TO authenticated
  USING (
    uploaded_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_files.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role = 'admin'
    )
  );

-- File owners and admins can delete
CREATE POLICY "File owners and admins can delete files"
  ON public.workspace_files FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_files.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role = 'admin'
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on workspace_files"
  ON public.workspace_files FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER workspace_files_updated_at
  BEFORE UPDATE ON public.workspace_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
