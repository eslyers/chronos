# 🕐 CHRONOS — Base de Conhecimento: Visão Geral e Arquitetura do Sistema

> **Versão:** 1.0.0  
> **Status:** Ativo & Documentado  
> **Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Supabase (PostgreSQL + RLS + Edge Functions), Tailwind CSS, shadcn/ui.

---

## 1. Propósito e Proposta de Valor

O **CHRONOS** é uma plataforma corporativa e open source de gestão de cronogramas, timelines e fechamento financeiro (*Fast Close*). O sistema combina três abordagens fundamentais:
1. **Visão Estratégica & Temporal (Gantt/Timeline):** Acompanhamento visual de datas, marcos, hierarquia WBS (*Work Breakdown Structure*) e grafo de dependências entre tarefas.
2. **Visão Tática de Execução (Kanban Board):** Gestão de fluxo de trabalho por colunas (*stages*), com limites de WIP (*Work in Progress*), transições registradas em log de auditoria e status reativo.
3. **Visão Operacional Especializada (Fast Close):** Módulo para fechamento contábil e financeiro baseado em dias úteis corporativos ($D-X$, $D0$, $D+X$), cópia de fechamento entre meses e importação via planilhas.
4. **Comunicação Automatizada (Dual-Channel Notifications):** Alertas de vencimento iminente (*due soon*) e atrasos (*overdue*) via Telegram Bot e e-mail transacional (Brevo/Resend).

---

## 2. Mapa Arquitetural do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                │
│                                                                         │
│   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   │
│   │   Fast Close     │  │  Timeline Gantt  │  │    Kanban Board     │   │
│   │  (Business Days) │  │  (WBS + DAG Deps)│  │    (WIP Limits)     │   │
│   └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘   │
│            │                     │                       │              │
│            └─────────────────────┼───────────────────────┘              │
│                                  ▼                                      │
│                  ┌──────────────────────────────┐                       │
│                  │       DataContext.tsx        │                       │
│                  │  (Store Central do Frontend) │                       │
│                  └───────────────┬──────────────┘                       │
│                                  ▼                                      │
│                  ┌──────────────────────────────┐                       │
│                  │     data-provider.ts         │                       │
│                  │   (Dual Layer Abstraction)   │                       │
│                  └───────┬──────────────┬───────┘                       │
└──────────────────────────┼──────────────┼───────────────────────────────┘
                           │              │
             ┌─────────────┘              └─────────────┐
             ▼ (isSupabaseConfigured)                   ▼ (Fallback Local)
┌──────────────────────────────────────┐     ┌────────────────────────────┐
│         SUPABASE CLOUD / SSR         │     │        LOCALSTORAGE        │
│                                      │     │                            │
│  ┌────────────────────────────────┐  │     │  Armazenamento demo em     │
│  │ PostgreSQL 15+ & RLS Policies  │  │     │  memória persistente do    │
│  │ (10+ Tabelas Relacionais)      │  │     │  navegador                 │
│  └────────────────────────────────┘  │     └────────────────────────────┘
│  ┌────────────────────────────────┐  │
│  │ Auth & Workspace Membership    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Edge Functions & Pg_Cron       │──┼──► [ Telegram Bot API ]
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 3. Estrutura de Pastas e Responsabilidades

```
chronos/
├── .agents/                      # Kit de agentes, regras e automações IA
├── docs/
│   ├── knowledge-base/           # Esta Base de Conhecimento estruturada
│   └── chronos_roadmap.md        # Especificação de roadmap futuro (EVA, Timesheet, Workload)
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (home)/               # Landing page pública e institucional
│   │   ├── auth/                 # Rotas de autenticação (login, register, callback)
│   │   ├── app/                  # Rotas protegidas da aplicação
│   │   │   ├── page.tsx          # Dashboard principal de KPIs e visão consolidada
│   │   │   ├── fast-close/       # Módulo de Fechamento Contábil / Financeiro
│   │   │   ├── timeline/         # Visualização Gantt (gantt-task-react)
│   │   │   ├── kanban/           # Quadro Kanban com dnd-kit
│   │   │   ├── calendar/         # Visão de calendário (FullCalendar)
│   │   │   ├── projects/         # CRUD e métricas de projetos
│   │   │   ├── templates/        # Gestor de templates corporativos e contábeis
│   │   │   ├── activity/         # Trilha de auditoria (stage_transitions)
│   │   │   ├── users/            # Gestão de membros do workspace e convites
│   │   │   ├── notifications/    # Centro de histórico e preferências de notificações
│   │   │   └── settings/         # Configurações do workspace e integrações (Telegram)
│   │   └── api/                  # API Routes (Cron jobs, Webhooks, Invites, Telegram)
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Design system shadcn/ui (Button, Dialog, Badge, Card...)
│   │   ├── AppLayout.tsx         # Shell padrão (Sidebar retrátil, Header, Menu do Usuário)
│   │   ├── TaskDialog.tsx        # Modal completo de edição de tarefa, datas, WBS e deps
│   │   ├── FastCloseListView.tsx # Visão tabular do fechamento financeiro
│   │   ├── DependencyManager.tsx # Gerenciador de dependências entre tarefas
│   │   ├── ProjectStatusReportPDF.tsx # Gerador de relatório executivo em PDF
│   │   └── ImportDialog.tsx      # Modal de importação de arquivos Excel/CSV
│   ├── lib/                      # Lógica de negócio, utilitários e clientes
│   │   ├── business-days.ts      # Cálculo de dias úteis com suporte a D0
│   │   ├── excel-parser.ts       # Leitura e parsing de arquivos .xlsx e .csv
│   │   ├── task-sorting.ts       # Ordenação hierárquica WBS e posicional
│   │   ├── types.ts              # Tipos TypeScript gerados do schema Supabase
│   │   ├── context/
│   │   │   ├── DataContext.tsx   # Gerenciador de estado global de tarefas, estágios e projetos
│   │   │   └── GlobalContext.tsx # Contexto de autenticação, usuário e workspace ativo
│   │   ├── data/
│   │   │   ├── data-provider.ts  # Interface que alterna entre Supabase e LocalStorage
│   │   │   └── supabase-data.ts  # Queries e mutações reais no Supabase
│   │   └── email/                # Clientes e templates Brevo e Resend
│   └── middleware.ts             # Interceptor de sessão e proteção de rotas
└── supabase/
    ├── migrations/               # Scripts SQL de schema, RLS e triggers
    └── functions/                # Edge Functions Deno (due-soon-alert)
```

---

## 4. O Ciclo de Dados e Persistência Dual

1. **Leitura Inicial:** O componente `DataProvider` invoca `loadWorkspaceContext()` para identificar o `workspace_id` do usuário logado.
2. **Carga em Massa:** Se o Supabase estiver configurado (`isSupabaseConfigured() === true`), executa `fetchAllProjects()`, `fetchAllStages()`, `fetchAllTasks()` e `fetchAllDependencies()`.
3. **Modo Offline/Demonstração:** Caso contrário, inicializa do `localStorage` permitindo testar toda a interface sem dependência de banco de dados.
4. **Mutações Reativas:** Criar, editar ou mover tarefas altera o estado local do React imediatamente (*Optimistic UI*) e despacha a persistência assíncrona ao Supabase.
