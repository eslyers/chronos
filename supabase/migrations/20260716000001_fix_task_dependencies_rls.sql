-- ============================================================================
-- CHRONOS Migration: 20260716000001_fix_task_dependencies_rls.sql
-- FIX: Adiciona WITH CHECK nas policies de INSERT/UPDATE/DELETE em
-- task_dependencies. A policy atual usa FOR ALL USING sem WITH CHECK,
-- o que bloqueia INSERT/DELETE silenciosamente (mesmo bug que Settings tinha).
-- ============================================================================

-- Remove a policy "FOR ALL" existente (sem WITH CHECK)
DROP POLICY IF EXISTS "Members can manage dependencies" ON public.task_dependencies;

-- SELECT: user vê deps dos projetos do qual é membro
DROP POLICY IF EXISTS "Members can view dependencies" ON public.task_dependencies;
CREATE POLICY "Members can view dependencies" ON public.task_dependencies
  FOR SELECT USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

-- INSERT: user só pode criar deps em tasks de projetos que ele é membro
CREATE POLICY "Members can insert dependencies" ON public.task_dependencies
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

-- DELETE: user só pode deletar deps de projetos que ele é membro
CREATE POLICY "Members can delete dependencies" ON public.task_dependencies
  FOR DELETE USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

-- ============================================================================
-- FIM
-- ============================================================================