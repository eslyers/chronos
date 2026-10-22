-- ============================================================================
-- CHRONOS Migration: 20261023000000_enable_realtime.sql
-- Inclui as tabelas de dados na publicação do Supabase Realtime para que o app
-- receba as mudanças de outros usuários sem recarregar a página.
--
-- A RLS vale também para o Realtime: cada usuário só recebe as linhas que a
-- política de SELECT permite. Idempotente; ignora a publicação ausente
-- (ambientes sem Realtime, como o teste local em PGlite).
-- ============================================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não habilitado.';
    RETURN;
  END IF;

  FOREACH v_table IN ARRAY ARRAY['projects', 'stages', 'tasks', 'task_dependencies']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;
