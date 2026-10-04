-- Migration: Add project_members and multi-user project access control
-- Description: Implement hybrid isolation model where workspace owners/admins see all projects,
-- and regular members only see projects they created or were invited/assigned to.

-- 1. Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id),
  CONSTRAINT project_members_user_id_fkey_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.projects ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- 2. Helper function: check if user is workspace owner/admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

-- 3. Helper function: check if user has access to a project
CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        p.created_by = p_user_id
        OR public.is_workspace_admin(p.workspace_id, p_user_id)
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = p_user_id
        )
      )
  );
$$;

-- 4. Auto-membership trigger: when a task is assigned to a user, grant them project membership
CREATE OR REPLACE FUNCTION public.handle_task_assignment_auto_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.project_id, NEW.assignee_id, 'member')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assignment_auto_membership ON public.tasks;
CREATE TRIGGER trg_task_assignment_auto_membership
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_assignment_auto_membership();

-- 5. Auto-membership trigger: when a project is created, add creator as owner in project_members
CREATE OR REPLACE FUNCTION public.handle_project_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_creator_membership ON public.projects;
CREATE TRIGGER trg_project_creator_membership
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_creator_membership();

-- 6. Populate existing project creators into project_members
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, created_by, 'owner'
FROM public.projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 7. Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view project_members" ON public.project_members;
CREATE POLICY "Members view project_members" ON public.project_members
FOR SELECT
USING (
  public.has_project_access(project_id, auth.uid())
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
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
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
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
      )
  )
);

-- 8. Update RLS policies on projects
DROP POLICY IF EXISTS "Members view projects" ON public.projects;
CREATE POLICY "Members view projects" ON public.projects
FOR SELECT
USING (
  public.has_project_access(id, auth.uid())
);

DROP POLICY IF EXISTS "Members update projects" ON public.projects;
CREATE POLICY "Members update projects" ON public.projects
FOR UPDATE
USING (
  public.has_project_access(id, auth.uid()) AND (
    created_by = auth.uid()
    OR public.is_workspace_admin(workspace_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
    )
  )
);

DROP POLICY IF EXISTS "Members delete projects" ON public.projects;
CREATE POLICY "Members delete projects" ON public.projects
FOR DELETE
USING (
  created_by = auth.uid()
  OR public.is_workspace_admin(workspace_id, auth.uid())
);

-- 9. Update RLS policies on tasks
DROP POLICY IF EXISTS "Members view tasks" ON public.tasks;
CREATE POLICY "Members view tasks" ON public.tasks
FOR SELECT
USING (
  public.has_project_access(project_id, auth.uid())
);

DROP POLICY IF EXISTS "Members manage tasks" ON public.tasks;
CREATE POLICY "Members manage tasks" ON public.tasks
FOR ALL
USING (
  public.has_project_access(project_id, auth.uid())
)
WITH CHECK (
  public.has_project_access(project_id, auth.uid())
);

-- 10. Update RLS policies on stages
DROP POLICY IF EXISTS "Members view stages" ON public.stages;
CREATE POLICY "Members view stages" ON public.stages
FOR SELECT
USING (
  public.has_project_access(project_id, auth.uid())
);

DROP POLICY IF EXISTS "Members manage stages" ON public.stages;
CREATE POLICY "Members manage stages" ON public.stages
FOR ALL
USING (
  public.has_project_access(project_id, auth.uid())
)
WITH CHECK (
  public.has_project_access(project_id, auth.uid())
);

-- 11. Update RLS policies on task_dependencies
DROP POLICY IF EXISTS "Members view deps" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members can view dependencies" ON public.task_dependencies;
CREATE POLICY "Members view deps" ON public.task_dependencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.has_project_access(t.project_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Members manage deps" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members can insert dependencies" ON public.task_dependencies;
DROP POLICY IF EXISTS "Members can delete dependencies" ON public.task_dependencies;
CREATE POLICY "Members manage deps" ON public.task_dependencies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.has_project_access(t.project_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.has_project_access(t.project_id, auth.uid())
  )
);
