-- CHRONOS Migration: 20260724000000_add_assignee_name.sql
-- Suporte a responsáveis pendentes (não-cadastrados) no import
--
-- assignee_id (UUID) continua sendo a FK principal pra auth.users quando o
-- responsável existe. Quando o nome da planilha não bate com nenhum membro
-- do workspace, vamos salvar o texto original em assignee_name com flag
-- assignee_status='pending' pra aparecer no dropdown como "Pendente" e ter
-- um botão "Convidar" pra disparar invite depois.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_status TEXT
    CHECK (assignee_status IS NULL OR assignee_status IN ('pending', 'invited'));

-- Índice pra queries que filtram por status pendente
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
  ON public.tasks(assignee_status)
  WHERE assignee_status IS NOT NULL;

-- Constraint: assignee_id OU assignee_name+status pendente, mas não ambos ao mesmo tempo
-- (regra de negócio: ou é um membro real ou é um convite pendente)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS chk_assignee_consistency;

ALTER TABLE public.tasks
  ADD CONSTRAINT chk_assignee_consistency
  CHECK (
    (assignee_id IS NOT NULL AND assignee_name IS NULL)
    OR (assignee_id IS NULL AND assignee_status = 'pending' AND assignee_name IS NOT NULL)
    OR (assignee_id IS NULL AND assignee_name IS NULL AND assignee_status IS NULL)
  );

-- Backfill de registros antigos: se assignee_id é null, fica null (não mexe em histórico)
-- Nada a fazer — coluna nova fica NULL por padrão