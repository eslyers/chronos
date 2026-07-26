-- ============================================================================
-- CHRONOS — Limpeza de templates: remove Fitness e duplicatas
-- Execute este SQL no Supabase SQL Editor
-- ============================================================================

-- 1. Remove template Fitness (nao corporativo)
DELETE FROM public.templates
WHERE category = 'Fitness';

-- 2. Remove duplicatas de "Gestao de Eventos Corporativos"
-- Mantém apenas o registro com menor ID (mais antigo) de cada nome duplicado
DELETE FROM public.templates
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.templates
  GROUP BY name
)
AND is_public = TRUE;

-- Verificação: lista templates restantes
SELECT id, name, category, icon FROM public.templates WHERE is_public = TRUE ORDER BY name;
