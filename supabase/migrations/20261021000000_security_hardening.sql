-- ============================================================================
-- CHRONOS Migration: 20261021000000_security_hardening.sql
-- Correções de segurança (auditoria 2026-10-21):
--   1. invite_tokens: remove SELECT público; corrige policy "own invites"
--   2. accept_invite_token: valida email do usuário, não rebaixa owner,
--      search_path fixo e EXECUTE só para service_role
--   3. workspace_members: remove policy legada que deixava qualquer membro
--      alterar papéis; trigger impede auto-promoção e mexer em owners
--   4. projects/stages/tasks/stage_transitions: remove policies legadas
--      (nomes reais) que anulavam o isolamento por projeto
--   5. task_comments/task_attachments: acesso restrito ao projeto
--   6. notification_subscribers: só projetos acessíveis
--   7. templates: clientes não criam templates globais/públicos
--   8. SECURITY DEFINER: search_path fixo
--   9. profiles.email: imutável pelo próprio usuário
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. RECONCILIAÇÃO DE POLICIES
-- Em produção o schema foi aplicado por fora das migrations, com nomes de
-- policies diferentes dos do repositório ("Members create projects",
-- "Users create templates"…). Derrubar por nome deixaria policies permissivas
-- ativas. Por isso esta migration remove TODAS as policies das tabelas que
-- controla e recria o conjunto completo — o estado final independe dos nomes
-- antigos. (Não toca em profiles, workspaces e notifications.)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'invite_tokens', 'notification_subscribers', 'project_members', 'projects',
        'stage_transitions', 'stages', 'task_attachments', 'task_comments',
        'task_dependencies', 'tasks', 'templates', 'workspace_members'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Base que as seções abaixo não recriam (equivalente às migrations anteriores)
CREATE POLICY "Workspace admins manage invites" ON public.invite_tokens
  FOR ALL
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Members can view members" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins manage workspace members" ON public.workspace_members
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Members can create projects" ON public.projects
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members delete projects" ON public.projects
  FOR DELETE USING (created_by = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Members view stages" ON public.stages
  FOR SELECT USING (public.has_project_access(project_id, auth.uid()));
CREATE POLICY "Members manage stages" ON public.stages
  FOR ALL
  USING (public.has_project_access(project_id, auth.uid()))
  WITH CHECK (public.has_project_access(project_id, auth.uid()));

CREATE POLICY "Members view tasks" ON public.tasks
  FOR SELECT USING (public.has_project_access(project_id, auth.uid()));
CREATE POLICY "Members manage tasks" ON public.tasks
  FOR ALL
  USING (public.has_project_access(project_id, auth.uid()))
  WITH CHECK (public.has_project_access(project_id, auth.uid()));

CREATE POLICY "Members view deps" ON public.task_dependencies
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id AND public.has_project_access(t.project_id, auth.uid())
  ));
CREATE POLICY "Members manage deps" ON public.task_dependencies
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id AND public.has_project_access(t.project_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id AND public.has_project_access(t.project_id, auth.uid())
  ));

CREATE POLICY "Members view project_members" ON public.project_members
  FOR SELECT USING (public.has_project_access(project_id, auth.uid()));

CREATE POLICY "Public templates are visible to all" ON public.templates
  FOR SELECT USING (is_public = TRUE OR public.is_workspace_member(workspace_id, auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 1. INVITE TOKENS
-- O lookup por token é feito server-side com service_role
-- (/api/invites/lookup), então o SELECT público não é necessário.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public token lookup" ON public.invite_tokens;

-- A versão anterior lia auth.users, que o role authenticated não pode ler
DROP POLICY IF EXISTS "Users can view own invites" ON public.invite_tokens;
CREATE POLICY "Users can view own invites" ON public.invite_tokens
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- ────────────────────────────────────────────────────────────────────────────
-- 2. accept_invite_token
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_invite_token(p_token text, p_user_id uuid)
 RETURNS TABLE(workspace_id uuid, role text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
#variable_conflict use_column
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invite
  FROM public.invite_tokens
  WHERE token = p_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou já utilizado';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    UPDATE public.invite_tokens SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  -- O convite só pode ser aceito pela conta dona do email convidado
  SELECT u.email INTO v_user_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'Este convite pertence a outro email';
  END IF;

  UPDATE public.invite_tokens
  SET status = 'accepted', accepted_at = NOW(), accepted_by = p_user_id
  WHERE id = v_invite.id;

  -- Nunca rebaixa um owner existente
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, p_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = CASE WHEN public.workspace_members.role = 'owner'
                    THEN 'owner' ELSE EXCLUDED.role END;

  RETURN QUERY SELECT v_invite.workspace_id, v_invite.role, v_invite.email;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.accept_invite_token(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite_token(text, uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. WORKSPACE MEMBERS
-- "Owners can manage members" (schema inicial) liberava FOR ALL para qualquer
-- membro. A migration 20261003020000 tentou removê-la com o nome errado.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;

-- Bootstrap: dono do workspace pode se inserir como owner (fallback do client)
DROP POLICY IF EXISTS "Workspace owner bootstraps membership" ON public.workspace_members;
CREATE POLICY "Workspace owner bootstraps membership" ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Admins podem gerenciar membros, mas só owners mexem em owners e ninguém
-- altera o próprio papel. Chamadas sem usuário (service_role, triggers de
-- auth) não passam por aqui.
CREATE OR REPLACE FUNCTION public.guard_workspace_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_workspace UUID := COALESCE(NEW.workspace_id, OLD.workspace_id);
  v_caller_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- DELETE em cascata ao excluir o workspace
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace) THEN
    RETURN OLD;
  END IF;

  -- Bootstrap do dono do workspace
  IF TG_OP = 'INSERT' AND NEW.user_id = v_uid AND NEW.role = 'owner'
     AND EXISTS (SELECT 1 FROM public.workspaces w
                 WHERE w.id = NEW.workspace_id AND w.owner_id = v_uid) THEN
    RETURN NEW;
  END IF;

  SELECT wm.role INTO v_caller_role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = v_workspace AND wm.user_id = v_uid;

  IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace AND w.owner_id = v_uid) THEN
    v_caller_role := 'owner';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id = v_uid AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio papel';
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id
                           OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id) THEN
    RAISE EXCEPTION 'Não é permitido mover membros entre usuários/workspaces';
  END IF;

  IF v_caller_role IS DISTINCT FROM 'owner' THEN
    IF (TG_OP IN ('INSERT', 'UPDATE') AND NEW.role = 'owner')
       OR (TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'owner') THEN
      RAISE EXCEPTION 'Apenas o owner pode atribuir ou alterar o papel de owner';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_workspace_member_changes ON public.workspace_members;
CREATE TRIGGER trg_guard_workspace_member_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_member_changes();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. PROJECTS / STAGES / TASKS / STAGE_TRANSITIONS
-- A migration 20261003010000 removeu nomes inexistentes ("Members view
-- projects"...). As policies originais ("Members can ...") continuaram ativas
-- e, por serem permissivas (OR), anulavam o isolamento por projeto.
-- ATENÇÃO: a partir daqui membros comuns só veem projetos que criaram, dos
-- quais são membros (project_members) ou em que têm tarefa atribuída.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Members can delete projects" ON public.projects;

-- Papel do usuário em project_members, lido sem RLS. Policies que consultam
-- project_members diretamente entram em recursão infinita (a policy de
-- project_members consulta projects e a si mesma).
CREATE OR REPLACE FUNCTION public.project_member_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pm.role FROM public.project_members pm
  WHERE pm.project_id = p_project_id AND pm.user_id = p_user_id;
$$;

-- Avalia as colunas da própria linha em vez de has_project_access(id): no
-- INSERT ... RETURNING a função não enxerga a linha recém-inserida e o
-- createProject falharia sem a policy legada.
DROP POLICY IF EXISTS "Members view projects" ON public.projects;
CREATE POLICY "Members view projects" ON public.projects
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_workspace_admin(workspace_id, auth.uid())
  OR public.project_member_role(id, auth.uid()) IS NOT NULL
);

DROP POLICY IF EXISTS "Admins manage project_members" ON public.project_members;
CREATE POLICY "Admins manage project_members" ON public.project_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.created_by = auth.uid()
        OR public.is_workspace_admin(p.workspace_id, auth.uid())
        OR public.project_member_role(p.id, auth.uid()) IN ('owner', 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.created_by = auth.uid()
        OR public.is_workspace_admin(p.workspace_id, auth.uid())
        OR public.project_member_role(p.id, auth.uid()) IN ('owner', 'admin')
      )
  )
);

-- Impede mover um projeto para um workspace do qual o usuário não é membro
DROP POLICY IF EXISTS "Members update projects" ON public.projects;
CREATE POLICY "Members update projects" ON public.projects
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.is_workspace_admin(workspace_id, auth.uid())
  OR public.project_member_role(id, auth.uid()) IN ('owner', 'admin', 'member')
)
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view stages" ON public.stages;
DROP POLICY IF EXISTS "Members can manage stages" ON public.stages;
DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can manage tasks" ON public.tasks;

DROP POLICY IF EXISTS "Members can view transitions" ON public.stage_transitions;
DROP POLICY IF EXISTS "Members can create transitions" ON public.stage_transitions;
CREATE POLICY "Members view transitions" ON public.stage_transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = stage_transitions.task_id
        AND public.has_project_access(t.project_id, auth.uid())
    )
  );
CREATE POLICY "Members create transitions" ON public.stage_transitions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = stage_transitions.task_id
        AND public.has_project_access(t.project_id, auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. TASK COMMENTS / ATTACHMENTS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Permitir leitura de comentarios para autenticados" ON public.task_comments;
DROP POLICY IF EXISTS "Permitir inserção de comentarios para autenticados" ON public.task_comments;
DROP POLICY IF EXISTS "Permitir exclusão de comentarios para autenticados" ON public.task_comments;
DROP POLICY IF EXISTS "Permitir leitura de anexos para autenticados" ON public.task_attachments;
DROP POLICY IF EXISTS "Permitir inserção de anexos para autenticados" ON public.task_attachments;
DROP POLICY IF EXISTS "Permitir exclusão de anexos para autenticados" ON public.task_attachments;

CREATE POLICY "Project members view comments" ON public.task_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND public.has_project_access(t.project_id, auth.uid())
  ));

CREATE POLICY "Project members add own comments" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND public.has_project_access(t.project_id, auth.uid())
    )
  );

CREATE POLICY "Authors or admins delete comments" ON public.task_comments
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND public.is_workspace_admin(p.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Project members view attachments" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND public.has_project_access(t.project_id, auth.uid())
  ));

CREATE POLICY "Project members add own attachments" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND public.has_project_access(t.project_id, auth.uid())
    )
  );

CREATE POLICY "Uploaders or admins delete attachments" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_attachments.task_id
        AND public.is_workspace_admin(p.workspace_id, auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6. NOTIFICATION SUBSCRIBERS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage their own preferences" ON public.notification_subscribers;
DROP POLICY IF EXISTS "Users can insert own subscriber prefs" ON public.notification_subscribers;
DROP POLICY IF EXISTS "Users can update own subscriber prefs" ON public.notification_subscribers;
CREATE POLICY "Users manage their own preferences" ON public.notification_subscribers
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_project_access(project_id, auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 7. TEMPLATES
-- Templates globais (workspace_id NULL / is_public) só via migrations.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create workspace templates" ON public.templates;
CREATE POLICY "Users can create workspace templates" ON public.templates
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND is_public = FALSE
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
CREATE POLICY "Users can update own templates" ON public.templates
  FOR UPDATE
  USING (
    workspace_id IS NOT NULL
    AND (created_by = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()))
  )
  WITH CHECK (
    workspace_id IS NOT NULL
    AND is_public = FALSE
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 8. search_path fixo em funções SECURITY DEFINER
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.is_workspace_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_workspace_admin(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_project_access(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_stage_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_stage_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_task_assigned() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_task_created() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_task_assignment_auto_membership() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_project_creator_membership() SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. profiles.email imutável pelo usuário
-- O email do perfil é usado para identificar o Master Admin na UI; só o
-- service_role (sem auth.uid()) pode alterá-lo.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'O email do perfil não pode ser alterado diretamente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_email ON public.profiles;
CREATE TRIGGER trg_guard_profile_email
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_email();

-- ────────────────────────────────────────────────────────────────────────────
-- 10. handle_new_user: criar o profile ANTES do workspace_members
-- 20261003020000 adicionou a FK workspace_members.user_id → profiles.id, mas
-- o trigger inseria o membro antes do profile, então todo signup falhava
-- com violação de FK.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id UUID;
  v_slug TEXT;
  v_full_name TEXT;
BEGIN
  -- Nome do metadata ou do email
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Gerar slug único baseado no email
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  v_slug := v_slug || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Criar profile (precisa existir antes de workspace_members)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO NOTHING;

  -- Criar workspace pessoal
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_full_name || '''s Workspace', v_slug, NEW.id)
  RETURNING id INTO v_workspace_id;

  -- Adicionar owner como membro
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Verificação pós-deploy (rodar no SQL Editor):
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
-- ============================================================================
