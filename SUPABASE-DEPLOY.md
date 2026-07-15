# CHRONOS — Guia de Deploy Supabase

## 🔑 Gerar Personal Access Token (PAT) do Supabase

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **Generate New Token**
3. Dê um nome (ex: `Sarah CLI`) e role **service_role** (mais permissões)
4. **Copie o token** (formato: `sbp_xxxxxxxxxxxxx...`)
5. **Me mande** via Telegram (privado) pra eu salvar nos meus scripts

## 🔐 Configurar no servidor

Depois de receber o token, eu rodo:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxx..."
npx supabase link --project-ref qzfhjuawxytzcqwtlhof
```

## 🗄️ Rodar as migrations SQL

```bash
# Cria tabela profiles + triggers de notification
npx supabase db push
# Ou, manualmente:
psql "$DATABASE_URL" -f supabase/migrations/20260715030000_notification_triggers.sql
psql "$DATABASE_URL" -f supabase/migrations/20260715030100_create_profiles.sql
```

## ⚡ Deploy Edge Functions

```bash
npx supabase functions deploy due-soon-alert
npx supabase functions deploy stage-change-notify
npx supabase functions deploy task-assigned-notify
```

## 🔑 Configurar Secrets (ENV vars das Edge Functions)

```bash
# Telegram Bot Token (pegar via @BotFather)
npx supabase secrets set TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"

# Resend API Key (criar conta em https://resend.com/api-keys)
npx supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxx"
npx supabase secrets set FROM_EMAIL="CHRONOS <noreply@resend.dev>"
```

## ⏰ Cron Schedule (rodar due-soon-alert 1x por dia às 9h)

No Dashboard Supabase → Database → Cron Jobs → New Cron Job:

```sql
SELECT cron.schedule(
  'due-soon-alert-daily',     -- job name
  '0 9 * * *',                -- às 9h todo dia (BRT = 12h UTC, então 12 12 * * *)
  $$SELECT net.http_post(
    url := 'https://qzfhjuawxytzcqwtlhof.supabase.co/functions/v1/due-soon-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
```

(⚠️ O horário 9h BRT = 12h UTC. Ajuste `0 9 * * *` pra `0 12 * * *` se quiser UTC.)

## ✅ Validação pós-deploy

1. **Tables criadas:**
```bash
curl -s "https://qzfhjuawxytzcqwtlhof.supabase.co/rest/v1/profiles?select=count" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# Esperado: [{"count": 1}] (o Esly já criado)
```

2. **Edge Function responde:**
```bash
curl -s "https://qzfhjuawxytzcqwtlhof.supabase.co/functions/v1/due-soon-alert" \
  -H "Authorization: Bearer $ANON_KEY"
# Esperado: {"success":true,"alerts_sent":0,...}
```

3. **Telegram bot tá vivo:**
```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```

4. **Teste manual de notificação:**
- Criar uma task via UI do CHRONOS
- Mover a task pra outro stage (Kanban)
- Verificar se Telegram recebeu mensagem

## 📋 Resumo do que precisa do Esly

| Item | Status | Como conseguir |
|------|--------|----------------|
| Supabase PAT | ❌ | https://supabase.com/dashboard/account/tokens |
| Telegram Bot Token | ❌ | @BotFather no Telegram → /newbot |
| Resend API Key | ❌ | https://resend.com/api-keys |
| FROM_EMAIL | ❌ | Pode ser `noreply@resend.dev` (default grátis) |

**Tudo isso são 5 minutos no total se você tiver as contas criadas.**
