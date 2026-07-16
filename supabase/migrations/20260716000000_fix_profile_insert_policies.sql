-- ============================================================================
-- CHRONOS Migration: 20260716000000_fix_profile_insert_policies.sql
-- FIX CRÍTICO: Adiciona policies de INSERT faltando em profiles e
-- notification_subscribers. Sem isso, o frontend NÃO consegue auto-criar
-- profile quando user existe mas trigger handle_new_user não rodou.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PROFILES: adicionar INSERT policy (WITH CHECK)
-- Já existem: SELECT, UPDATE (auth.uid() = id), ALL via service_role
-- Faltando: INSERT pra usuário criar o próprio profile
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────────
-- NOTIFICATION_SUBSCRIBERS: adicionar INSERT/UPSERT policy
-- Policy atual é "FOR ALL USING (user_id = auth.uid())" mas SEM WITH CHECK,
-- então INSERT falha silenciosamente em alguns casos.
-- Adicionar policy explícita de INSERT e UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own subscriber prefs" ON public.notification_subscribers;
CREATE POLICY "Users can insert own subscriber prefs" ON public.notification_subscribers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own subscriber prefs" ON public.notification_subscribers;
CREATE POLICY "Users can update own subscriber prefs" ON public.notification_subscribers
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- PROFILES: garantir que todos os users existentes têm profile
-- (caso a trigger handle_new_user não tenha rodado pra algum user antigo)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, timezone)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)),
  'America/Sao_Paulo'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FIM
-- ============================================================================