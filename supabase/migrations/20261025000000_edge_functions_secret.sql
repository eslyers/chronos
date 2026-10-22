-- ============================================================================
-- CHRONOS Migration: 20261025000000_edge_functions_secret.sql
-- Autenticação dos triggers e do cron que chamam as Edge Functions.
--
-- As funções passaram a exigir "Authorization: Bearer <segredo>". Os triggers
-- liam o segredo de app.service_role_key / app.settings.service_role_key, que
-- estão vazias — e o Supabase hospedado não permite mais ALTER DATABASE SET.
-- O segredo agora fica no Supabase Vault (secret "edge_functions_secret"), o
-- mesmo valor de EDGE_FUNCTIONS_SECRET nas secrets das Edge Functions.
--
-- O valor do segredo NÃO fica no repositório. Criar uma vez (SQL Editor):
--   SELECT vault.create_secret('<valor>', 'edge_functions_secret');
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Cabeçalho de autenticação, lido do Vault
-- plpgsql + EXECUTE: não depende do schema vault em tempo de criação
-- (ambientes sem Vault, como o teste em PGlite, caem no fallback).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.edge_functions_auth_header()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO v_secret
      USING 'edge_functions_secret';
  END IF;
  -- Fallback legado (vazio em produção)
  v_secret := COALESCE(NULLIF(v_secret, ''), NULLIF(current_setting('app.service_role_key', true), ''), '');
  RETURN 'Bearer ' || v_secret;
END;
$$;

-- Só o dono (triggers SECURITY DEFINER e o job do pg_cron) pode ler o segredo
REVOKE EXECUTE ON FUNCTION public.edge_functions_auth_header() FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Triggers de notificação (corpo idêntico ao de produção, exceto o header)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url TEXT;
BEGIN
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
        'Authorization', public.edge_functions_auth_header()
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
$$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
        'Authorization', public.edge_functions_auth_header()
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
$$;

CREATE OR REPLACE FUNCTION public.notify_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
        'Authorization', public.edge_functions_auth_header()
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
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Job diário do pg_cron (alerta de prazos) usa o mesmo cabeçalho
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_jobid BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;
  EXECUTE 'SELECT jobid FROM cron.job WHERE jobname = $1' INTO v_jobid USING 'due-soon-alert-daily';
  IF v_jobid IS NULL THEN
    RETURN;
  END IF;
  EXECUTE 'SELECT cron.alter_job(job_id := $1, command := $2)'
    USING v_jobid, $cmd$SELECT net.http_post(
      url := 'https://qzfhjuawxytzcqwtlhof.supabase.co/functions/v1/due-soon-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', public.edge_functions_auth_header()
      ),
      body := '{}'::jsonb
    )$cmd$;
END $$;
