# 🔧 FIX URGENTE: Settings travando

## O bug
A tela de `/app/settings` ficava em spinner eterno porque:
- Frontend tentava `INSERT` direto em `profiles` quando user não tinha profile
- **RLS bloqueava INSERT silenciosamente** (só tinha policies SELECT/UPDATE)
- Sem try/catch, o erro sumia e o `profile` ficava `null` → spinner eterno

## Já corrigi (frontend + migration criada)
✅ Adicionei `try/catch` no `useEffect` com mensagem de erro útil + botão "Tentar novamente"  
✅ Criei migration `20260716000000_fix_profile_insert_policies.sql` com policies de INSERT faltando  
✅ Build passou + commit `637c9b3` pushed + deploy em produção

## O que falta: aplicar a migration no Supabase

### Como aplicar (30 segundos):
1. Abre https://supabase.com/dashboard/project/qzfhjuawxytzcqwtlhof/sql/new
2. Cola o SQL abaixo
3. Clica "Run" (botão verde)
4. Recarrega `/app/settings` no Chronos

### SQL pra colar:
```sql
-- Fix RLS policies de INSERT faltando em profiles e notification_subscribers
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own subscriber prefs" ON public.notification_subscribers;
CREATE POLICY "Users can insert own subscriber prefs" ON public.notification_subscribers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own subscriber prefs" ON public.notification_subscribers;
CREATE POLICY "Users can update own subscriber prefs" ON public.notification_subscribers
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Cria profile pra users existentes que não têm (caso trigger não tenha rodado)
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
```

Depois de rodar, faz **hard refresh** em `/app/settings` (Ctrl+Shift+R ou Cmd+Shift+R) e a tela deve carregar normalmente. 🎯