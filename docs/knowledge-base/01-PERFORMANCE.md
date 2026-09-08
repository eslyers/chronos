# ⚡ CHRONOS — Base de Conhecimento: Performance e Otimização

> **Módulo:** Diagnóstico de Performance, Gargalos e Guia de Otimização  
> **Prioridade de Ajuste:** Alta

---

## 1. Diagnóstico dos Gargalos Atuais

### 1.1 Centralização Monolítica no `DataContext.tsx`
* **Cenário Atual:** O arquivo `src/lib/context/DataContext.tsx` acumula mais de 1.000 linhas de código e gerencia o estado global de **todos os projetos, estágios, tarefas e dependências** do workspace em um único `useState`.
* **Impacto:** Qualquer mutação em uma única tarefa (ex: atualizar o título ou progresso) dispara o re-render de todos os componentes consumidores do contexto (`Timeline`, `Kanban`, `FastCloseListView`, etc.), a menos que estejam estritamente isolados por `React.memo`.
* **Solução Recomendada:**
  1. Decompor o estado global em stores menores ou adotar gerenciamento de cache de servidor via **TanStack Query (React Query)** ou **SWR**.
  2. Implementar seletores atômicos (ex: `useProjectTasks(projectId)`) para que a alteração de uma tarefa de um projeto não re-renderize outros módulos.

---

### 1.2 Query Waterfall e Ausência de Paginação
* **Cenário Atual:** Em `src/lib/data/supabase-data.ts`:
  ```typescript
  // Carrega todos os projetos do workspace
  const projects = await fetchAllProjects();
  // Carrega todos os estágios de todos os projetos
  const stages = await fetchAllStages(projectIds);
  // Carrega todas as tarefas de todos os projetos
  const tasks = await fetchAllTasks(projectIds);
  // Carrega todas as dependências de todas as tarefas
  const dependencies = await fetchAllDependencies(taskIds);
  ```
* **Impacto:** O tempo de carga inicial (*Time to Interactive*) cresce linearmente com o volume de dados. Em workspaces com dezenas de projetos e milhares de tarefas, a requisição transfere megabytes desnecessários pela rede.
* **Solução Recomendada:**
  1. Carregar tarefas sob demanda baseando-se na rota ativa (`/app/fast-close?month=07&year=2026` só deve buscar tarefas do fechamento selecionado).
  2. Aplicar paginação baseada em cursor ou *infinite scroll* na visão de lista e no histórico de atividades.

---

### 1.3 Subqueries Aninhadas em Políticas de RLS (Postgres)
* **Cenário Atual:** Nas tabelas `tasks` e `task_dependencies`, as políticas de segurança realizam buscas com subqueries aninhadas em 3 níveis:
  ```sql
  -- Exemplo em task_dependencies:
  task_id IN (
    SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  ```
* **Impacto:** Em grandes volumes de registros, o planejador de consultas do PostgreSQL pode degradar o plano de execução, gerando varreduras de índice sequenciais (*seq scan*) repetidas para cada linha avaliada.
* **Solução Recomendada:**
  1. Denormalizar o `workspace_id` diretamente na tabela `tasks` e `task_dependencies`.
  2. Usar funções estáveis de consulta (`STABLE functions`) que armazenam o resultado em cache durante a transação, ou utilizar claims JWT customizadas (`auth.jwt() -> app_metadata -> workspace_id`).

---

### 1.4 Renderização no Gantt e Kanban
* **Gantt:** O componente `gantt-task-react` exige um array plano de tarefas ordenadas. A conversão da hierarquia WBS em tempo real (`sortTasksWithHierarchy`) roda no thread principal do cliente JavaScript.
* **Kanban:** O `@dnd-kit` renderiza colunas com múltiplos cartões. Quando há mais de 100 tarefas por estágio, a ausência de virtualização de lista (*virtual scrolling*) pode gerar lentidão durante o *drag-and-drop*.
* **Solução Recomendada:**
  1. Utilizar `@tanstack/react-virtual` dentro das colunas do Kanban para projetos volumosos.
  2. Memoizar intensivamente a árvore calculada de datas e ordenações com `useMemo` atrelado exclusivamente ao hash de modificação das tarefas do projeto.

---

## 2. Checklist de Otimização Imediata

| Ação | Complexidade | Ganho Esperado |
| :--- | :---: | :---: |
| Filtrar carga de tarefas por `projectId` ativo na tela | Média | 🚀 60-80% menos dados na rede |
| Adicionar índices compostos no Postgres (`workspace_id`, `project_id`, `status`) | Baixa | ⚡ Consultas 3x mais rápidas |
| Migrar `DataContext` para React Query / TanStack Query | Alta | 🎯 Cache inteligente + Zero waterfall |
| Adicionar Virtualização no Kanban e FastCloseListView | Média | 🖥️ FPS estável a 60fps no drag & drop |
| Compactar payloads JSON do histórico de auditoria | Baixa | 📦 Redução de tráfego |
