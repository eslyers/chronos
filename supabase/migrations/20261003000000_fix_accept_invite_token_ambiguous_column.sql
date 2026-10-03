-- Migration: Fix column reference "workspace_id" is ambiguous in accept_invite_token
-- Cause: PL/pgSQL function returns TABLE(workspace_id uuid, ...) which conflicts with column workspace_id in SQL statements
-- Solution: Add #variable_conflict use_column

CREATE OR REPLACE FUNCTION public.accept_invite_token(p_token text, p_user_id uuid)
 RETURNS TABLE(workspace_id uuid, role text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
#variable_conflict use_column
DECLARE
  v_invite RECORD;
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

  UPDATE public.invite_tokens
  SET status = 'accepted', accepted_at = NOW(), accepted_by = p_user_id
  WHERE id = v_invite.id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, p_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN QUERY SELECT v_invite.workspace_id, v_invite.role, v_invite.email;
END;
$function$;
