-- =============================================================================
-- CHRONOS — Setup Cron Job no Supabase (pg_cron + pg_net)
-- =============================================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New Query → colar + Run
-- O que faz: agenda a Edge Function due-soon-alert pra rodar 1x por dia às 9h BRT
-- =============================================================================

-- 1) Habilitar extensões (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Remover job antigo se existir (pra poder re-rodar sem erro)
SELECT cron.unschedule('due-soon-alert-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'due-soon-alert-daily');

-- 3) Agendar novo job: 9h BRT (= 12h UTC) todo dia
SELECT cron.schedule(
  'due-soon-alert-daily',     -- nome do job
  '0 12 * * *',                -- cron expr (12:00 UTC = 09:00 BRT)
  $$SELECT net.http_post(
      url := 'https://qzfhjuawxytzcqwtlhof.supabase.co/functions/v1/due-soon-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
  )$$
);

-- 4) Conferir se foi criado
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'due-soon-alert-daily';

-- =============================================================================
-- IMPORTANTE: A `app.settings.service_role_key` precisa estar setada no postgres.
-- Se der erro de "unrecognized configuration parameter", rodar antes:
--
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGci...SUA_SERVICE_KEY_AQUI';
--
-- Ou, alternativa sem ALTER DATABASE: usar a service_role key literal direto:
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGci...SUA_SERVICE_ROLE_KEY_AQUI'
--   )
-- =============================================================================
