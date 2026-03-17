CREATE TABLE public.agent_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename text NOT NULL,
    content text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (agent_id, filename)
);

CREATE INDEX idx_agent_files_agent_id ON public.agent_files (agent_id);

ALTER TABLE public.agent_files DISABLE ROW LEVEL SECURITY;
