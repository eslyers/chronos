# 🔒 CHRONOS — Base de Conhecimento: Segurança e Políticas de Acesso

> **Módulo:** Arquitetura de Segurança, RLS, Autenticação e Sanitização  
> **Prioridade de Ajuste:** Crítica

---

## 1. Modelo de Isolamento Multi-Tenant e RLS (Postgres)

O Chronos utiliza o **Row Level Security (RLS)** nativo do PostgreSQL para garantir que nenhum usuário consiga visualizar, criar, alterar ou excluir registros pertencentes a outro *workspace*.

### 1.1 Função de Associação Central
```sql
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### 1.2 Regras de RLS por Tabela

| Tabela | Políticas Ativas | Regra de Negócio |
| :--- | :--- | :--- |
| `workspaces` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Visível apenas para o proprietário (`owner_id = auth.uid()`) ou membros listados em `workspace_members`. |
| `workspace_members` | `SELECT`, `ALL` | Membros visualizam outros membros. Modificações exigem papel de administrador/proprietário. |
| `projects` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Operações restritas a membros do workspace ao qual o projeto pertence. |
| `tasks` | `SELECT`, `ALL` | Restrito aos projetos vinculados a workspaces onde o usuário autenticado é membro. |
| `task_dependencies` | `SELECT`, `INSERT`, `DELETE` | Corrigido em migration recente para incluir cláusulas `WITH CHECK` obrigatórias. |
| `notification_subscribers` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Usuário gerencia apenas suas próprias inscrições (`user_id = auth.uid()`). |

---

## 2. Autenticação e Middleware de Sessão

* **Arquivo de Controle:** [middleware.ts](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/middleware.ts) e [src/lib/supabase/middleware.ts](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/lib/supabase/middleware.ts).
* **Mecanismo:** Utiliza `@supabase/ssr` para ler e renovar tokens JWT armazenados em cookies HTTP-only seguros.
* **Redirecionamento Automático:** Qualquer tentativa de acessar rotas que iniciem com `/app` sem sessão válida redireciona para `/auth/login?redirect=...`.
* **⚠️ Alerta de Segurança / Modo Demo:**
  * No código atual do middleware:
    ```typescript
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return supabaseResponse // Bypassa a autenticação se env vars não estiverem configuradas
    }
    ```
  * *Recomendação de Produção:* Em ambientes de produção (Vercel/Cloud), validar a presença obrigatória das variáveis e nunca permitir bypass em rotas `/app`.

---

## 3. Segurança nas Rotas de API (`/api/*`)

1. **Rotas de Cron (`/api/cron/*`):**
   * Usadas para disparar verificações de tarefas vencidas e alertas automáticos.
   * *Requisito de Segurança:* Exigir cabeçalho `Authorization: Bearer <CRON_SECRET>` para impedir acionamento não autorizado por terceiros.
2. **Rotas de Convite (`/api/invites/*`):**
   * Emitem tokens únicos com expiração (`expires_at`).
   * *Requisito de Segurança:* Validar unicidade do e-mail, verificar se o token não expirou e revogar após aceitação (`accepted_at`).
3. **Rotas de Telegram (`/api/telegram/*`):**
   * Webhook do bot do Telegram.
   * *Requisito de Segurança:* Validar o `X-Telegram-Bot-Api-Secret-Token` fornecido pelo Telegram na configuração do webhook.

---

## 4. Sanitização e Proteção contra Ataques

* **Injeção de Planilhas (CSV/Excel Formula Injection):**
  * Na importação de arquivos em [excel-parser.ts](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/lib/excel-parser.ts), strings que comecem com `=`, `+`, `-` ou `@` devem ser higienizadas para evitar execução de macros ou fórmulas arbitrárias em planilhas abertas por outros usuários.
* **Validação de Schemas com Zod:**
  * Todas as entradas de criação e edição de projetos, tarefas e dependências devem passar por validação estrita com Zod antes de persistir no banco.
* **XSS em Conteúdo Rico:**
  * Descrições de tarefas e notas de transição de estágio devem ser renderizadas como texto plano ou passadas por um sanitizador (como DOMPurify) se no futuro suportarem Markdown/HTML.
