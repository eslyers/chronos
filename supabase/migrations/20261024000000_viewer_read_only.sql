-- ============================================================================
-- CHRONOS Migration: 20261024000000_viewer_read_only.sql
-- Torna o papel "viewer" (Leitura) realmente somente leitura.
--
-- Antes: as policies "Members manage tasks|stages|deps" (FOR ALL) usavam
-- has_project_access, que libera escrita para qualquer linha de
-- project_members — inclusive role 'viewer' — e para viewers do workspace que
-- fossem membros do projeto (ex.: via auto-membership ao atribuir tarefa).
--
-- Regra de edição (espelha canEditProject em src/lib/access/rules.ts):
--   pode escrever no projeto P quem
--     - é owner/admin do workspace de P; OU
--     - é 'member' do workspace de P E (criou P OU tem papel
--       owner/admin/member em project_members de P).
--   Viewer do workspace nunca escreve, qualquer que seja o papel no projeto.
--   Quem não é (mais) membro do workspace também não escreve.
--
--   1. Funções auxiliares: workspace_role, can_edit_project_row,
--      can_edit_project
--   2. tasks / stages / task_dependencies: FOR ALL → INSERT/UPDATE/DELETE
--      com can_edit_project (SELECT continua com has_project_access)
--   3. projects: UPDATE com a regra de edição; INSERT só para não-viewers
--      (DELETE continua: criador ou admin do workspace)
--   4. stage_transitions: INSERT com a regra de edição
--   5. task_comments / task_attachments: inalterados — viewers continuam
--      podendo comentar e anexar em projetos que enxergam
--
-- clone_project (20261022000000) é SECURITY INVOKER: como viewers não passam
-- na policy de INSERT de projects, também não conseguem clonar para o
-- workspace. Intencional.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES
-- Lidas sem RLS (SECURITY DEFINER), como project_member_role: policies que
-- consultam workspace_members/project_members diretamente entram em recursão.
-- ────────────────────────────────────────────────────────────────────────────

-- Papel do usuário no workspace (NULL se não for membro)
CREATE OR REPLACE FUNCTION public.workspace_role(p_workspace_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT wm.role FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_user_id;
$$;

-- Regra de edição avaliada sobre as colunas do projeto, sem ler a tabela
-- projects. Usada nas policies da própria tabela projects: no
-- INSERT/UPDATE ... RETURNING uma função que lê projects não enxerga a versão
-- nova da linha (mesmo problema de has_project_access descrito em
-- 20261021000000).
CREATE OR REPLACE FUNCTION public.can_edit_project_row(
  p_project_id UUID,
  p_workspace_id UUID,
  p_created_by UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE public.workspace_role(p_workspace_id, p_user_id)
    WHEN 'owner' THEN TRUE
    WHEN 'admin' THEN TRUE
    WHEN 'member' THEN
      p_created_by IS NOT DISTINCT FROM p_user_id
      OR COALESCE(public.project_member_role(p_project_id, p_user_id)
                  IN ('owner', 'admin', 'member'), FALSE)
    ELSE FALSE  -- 'viewer' ou não membro do workspace
  END;
$$;

-- Regra de edição a partir do id do projeto (para tasks/stages/deps/
-- transitions, em que o projeto já existe antes da escrita)
CREATE OR REPLACE FUNCTION public.can_edit_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT public.can_edit_project_row(p.id, p.workspace_id, p.created_by, p_user_id)
    FROM public.projects p
    WHERE p.id = p_project_id
  ), FALSE);
$$;

REVOKE EXECUTE ON FUNCTION public.workspace_role(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_project_row(UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project_row(UUID, UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project(UUID, UUID) TO authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TASKS / STAGES / TASK_DEPENDENCIES
-- Remove as policies FOR ALL pelos nomes reais (20261003010000). Policies são
-- permissivas (OR): se uma ficar para trás, a escrita continua liberada.
-- As policies de SELECT ("Members view tasks|stages|deps") ficam como estão.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members delete tasks" ON public.tasks;

CREATE POLICY "Members insert tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

-- WITH CHECK também: mover a tarefa exige poder editar o projeto de destino
CREATE POLICY "Members update tasks" ON public.tasks
  FOR UPDATE
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

CREATE POLICY "Members delete tasks" ON public.tasks
  FOR DELETE
  USING (public.can_edit_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Members manage stages" ON public.stages;
DROP POLICY IF EXISTS "Members insert stages" ON public.stages;
DROP POLICY IF EXISTS "Members update stages" ON public.stages;
DROP POLICY IF EXISTS "Members delete stages" ON public.stages;

CREATE POLICY "Members insert stages" ON public.stages
  FOR INSERT
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

CREATE POLICY "Members update stages" ON public.stages
  FOR UPDATE
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

CREATE POLICY "Members delete stages" ON public.stages
  FOR DELETE
  USING (public.can_edit_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Members manage deps" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members insert deps" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members update deps" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members delete deps" ON public.task_dependencies;

CREATE POLICY "Members insert deps" ON public.task_dependencies
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.can_edit_project(t.project_id, auth.uid())
  ));

CREATE POLICY "Members update deps" ON public.task_dependencies
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.can_edit_project(t.project_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.can_edit_project(t.project_id, auth.uid())
  ));

CREATE POLICY "Members delete deps" ON public.task_dependencies
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.can_edit_project(t.project_id, auth.uid())
  ));

-- ────────────────────────────────────────────────────────────────────────────
-- 3. PROJECTS
-- Avalia as colunas da própria linha (can_edit_project_row), não
-- can_edit_project(id): ver comentário da função.
-- ────────────────────────────────────────────────────────────────────────────

-- Viewers do workspace não criam projetos (nem via clone_project)
DROP POLICY IF EXISTS "Members can create projects" ON public.projects;
CREATE POLICY "Members can create projects" ON public.projects
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'member')
  );

-- USING: regra de edição sobre a linha atual. WITH CHECK: o projeto continua
-- num workspace do qual o usuário é membro (e não viewer), para não mover
-- projetos para workspaces alheios ou onde ele só tem leitura.
DROP POLICY IF EXISTS "Members update projects" ON public.projects;
CREATE POLICY "Members update projects" ON public.projects
  FOR UPDATE
  USING (public.can_edit_project_row(id, workspace_id, created_by, auth.uid()))
  WITH CHECK (
    public.workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'member')
  );

-- "Members delete projects" (criador ou admin do workspace) permanece.

-- ────────────────────────────────────────────────────────────────────────────
-- 4. STAGE_TRANSITIONS
-- O trigger handle_stage_change (SECURITY DEFINER) continua registrando as
-- transições; esta policy vale só para INSERT direto pelo client.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members create transitions" ON public.stage_transitions;
CREATE POLICY "Members create transitions" ON public.stage_transitions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = stage_transitions.task_id
      AND public.can_edit_project(t.project_id, auth.uid())
  ));

-- ────────────────────────────────────────────────────────────────────────────
-- 5. TASK_COMMENTS / TASK_ATTACHMENTS
-- Sem alteração: "Project members add own comments|attachments" continuam
-- com has_project_access, então quem tem Leitura ainda pode comentar e anexar
-- arquivos (decisão de produto). Excluir: só o autor ou admin do workspace.
-- ────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- Verificação pós-deploy (rodar no SQL Editor) — não deve sobrar nenhuma
-- policy FOR ALL em tasks/stages/task_dependencies:
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('projects', 'tasks', 'stages', 'task_dependencies', 'stage_transitions')
--   ORDER BY tablename, policyname;
-- ============================================================================
