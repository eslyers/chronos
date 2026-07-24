-- CHRONOS Migration: 20260723000000_add_tasks_position.sql
-- Adiciona coluna position em tasks para ordenação manual dentro de cada stage
-- (usado pelo Kanban drag-and-drop e pela rota de import)
--
-- Bug fix: a rota /api/tasks/import inseria position no payload mas a coluna
-- não existia → todas as 83 inserts falhavam silenciosamente com
-- "Could not find the 'position' column of 'tasks' in the schema cache".

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Índice composto pra queries de ordenação por stage/position
CREATE INDEX IF NOT EXISTS idx_tasks_stage_position
  ON public.tasks(stage_id, position);

-- Backfill: garante que tasks existentes sem position tenham valores únicos por stage
-- (não estritamente necessário já que tem DEFAULT 0, mas evita conflitos em reordenação futura)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
BEGIN
  FOR rec IN
    SELECT stage_id, id
    FROM public.tasks
    WHERE position = 0
    ORDER BY stage_id, created_at
  LOOP
    SELECT COUNT(*) INTO counter
    FROM public.tasks
    WHERE stage_id = rec.stage_id AND id < rec.id;
    UPDATE public.tasks
    SET position = counter
    WHERE id = rec.id;
  END LOOP;
END $$;