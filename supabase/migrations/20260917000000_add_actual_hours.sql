-- CHRONOS Migration: 20260917000000_add_actual_hours.sql
-- Adicionar coluna actual_hours na tabela tasks para registro de horas reais executadas

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(6,2);

COMMENT ON COLUMN public.tasks.actual_hours IS 'Quantidade de horas reais gastas para conclusão da tarefa';
