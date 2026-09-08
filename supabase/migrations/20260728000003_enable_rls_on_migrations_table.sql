-- ============================================================================
-- CHRONOS Migration: 20260728000003_enable_rls_on_migrations_table.sql
-- Remediação de segurança: Ativa RLS na tabela interna public.supabase_migrations
-- para bloquear leitura/escrita anônima não autenticada via chaves públicas.
-- ============================================================================

ALTER TABLE IF EXISTS public.supabase_migrations ENABLE ROW LEVEL SECURITY;
