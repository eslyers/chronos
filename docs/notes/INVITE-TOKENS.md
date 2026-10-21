# 📧 CHRONOS — Migration: Invite Tokens

Adiciona sistema de **convites por email com self-signup opcional**.

## 🎯 O que faz

Permite que o **owner do workspace** atribua tasks a emails mesmo sem a pessoa ter conta. O sistema:

1. **Gera um token único** ao adicionar email como responsável
2. **Dispara email** com link `https://chronos-temp.vercel.app/auth/invite/<token>`
3. O convidado tem **2 caminhos**:
   - 🅰️ **Clica "Aceitar convite"** → fluxo de signup pré-preenchido → vira `active` no workspace
   - 🅱️ **Ignora** → continua só como `invited` no sistema, mas **recebe emails automáticos** quando:
     - Status da task muda
     - Comentário é adicionado
     - Prazo se aproxima (já existente via `due-soon-alert`)

## 📦 O que a migration cria

- ✅ Tabela `invite_tokens` (id, email, workspace_id, role, token, status, expires_at, ...)
- ✅ 3 índices (incluindo UNIQUE pra evitar duplicata de pending)
- ✅ Trigger de `updated_at`
- ✅ Função `accept_invite_token(token, user_id)` que valida + adiciona membro
- ✅ 3 RLS policies:
  - Admins do workspace gerenciam convites do workspace deles
  - Usuário pode ver seus próprios convites (pelo email)
  - Lookup público por token (pra signup pré-preenchido funcionar)

## 🚀 Como aplicar (30 segundos)

1. Abre: https://supabase.com/dashboard/project/qzfhjuawxytzcqwtlhof/sql/new
2. Cola o conteúdo de `supabase/migrations/20260722000000_add_invite_tokens.sql`
3. Clica **Run** (botão verde)

## 🧪 Como testar

```sql
-- Verificar tabela criada
SELECT * FROM public.invite_tokens LIMIT 1;

-- Gerar convite de teste (depois de logar como owner)
INSERT INTO public.invite_tokens (workspace_id, email, role, invited_by)
VALUES (
  '<your-workspace-uuid>',
  'teste@exemplo.com',
  'member',
  '<your-user-uuid>'
)
RETURNING token, email, role, expires_at;

-- Aceitar convite (como user)
SELECT * FROM public.accept_invite_token('<token-aqui>', '<user-uuid>');
```

## 🔌 Integração com código

| Arquivo | Função |
|---|---|
| `src/lib/email/templates.ts` | `inviteEmailTemplate()` — já criada ✅ |
| `src/lib/email/brevo.ts` | `sendEmail()` — já criada ✅ |
| `src/app/auth/invite/[token]/page.tsx` | Página de signup pré-preenchida (próximo passo) |
| `src/app/api/users/invite/route.ts` | POST que gera token + manda email (próximo passo) |
| `src/app/app/users/page.tsx` | Tela de gestão de membros (próximo passo) |

## ⏳ Dependências

Esta migration funciona em paralelo com as 3 migrations pendentes anteriores:

- `20260716000000_fix_profile_insert_policies.sql`
- `20260716000001_fix_task_dependencies_rls.sql`
- `20260716000002_add_parent_task_id.sql`

Pode aplicar esta **20260722000000** sem precisar ter aplicado as anteriores, mas as funcionalidades de Hierarquia (WBS) e Dependências continuam off até as migrations anteriores rodarem.

## 📐 Schema da tabela

```sql
invite_tokens
├── id              UUID PRIMARY KEY
├── workspace_id    UUID → workspaces(id) ON DELETE CASCADE
├── email           TEXT
├── role            TEXT (admin | member | viewer)
├── token           TEXT UNIQUE (default: random UUID)
├── invited_by      UUID → auth.users(id)
├── status          TEXT (pending | accepted | revoked | expired)
├── expires_at      TIMESTAMPTZ (default: NOW + 7 days)
├── accepted_at     TIMESTAMPTZ
├── accepted_by     UUID → auth.users(id)
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ
```
