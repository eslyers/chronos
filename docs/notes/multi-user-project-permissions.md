# Plano: Controle de Acesso Multi-usuário e Visibilidade de Projetos

## 1. Visão Geral
Atualmente, qualquer usuário aceito em um Workspace enxerga todos os projetos daquele workspace porque a política RLS do banco (`projects`) concede permissão de leitura para todos os membros (`is_workspace_member`).
O objetivo é implementar um controle granular baseado no **Modelo Híbrido**:
1. **Administradores / Owners do Workspace:** visibilidade global de todos os projetos para auditoria, governança e gestão.
2. **Membros e Visualizadores:** enxergam **apenas**:
   - Os projetos criados por eles mesmos (`created_by = auth.uid()`);
   - Os projetos para os quais foram explicitamente convidados/adicionados (`project_members`).

---

## 2. Arquitetura e Mudanças no Banco de Dados (Supabase)

### A. Nova Tabela `public.project_members`
```sql
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### B. Funções Auxiliares de Permissão
1. `is_workspace_admin(p_workspace_id UUID, p_user_id UUID) -> boolean`:
   - Retorna `true` se o usuário for `owner` ou `admin` na tabela `workspace_members`.
2. `has_project_access(p_project_id UUID, p_user_id UUID) -> boolean`:
   - Retorna `true` se:
     - O usuário for admin do workspace do projeto; OU
     - O usuário for o criador (`created_by`); OU
     - O usuário estiver cadastrado em `project_members`.

### C. Atualização das Políticas de RLS
1. **Tabela `projects`:**
   - **SELECT:** `has_project_access(id, auth.uid())`
   - **INSERT:** `is_workspace_member(workspace_id, auth.uid())` (atribui automaticamente `created_by = auth.uid()`)
   - **UPDATE:** `is_workspace_admin(workspace_id, auth.uid()) OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))`
   - **DELETE:** `is_workspace_admin(workspace_id, auth.uid()) OR created_by = auth.uid()`
2. **Tabela `tasks`, `stages`, `task_dependencies`, `task_comments`:**
   - RLS validando `has_project_access(project_id, auth.uid())` para garantir isolamento em todas as telas (Gantt, Kanban, Calendário, etc.).

### D. Trigger Automático no Projeto
- Ao criar um projeto (`INSERT` em `projects`), adicionar automaticamente o `created_by` como `owner` em `project_members`.

---

## 3. Mudanças no Frontend e APIs (Next.js)

### A. Gerenciamento de Membros do Projeto (UI)
- Na tela de configurações/detalhes do projeto (`/app/projects/[id]` ou diálogo de edição do projeto):
  - Adicionar aba/seção **"Membros do Projeto"**.
  - Permitir que o criador ou admin do workspace selecione membros do workspace para dar acesso ao projeto.
  - Exibir quem tem acesso atual ao projeto.

### B. Atribuição e Convites
- Na tela de criação/edição de projetos, permitir escolher quais membros do workspace terão acesso.
- No filtro global de projetos (`DataContext.tsx`), os dados retornados do Supabase já virão filtrados nativamente pelo RLS.

---

## 4. Tarefas de Implementação

- [ ] **Task 1: Migration do Banco de Dados**
  - Criar `supabase/migrations/20261003010000_add_project_members_and_multiuser_rls.sql`.
  - Criar tabela `project_members`, índices e funções de checagem.
  - Atualizar RLS de `projects`, `tasks`, `stages` e dependências.
  - Executar migration no Supabase de produção via MCP.
  - *Critério de Verificação:* `SELECT * FROM projects` como usuário comum só retorna projetos criados por ele ou onde é membro.

- [ ] **Task 2: Camada de Dados (`src/lib/data/supabase-data.ts`)**
  - Implementar funções CRUD de membros do projeto: `fetchProjectMembers`, `addProjectMember`, `removeProjectMember`.
  - Garantir que `createProject` envie `created_by: user.id`.
  - *Critério de Verificação:* Chamadas TypeScript tipadas sem erros de linter.

- [ ] **Task 3: Interface de Compartilhamento de Projetos (UI)**
  - Adicionar modal / componente para gerenciar membros do projeto em `src/components/projects/` ou no diálogo do projeto.
  - Permitir selecionar usuários do workspace (via `profiles` / `workspace_members`) e adicioná-los ao projeto.
  - *Critério de Verificação:* Usuário admin consegue adicionar um membro ao projeto e removê-lo.

- [ ] **Task 4: Validação em Todas as Telas**
  - Testar com usuário Admin (`eslyers@gmail.com`): continua vendo todos os projetos.
  - Testar com usuário Membro (`ersilva@piccadilly.com.br`): vê inicialmente 0 projetos antigos, cria um novo projeto e vê apenas esse novo projeto, e ao receber convite num projeto existente passa a visualizá-lo no Dashboard, Kanban e Timeline.
  - *Critério de Verificação:* `npm test`, `npm run type-check` e teste funcional no navegador.
