-- ============================================================================
-- CHRONOS Migration: 20260728000002_add_performance_indexes.sql
-- Adiciona índices compostos e de alta seletividade para otimizar:
-- 1. Agrupamento de tarefas por estágio e posição (Kanban)
-- 2. Ordenação por prazo de entrega (Timeline / Gantt / Fast Close)
-- 3. Resolução rápida da árvore hierárquica WBS (parent_task_id)
-- 4. Notificações do usuário no Dashboard e trilha de auditoria
-- ============================================================================

-- Índice composto para carregar tarefas de um projeto por estágio
CREATE INDEX IF NOT EXISTS idx_tasks_project_stage 
  ON public.tasks(project_id, stage_id);

-- Índice composto para ordenação de prazos por projeto
CREATE INDEX IF NOT EXISTS idx_tasks_project_due 
  ON public.tasks(project_id, due_date);

-- Índice parcial para busca rápida de subtarefas WBS
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id 
  ON public.tasks(parent_task_id) 
  WHERE parent_task_id IS NOT NULL;

-- Índice composto para status e posição dentro do projeto
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_pos 
  ON public.tasks(project_id, status, position);

-- Índice para dependências entre tarefas (pares de grafo acíclico)
CREATE INDEX IF NOT EXISTS idx_task_deps_task_depends 
  ON public.task_dependencies(task_id, depends_on_task_id);

-- Índice para notificações recentes ativas do usuário no Dashboard
CREATE INDEX IF NOT EXISTS idx_notifs_user_status_date 
  ON public.notifications(user_id, status, created_at DESC);

-- Índice para feed de atividades recentes e transições de estágio
CREATE INDEX IF NOT EXISTS idx_stage_transitions_task_date 
  ON public.stage_transitions(task_id, moved_at DESC);
