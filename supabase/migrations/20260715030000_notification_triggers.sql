-- ============================================================================
-- CHRONOS Migration: 20260715030000_notification_triggers.sql
-- Adiciona triggers que chamam Edge Functions automaticamente
-- Requer: pg_net extension habilitada no Supabase
-- ============================================================================

-- Habilitar pg_net (built-in no Supabase, mas garantindo)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER: stage_change → chama Edge Function stage-change-notify
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
BEGIN
  -- Pega URL do projeto Supabase via env var
  v_url := COALESCE(
    current_setting('app.supabase_url', true),
    'https://qzfhjuawxytzcqwtlhof.supabase.co'
  );

  -- Só dispara se stage realmente mudou
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/stage-change-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.service_role_key', true), '')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', jsonb_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'stage_id', NEW.stage_id,
          'assignee_id', NEW.assignee_id,
          'progress', NEW.progress,
          'due_date', NEW.due_date,
          'project_id', NEW.project_id,
          'priority', NEW.priority
        ),
        'old_record', jsonb_build_object(
          'id', OLD.id,
          'stage_id', OLD.stage_id
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop se já existir, depois cria
DROP TRIGGER IF EXISTS trigger_notify_stage_change ON public.tasks;
CREATE TRIGGER trigger_notify_stage_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stage_change();

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER: assignment_change → chama Edge Function task-assigned-notify
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
BEGIN
  v_url := COALESCE(
    current_setting('app.supabase_url', true),
    'https://qzfhjuawxytzcqwtlhof.supabase.co'
  );

  -- Só dispara se assignee mudou (de NULL pra alguém, ou de alguém pra outro alguém)
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND NEW.assignee_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/task-assigned-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.service_role_key', true), '')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', jsonb_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'assignee_id', NEW.assignee_id,
          'due_date', NEW.due_date,
          'priority', NEW.priority,
          'project_id', NEW.project_id
        ),
        'old_record', jsonb_build_object(
          'id', OLD.id,
          'assignee_id', OLD.assignee_id
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_task_assigned
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- ────────────────────────────────────────────────────────────────────────────
-- Também criar trigger de INSERT (pra quando cria task já com assignee)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_task_created()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
BEGIN
  v_url := COALESCE(
    current_setting('app.supabase_url', true),
    'https://qzfhjuawxytzcqwtlhof.supabase.co'
  );

  -- Só dispara se foi criada já com assignee
  IF NEW.assignee_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/task-assigned-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.service_role_key', true), '')
      ),
      body := jsonb_build_object(
        'type', 'UPDATE', -- finge UPDATE pra reutilizar o handler
        'table', TG_TABLE_NAME,
        'record', jsonb_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'assignee_id', NEW.assignee_id,
          'due_date', NEW.due_date,
          'priority', NEW.priority,
          'project_id', NEW.project_id
        ),
        'old_record', jsonb_build_object(
          'id', NEW.id,
          'assignee_id', NULL  -- simula "antes era NULL"
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_task_created ON public.tasks;
CREATE TRIGGER trigger_notify_task_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_created();

-- ============================================================================
-- FIM
-- ============================================================================
