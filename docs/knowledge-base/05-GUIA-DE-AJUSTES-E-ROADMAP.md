# 🚀 CHRONOS — Base de Conhecimento: Guia Prático de Ajustes e Roadmap

> **Módulo:** Matriz de Priorização, Planos de Ação e Roadmap Executivo  
> **Objetivo:** Orientar a execução dos ajustes de Performance, Segurança, Funcionalidade e Aparência.

---

## 1. Matriz de Prioridades (P0 / P1 / P2)

```
        ▲ Impacto
        │
     P1 │  [TanStack Query / Cache]        [Feriados Nacionais Brasil]
        │  [Otimização RLS Postgres]       [Sincronização Realtime]
        │
     P0 │  [Bloqueio Auth em Produção]     [Sanitização Importação Excel]
        │  [Bearer Token no Cron]          [Índices Compostos DB]
        │
     P2 │  [Skeletons & Empty States]      [Módulo EVA / Custos]
        │  [Virtual Scroll no Kanban]      [Timesheet / Cronômetro]
        └─────────────────────────────────────────────────────────────►
                                                           Complexidade
```

---

## 2. Planos de Ação por Pilar

### ⚡ Pilar 1: Ajustes de Performance

| Etapa | Ação Técnica | Arquivos Envolvidos | Resultado |
| :---: | :--- | :--- | :--- |
| **1.1** | **Índices Compostos no Postgres**<br>Criar índices `(workspace_id, project_id)` e `(project_id, status)` nas tabelas `tasks` e `stages`. | `supabase/migrations/` | Consultas filtradas 3x a 5x mais rápidas no Supabase. |
| **1.2** | **Carga Parcial por Projeto Ativo**<br>Alterar `data-provider.ts` para carregar tarefas apenas do projeto/fechamento em exibição na rota, em vez de todo o workspace. | `data-provider.ts`<br>`DataContext.tsx` | Redução drástica do payload inicial JSON (de ~2MB para ~50KB). |
| **1.3** | **Virtualização de Listas no Kanban/Tabela**<br>Adicionar `@tanstack/react-virtual` nas colunas do Kanban com mais de 50 tarefas. | `src/app/app/kanban/page.tsx`<br>`FastCloseListView.tsx` | Drag and drop fluido com 60 FPS estáveis mesmo com centenas de itens. |

---

### 🔒 Pilar 2: Ajustes de Segurança

| Etapa | Ação Técnica | Arquivos Envolvidos | Resultado |
| :---: | :--- | :--- | :--- |
| **2.1** | **Trava Estrita de Produção no Middleware**<br>Bloquear qualquer requisição a `/app/*` caso as credenciais Supabase não estejam presentes em ambiente `NODE_ENV === 'production'`. | `src/middleware.ts`<br>`src/lib/supabase/middleware.ts` | Elimina risco de vazamento de telas privadas em deploys sem env vars. |
| **2.2** | **Autenticação em Rotas de Cron e Webhooks**<br>Exigir cabeçalho `Authorization: Bearer <CRON_SECRET>` na rota `/api/cron/due-alerts`. | `src/app/api/cron/` | Impede que robôs ou usuários anônimos acionem o disparo em massa de alertas. |
| **2.3** | **Sanitização de Planilhas de Importação**<br>Tratar células com caracteres de comando de fórmula (`=`, `+`, `-`, `@`) antes de persistir tarefas importadas. | `src/lib/excel-parser.ts` | Proteção contra *Formula Injection (CSV Injection)*. |

---

### ⚙️ Pilar 3: Ajustes de Funcionalidade

| Etapa | Ação Técnica | Arquivos Envolvidos | Resultado |
| :---: | :--- | :--- | :--- |
| **3.1** | **Tabela de Feriados Bancários / Nacionais**<br>Integrar a lista de feriados oficiais do Brasil no utilitário de dias úteis, pulando Carnaval, Páscoa, Corpus Christi e datas cívicas. | `src/lib/business-days.ts` | Cálculo de $D0$ e offsets de fechamento contábil 100% aderentes à realidade contábil nacional. |
| **3.2** | **Propagação Automática de Prazos no Grafo (DAG)**<br>Ao adiar uma tarefa com dependência `FS`, calcular e sugerir o deslocamento das tarefas dependentes sucessoras. | `DependencyManager.tsx`<br>`TaskDialog.tsx` | Manutenção automática do caminho crítico na Timeline de Gantt. |
| **3.3** | **Rollup Bidirecional de Progresso em Subtarefas**<br>Atualizar automaticamente o progresso percentual da tarefa-mãe conforme as tarefas-filhas são concluídas. | `DataContext.tsx`<br>`src/lib/task-sorting.ts` | Visão WBS fiel à evolução física real das atividades. |

---

### 🎨 Pilar 4: Ajustes de Aparência e UX/UI

| Etapa | Ação Técnica | Arquivos Envolvidos | Resultado |
| :---: | :--- | :--- | :--- |
| **4.1** | **Skeletons Estruturados de Carregamento**<br>Substituir o spinner único por `<Skeleton />` moldado no formato das colunas do Kanban e das linhas da tabela de fechamento. | `src/app/app/fast-close/page.tsx`<br>`src/app/app/kanban/page.tsx` | Zero layout shift (CLS), sensação instantânea de agilidade na navegação. |
| **4.2** | **Empty States Ilustrados com Call-to-Action**<br>Exibir cards informativos quando um projeto ainda não tiver etapas ou tarefas criadas, oferecendo atalhos rápidos de criação ou uso de template. | Componentes em `src/components/` | Redução drástica de dúvidas no onboarding de novos usuários. |
| **4.3** | **Refinamento Responsivo do Gantt**<br>Em telas menores que 768px, alertar o usuário e disponibilizar alternância com 1 clique para a visão de lista ou matriz tabular. | `src/app/app/timeline/page.tsx` | Usabilidade impecável em dispositivos móveis e tablets. |

---

## 3. Próximos Passos Recomendados

Para iniciar a execução dos ajustes de forma segura e organizada, a ordem recomendada é:
1. **Passo 1 (Segurança & Integridade):** Aplicar as travas do middleware e o secret do cron.
2. **Passo 2 (Performance na Raiz):** Adicionar índices no PostgreSQL e ajustar a consulta do `data-provider.ts` para carregar por projeto ativo.
3. **Passo 3 (Funcionalidade Contábil):** Incluir os feriados nacionais em `business-days.ts`.
4. **Passo 4 (Polimento Visual):** Implementar os Skeletons de carregamento e o refinamento responsivo.
