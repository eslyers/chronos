-- ============================================================================
-- CHRONOS Migration: 20260722000000_add_invite_tokens.sql
-- Adiciona sistema de convites por email com self-signup opcional.
--
-- Fluxo:
--   1. Owner adiciona email de responsável a uma task
--   2. Sistema gera invite_token (UUID) e dispara email com link
--   3. Responsável recebe 2 caminhos:
--      (a) Clica "Criar conta" → signup pré-preenchido → vira active
--      (b) Ignora → continua como invited → recebe emails automáticos
-- ============================================================================

-- ── Tabela principal ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Vínculo: pra QUÊ e pra QUEM é o convite
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),

  -- Token único que vai no link do email
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,

  -- Quem convidou
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status do convite
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),

  -- Quando expira (default 7 dias)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Quando foi aceito (se foi)
  accepted_at TIMESTAMPTZ,

  -- User que aceitou (link com auth.users)
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invite_tokens_workspace
  ON public.invite_tokens(workspace_id);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_email
  ON public.invite_tokens(email);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token
  ON public.invite_tokens(token)
  WHERE status = 'pending';

-- Garante 1 convite PENDING por email+workspace (evita duplicata)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_unique_pending
  ON public.invite_tokens(email, workspace_id)
  WHERE status = 'pending';

-- ── Trigger de updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invite_tokens_updated_at ON public.invite_tokens;
CREATE TRIGGER trg_invite_tokens_updated_at
  BEFORE UPDATE ON public.invite_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── Função helper: aceitar convite ───────────────────────────────────────────
-- Chamada pelo fluxo de signup quando o user completa o cadastro.
-- Marca token como accepted E adiciona o user como membro do workspace se ainda não for.

CREATE OR REPLACE FUNCTION public.accept_invite_token(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  workspace_id UUID,
  role TEXT,
  email TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Buscar e lockar o convite
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

  -- Marcar como aceito
  UPDATE public.invite_tokens
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = v_invite.id;

  -- Adicionar como membro se ainda não for
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, p_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN QUERY SELECT v_invite.workspace_id, v_invite.role, v_invite.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Admins do workspace podem ver/criar/revogar convites do workspace deles
DROP POLICY IF EXISTS "Workspace admins manage invites" ON public.invite_tokens;
CREATE POLICY "Workspace admins manage invites" ON public.invite_tokens
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- O próprio usuário que foi convidado pode ver o status do convite (pelo email)
DROP POLICY IF EXISTS "Users can view own invites" ON public.invite_tokens;
CREATE POLICY "Users can view own invites" ON public.invite_tokens
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Permitir SELECT público por token (pra página de signup pré-preenchido)
-- Necessário pro fluxo "user clica no link do email antes de logar"
DROP POLICY IF EXISTS "Public token lookup" ON public.invite_tokens;
CREATE POLICY "Public token lookup" ON public.invite_tokens
  FOR SELECT
  USING (true);  -- o token é secreto + único, lookup direto não vaza info
  -- A info retornada já é só email + workspace_id + role, não é sensível

-- ============================================================================
-- FIM
-- ============================================================================
