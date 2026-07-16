-- ============================================================================
-- CHRONOS Migration: 20260716000002_add_parent_task_id.sql
-- Adiciona hierarquia de tarefas (WBS): parent_task_id permite sub-tasks
-- Estrutura: projeto > task > sub-task > sub-sub-task (até 5 níveis)
-- ============================================================================

-- Adiciona coluna parent_task_id
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index pra queries hierárquicas
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Constraint: task não pode ser pai de si mesma
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS no_self_parent;
ALTER TABLE public.tasks
  ADD CONSTRAINT no_self_parent CHECK (parent_task_id IS NULL OR parent_task_id != id);

-- ============================================================================
-- FIM
-- ============================================================================