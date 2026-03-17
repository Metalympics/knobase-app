-- Fix trg_populate_notification_actor: was querying public.bots for agent actor
-- names, but agents are stored as users with type='agent' in public.users.
CREATE OR REPLACE FUNCTION public.populate_notification_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actor_name IS NULL AND NEW.actor_id IS NOT NULL THEN
    SELECT name INTO NEW.actor_name
    FROM public.users
    WHERE id = NEW.actor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix create_notification_on_mention: the deep link used '/documents/{id}'
-- which does not exist in the Next.js app router.
-- Correct path is '/s/{school_id}/d/{document_id}'.
CREATE OR REPLACE FUNCTION public.create_notification_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id UUID;
  v_notification_content TEXT;
BEGIN
  IF NEW.target_type = 'human' THEN
    v_target_user_id := NEW.target_id;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.is_agent_generated THEN
    v_notification_content := '🤖 ' || COALESCE(NEW.source_name, 'Someone') || ' mentioned you';
  ELSE
    v_notification_content := COALESCE(NEW.source_name, 'Someone') || ' mentioned you';
  END IF;

  INSERT INTO public.notifications (
    user_id, school_id, type, document_id, mention_id, content,
    actor_type, actor_id, actor_name, context_snippet, link, read, created_at
  ) VALUES (
    v_target_user_id,
    NEW.school_id,
    'mention',
    NEW.document_id,
    NEW.id,
    v_notification_content,
    NEW.source_type,
    NEW.source_id,
    NEW.source_name,
    NEW.context_text,
    '/s/' || NEW.school_id || '/d/' || NEW.document_id,
    false,
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime on the notifications table so the browser subscription works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
