-- Migration: Fix workspace_members profiles FK, profiles RLS, and admin management
-- Description:
-- 1. Adds FK constraint workspace_members.user_id -> profiles.id so PostgREST can resolve joins.
-- 2. Updates profiles SELECT RLS so workspace peers can see each other's names, emails, and avatars.
-- 3. Updates workspace_members RLS so workspace admins/owners can manage (update/delete) members.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workspace_members_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey_profiles
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Allow workspace peers to view each other's profiles in the same workspace
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Workspace members view peer profiles" ON public.profiles;

CREATE POLICY "Workspace members view peer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  )
);

-- Ensure workspace admins can manage (update role, remove) members in their workspace
DROP POLICY IF EXISTS "Owners manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins manage workspace members" ON public.workspace_members;

CREATE POLICY "Admins manage workspace members"
ON public.workspace_members
FOR ALL
TO authenticated
USING (
  public.is_workspace_admin(workspace_id, auth.uid())
)
WITH CHECK (
  public.is_workspace_admin(workspace_id, auth.uid())
);
