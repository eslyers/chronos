-- ============================================================================
-- CHRONOS — Schema inicial do banco de dados
-- Data: 2026-07-14
-- Descrição: Cria todas as tabelas core do CHRONOS com RLS e helpers
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABELA: workspaces (multi-tenancy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- ============================================================================
-- TABELA: workspace_members (RBAC dentro do workspace)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- ============================================================================
-- TABELA: projects (projetos/cronogramas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'archived', 'completed')),
  start_date DATE,
  target_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_dates ON public.projects(start_date, target_date);

-- ============================================================================
-- TABELA: stages (etapas macro do projeto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f97316',
  sort_order INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stages_project ON public.stages(project_id);
CREATE INDEX idx_stages_order ON public.stages(project_id, sort_order);

-- ============================================================================
-- TABELA: tasks (tarefas individuais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assignee_id UUID REFERENCES auth.users(id),
  start_date DATE,
  due_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_hours NUMERIC(6,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_stage ON public.tasks(stage_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- ============================================================================
-- TABELA: task_dependencies (grafo DAG entre tasks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON public.task_dependencies(depends_on_task_id);

-- ============================================================================
-- TABELA: stage_transitions (audit log de mudanças de etapa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stage_transitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  moved_by UUID NOT NULL REFERENCES auth.users(id),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX idx_stage_transitions_task ON public.stage_transitions(task_id);
CREATE INDEX idx_stage_transitions_moved_at ON public.stage_transitions(moved_at DESC);

-- ============================================================================
-- TABELA: notification_subscribers (preferências de notificação por usuário/projeto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  telegram_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_stage_change BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_due_soon BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_overdue BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  due_soon_hours INTEGER NOT NULL DEFAULT 24,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_notification_subs_user ON public.notification_subscribers(user_id);
CREATE INDEX idx_notification_subs_project ON public.notification_subscribers(project_id);

-- ============================================================================
-- TABELA: notifications (histórico de notificações enviadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('due_soon', 'overdue', 'stage_change', 'assigned', 'mention', 'stale_task')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_task ON public.notifications(task_id);

-- ============================================================================
-- TABELA: templates (templates de projetos pré-configurados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL = template global
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks_template JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_public ON public.templates(is_public);

-- ============================================================================
-- TRIGGERS: updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_workspaces
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_notification_subs
  BEFORE UPDATE ON public.notification_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TRIGGER: criar stage_transition automaticamente quando task muda de stage
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    INSERT INTO public.stage_transitions (task_id, from_stage_id, to_stage_id, moved_by)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, COALESCE(auth.uid(), NEW.created_by));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_stage_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_stage_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Helper function: usuário é membro do workspace?
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- WORKSAPCES
CREATE POLICY "Members can view workspace" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid())
  );

CREATE POLICY "Users can create workspace" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspace" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete workspace" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view members" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owners can manage members" ON public.workspace_members
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()));

-- PROJECTS
CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can create projects" ON public.projects
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can update projects" ON public.projects
  FOR UPDATE USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can delete projects" ON public.projects
  FOR DELETE USING (public.is_workspace_member(workspace_id, auth.uid()));

-- STAGES
CREATE POLICY "Members can view stages" ON public.stages
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members can manage stages" ON public.stages
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
  );

-- TASKS
CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members can manage tasks" ON public.tasks
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
  );

-- TASK DEPENDENCIES
CREATE POLICY "Members can view dependencies" ON public.task_dependencies
  FOR SELECT USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Members can manage dependencies" ON public.task_dependencies
  FOR ALL USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

-- STAGE TRANSITIONS
CREATE POLICY "Members can view transitions" ON public.stage_transitions
  FOR SELECT USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Members can create transitions" ON public.stage_transitions
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

-- NOTIFICATION SUBSCRIBERS
CREATE POLICY "Users manage their own preferences" ON public.notification_subscribers
  FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- TEMPLATES
CREATE POLICY "Public templates are visible to all" ON public.templates
  FOR SELECT USING (is_public = TRUE OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create workspace templates" ON public.templates
  FOR INSERT WITH CHECK (workspace_id IS NULL OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own templates" ON public.templates
  FOR UPDATE USING (created_by = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- Templates iniciais (popula DB com templates prontos no primeiro deploy)
-- ============================================================================
INSERT INTO public.templates (name, description, category, icon, is_public, stages, tasks_template)
VALUES
  (
    'Cronograma de Body (12 semanas)',
    'Template completo de 12 semanas para transformação corporal: avaliação → treino → dieta → suplementação → check-ins.',
    'Fitness',
    '💪',
    TRUE,
    '[
      {"name": "Semana 1-2: Avaliação", "color": "#06b6d4", "sort_order": 0},
      {"name": "Semana 3-6: Adaptação", "color": "#3b82f6", "sort_order": 1},
      {"name": "Semana 7-10: Intensificação", "color": "#f59e0b", "sort_order": 2},
      {"name": "Semana 11-12: Avaliação final", "color": "#10b981", "sort_order": 3}
    ]'::jsonb,
    '[]'::jsonb
  ),
  (
    'Lançamento de Produto',
    'Etapas para lançar um produto: discovery → design → dev → marketing → lançamento.',
    'Produto',
    '🚀',
    TRUE,
    '[
      {"name": "Discovery", "color": "#8b5cf6", "sort_order": 0},
      {"name": "Design", "color": "#ec4899", "sort_order": 1},
      {"name": "Desenvolvimento", "color": "#f59e0b", "sort_order": 2},
      {"name": "QA", "color": "#10b981", "sort_order": 3},
      {"name": "Marketing", "color": "#3b82f6", "sort_order": 4},
      {"name": "Lançamento", "color": "#ef4444", "sort_order": 5}
    ]'::jsonb,
    '[]'::jsonb
  ),
  (
    'Migração de Sistema',
    'Template para migrações de sistema: planejamento → homologação → produção.',
    'Engenharia',
    '⚙️',
    TRUE,
    '[
      {"name": "Planejamento", "color": "#6366f1", "sort_order": 0},
      {"name": "Desenvolvimento", "color": "#3b82f6", "sort_order": 1},
      {"name": "Homologação", "color": "#f59e0b", "sort_order": 2},
      {"name": "Produção", "color": "#10b981", "sort_order": 3}
    ]'::jsonb,
    '[]'::jsonb
  ),
  (
    'Sprint Scrum (2 semanas)',
    'Template ágil de sprint de 2 semanas com cerimônias Scrum.',
    'Agile',
    '🏃',
    TRUE,
    '[
      {"name": "Backlog", "color": "#94a3b8", "sort_order": 0, "wip_limit": null},
      {"name": "To Do", "color": "#64748b", "sort_order": 1, "wip_limit": 5},
      {"name": "In Progress", "color": "#3b82f6", "sort_order": 2, "wip_limit": 3},
      {"name": "Code Review", "color": "#f59e0b", "sort_order": 3, "wip_limit": 2},
      {"name": "Done", "color": "#10b981", "sort_order": 4, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Função helper: criar workspace padrão para novo usuário
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_slug TEXT;
BEGIN
  -- Gerar slug único baseado no email
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  v_slug := v_slug || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Criar workspace pessoal
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)) || '''s Workspace',
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_workspace_id;

  -- Adicionar owner como membro
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FIM — Schema CHRONOS v1.0
-- ============================================================================
