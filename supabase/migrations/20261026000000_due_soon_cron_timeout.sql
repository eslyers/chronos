-- ============================================================================
-- CHRONOS Migration: 20261026000000_due_soon_cron_timeout.sql
-- O job diário chamava a Edge Function due-soon-alert com o timeout padrão do
-- pg_net (5 s). A função leva mais que isso para enviar os alertas, então a
-- chamada era cortada (net._http_response: "Timeout of 5000 ms reached").
-- Agora espera até 120 s.
-- ============================================================================
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
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )$cmd$;
END $$;
