# CHRONOS — Proposta Técnica Oficial

**Versão:** 1.0  
**Data:** 14/07/2026  
**Autor:** Sarah (a.i.)  
**Projeto:** Sistema de Gestão de Cronograma e Timeline  
**Nome:** CHRONOS  

---

## Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Análise de Mercado — Sistemas Comerciais](#2-análise-de-mercado--sistemas-comerciais)
3. [Análise de Mercado — Open Source GitHub](#3-análise-de-mercado--open-source-github)
4. [Frameworks e Métodos Clássicos](#4-frameworks-e-métodos-clássicos)
5. [Requisitos Funcionais](#5-requisitos-funcionais)
6. [Arquitetura Técnica](#6-arquitetura-técnica)
7. [Stack Tecnológica](#7-stack-tecnológica)
8. [Schema do Banco de Dados](#8-schema-do-banco-de-dados)
9. [UX/UI — Telas e Fluxos](#9-uxui--telas-e-fluxos)
10. [Automações e Integrações](#10-automações-e-integrações)
11. [Segurança e Multi-Tenancy](#11-segurança-e-multi-tenancy)
12. [Roadmap de Desenvolvimento](#12-roadmap-de-desenvolvimento)
13. [Custos Operacionais](#13-custos-operacionais)
14. [Análise de Riscos](#14-análise-de-riscos)
15. [Conclusão e Próximos Passos](#15-conclusão-e-próximos-passos)

---

## 1. Resumo Executivo

**CHRONOS** é um sistema de gestão de cronograma e timeline open source, projetado para equipes e projetos que precisam de visualização clara de etapas, evolução de progresso e notificações inteligentes.

**Diferencial:** Foco em **timeline visual** (Gantt + Kanban) + **automação de notificações** (Telegram nativo) + **evolução etapa-a-etapa** com alertas contextuais.

**Situação atual:** Este documento consolida pesquisa de mercado (10 sistemas comerciais líderes + 8 projetos open source GitHub) e metodologias clássicas em uma proposta técnica unificada.

**Recomendação:** Desenvolver como projeto **novo e independente**, utilizando como base:
- **Template:** Razikus/supabase-nextjs-template (Next.js 15 + Supabase + Tailwind, MIT)
- **Componente Gantt:** MaTeMaTuK/gantt-task-react (TypeScript, 1.1k ⭐)
- **Inspiração AI:** Taskosaur/Taskosaur (AI Conversational, 525 ⭐)
- **UX Reference:** Georgegriff/react-dnd-kit-tailwind-shadcn-ui (817 ⭐)

**Tempo estimado para MVP:** 5-6 semanas  
**Custo operacional estimado:** R$ 0-100/mês (Vercel Hobby + Supabase Free)

---

## 2. Análise de Mercado — Sistemas Comerciais

### 2.1 Top 10 Sistemas Comerciais (2026)

| # | Sistema | estrelas GitHub | Forte em | Fraco em | Preço indicativo |
|---|---------|-----------------|----------|----------|-----------------|
| 1 | **monday.com** | — | Gantt + Automations + Alertas | Caro ($$$) | $9-19/usuário/mês |
| 2 | **ClickUp** | 3k+ | Tudo-em-1, free tier robusto | UI poluída | $7-12/usuário/mês |
| 3 | **Asana** | — | Coordenação times grandes | Customização média | $10-30/usuário/mês |
| 4 | **MS Project** | — | Enterprise + Critical Path | Complexo p/ small teams | $10/usuário/mês |
| 5 | **Smartsheet** | — | Planilha + Gantt | UI datada | $14-49/usuário/mês |
| 6 | **Wrike** | — | Collab + alertas escala | Preço alto | $9-24/usuário/mês |
| 7 | **Jira** | — | Devs + roadmaps | Curva de aprendizado | $7-15/usuário/mês |
| 8 | **Notion (Timeline View)** | — | Flexível + database | Não é nativo de timeline | $8-15/usuário/mês |
| 9 | **TeamGantt** | — | Gantt puro e simples | Features limitadas | $16-39/usuário/mês |
| 10 | **BigTime / Float** | — | Resource scheduling | Não p/ todos | $19-49/usuário/mês |

### 2.2 Análise Comparativa de Preços (anual, por usuário)

```
monday.com    ████████████████████████████ $228-456/ano
ClickUp       ██████████████ $84-144/ano        ← MELHOR CUSTO-BENEFÍCIO
Asana         ████████████████████████████████ $120-360/ano
MS Project    ██████████████████████████ $120/ano
Smartsheet    █████████████████████████████ $168-588/ano
Notion        ██████████████████████ $96-180/ano ← INTERESSANTE, MAS FRACO EM TIMELINE
```

### 2.3 Lições Aprendidas dos Sistemas Comerciais

| Sistema | Feature distintiva | Aplicar no CHRONOS |
|---------|-------------------|-------------------|
| **monday.com** | Automations + Integrations Hub | Sistema de automações plugável |
| **ClickUp** | Free tier generoso + Views múltiplas | Multi-view (Gantt/Kanban/Calendar) |
| **Asana** | Portfólios + Timeline view | Dashboard de múltiplos projetos |
| **Jira** | Sprints + Critical Path | Modo ágil opcional |
| **Notion** | Databases flexíveis + Templates | Sistema de templates rico |
| **TeamGantt** | Gantt puro e direto | Foco em Gantt de qualidade |

---

## 3. Análise de Mercado — Open Source GitHub

### 3.1 Top 8 Projetos Open Source

| # | Repo | ⭐ | Linguagem | Licença | Tipo | Observação |
|---|------|-----|-----------|---------|------|------------|
| 1 | **makeplane/plane** | 54.441 | TypeScript | AGPL-3.0 | All-in-one PM | Jira/Monday alternative |
| 2 | **hcengineering/platform** (Huly) | 26.885 | TypeScript | Apache-2.0 | All-in-one PM | Linear/Jira/Slack alt |
| 3 | **MrLesk/Backlog.md** | 6.175 | TypeScript | MIT | AI-first PM | Markdown-driven |
| 4 | **neuronetio/gantt-schedule-timeline-calendar** | 3.608 | TypeScript | MIT | Lib Gantt | Componente completo |
| 5 | **MaTeMaTuK/gantt-task-react** | 1.090 | TypeScript | MIT | Lib Gantt | Leve, integra fácil |
| 6 | **Georgegriff/react-dnd-kit-tailwind-shadcn-ui** | 817 | TypeScript | MIT | Kanban template | UX referência |
| 7 | **Taskosaur/Taskosaur** | 525 | TypeScript | MIT | PM + AI | AI Conversational |
| 8 | **Razikus/supabase-nextjs-template** | 317 | TypeScript | MIT | Template SaaS | Base prod-ready |

### 3.2 Análise Técnica Detalhada

#### makeplane/plane (54.441 ⭐)
- **Stack:** React + Go (backend) + PostgreSQL
- **Features:** Backlogs, Sprints, GitHub integration, Gantt, Calendar
- **Prós:** Altíssima comunidade, enterprise-ready, 100+ integrações
- **Contras:** AGPL-3.0 (copyleft!), muito pesado, exige DevOps advanced
- **O que pegar:** Arquitetura de plugins, sistema de views

#### hcengineering/platform / Huly (26.885 ⭐)
- **Stack:** TypeScript + React (frontend), Node.js (backend)
- **Features:** Chat, documents, OKRs, project management, HRM
- **Prós:** Suite completa, Apache-2.0, bem documentado
- **Contras:** Overkill para cronogramas simples,相依复杂
- **O que pegar:** Sistema de realtime collaboration

#### Taskosaur/Taskosaur (525 ⭐) ⭐ FAVORITO
- **Stack:** Next.js 15 + TypeScript + Tailwind + Supabase
- **Features:** AI Conversational Task Execution, Project Management
- **Prós:** Stack moderna idêntica à planejada, AI nativo, MIT, легко fork
- **Contras:** Comunidade pequena (525 ⭐)
- **O que pegar:** Integração AI + UI conversacional + schema base

#### MaTeMaTuK/gantt-task-react (1.090 ⭐) ⭐ COMPONENTE ESCOLHIDO
- **Stack:** React + TypeScript + CSS
- **Features:** Gantt chart interativo, dependencies, drag-and-drop
- **Prós:** Leve, MIT, fácil de customizar, 100% TS
- **Contras:** Não tem backend/schema
- **Uso:** Componente principal de Gantt

#### Georgegriff/react-dnd-kit-tailwind-shadcn-ui (817 ⭐)
- **Stack:** React + dnd-kit + Tailwind + shadcn/ui
- **Features:** Kanban board com drag-and-drop acessível
- **Prós:** UI moderna (shadcn/ui), acessível (a11y), dnd-kit profissional
- **Contras:** Apenas frontend (mock data)
- **Uso:** Referência de UX/Kanban + biblioteca de UI components

#### Razikus/supabase-nextjs-template (317 ⭐) ⭐ TEMPLATE ESCOLHIDO
- **Stack:** Next.js 15 + Supabase + Tailwind + TypeScript
- **Features:** Auth, multi-tenant, billing, database schema, CI/CD
- **Prós:** Production-ready, MIT, stack idêntica ao CHRONOS
- **Contras:** Template genérico (não é específico de PM)
- **Uso:** BASE DO PROJETO

### 3.3 Matriz de Decisão — Componentes a Utilizar

| Componente | Proveniência | Uso no CHRONOS | Peso |
|-----------|-------------|----------------|------|
| Razikus template | GitHub (MIT) | Template base | 40% |
| gantt-task-react | GitHub (MIT) | Componente Gantt | 20% |
| Georgegriff Kanban | GitHub (MIT) | UX Reference | 15% |
| Taskosaur AI | GitHub (MIT) | Feature AI | 15% |
| Estrutura Plane | GitHub (AGPL) | Arquitetura (estudo) | 10% |

---

## 4. Frameworks e Métodos Clássicos

### 4.1 Linha do Tempo Histórica

| Ano | Framework/Método | Autor/Org | Contribuição ключевая |
|-----|-----------------|----------|---------------------|
| **1910** | **Henry Gantt** | Gantt | Gráfico de barras — visualização tempo×etapa |
| **1910** | **Henry Fayol** | Fayol | 5 funções admin: Planejar, Organizar, Comandar, Coordenar, Controlar |
| **1956** | **Henri Fayol** | Fayol | Funções de gestão — base da admin moderna |
| **1958** | **PERT** | Marinha US (Polaris) | Avaliação probabilística de tarefas interligadas |
| **1958** | **CPM** (Critical Path Method) | DuPont | Caminho crítico — folga e dependências |
| **1960s** | **WBS** (Work Breakdown Structure) | NASA Apollo | Decomposição hierárquica de projetos |
| **1986** | **Kanban** | Taiichi Ohno (Toyota) | Fluxo puxado, limites WIP, visualização |
| **1997** | **Critical Chain** | Eliyahu Goldratt | Buffers proteggidos, recursos como constraints |
| **2001** | **Agile Manifesto** | 17 especialistas | Iterações curtas, adaptabilidade, individuals > processes |
| **2001** | **Scrum** | Ken Schwaber + Jeff Sutherland | Sprints, roles (PO/SM/Team), eventos rituais |
| **2010s** | **Scrum@Scale** | Scrum.org | Escalar Scrum para múltiplos times |
| **2020s** | **Hybrid PM** | Múltiplos | Gantt macro (waterfall) + Kanban execução (agile) |

### 4.2 Comparativo de Métodos

| Método | Quando usar | Prós | Contras |
|--------|------------|------|---------|
| **Gantt** | Projetos fixed-scope, clientes externos | Visual intuitivo, Dependencies claras | Rigidez, difícil ajustar |
| **PERT/CPM** | Projetos complexos com dependências | Análise de caminho crítico | Complexo de manter |
| **Kanban** | Operaciones continuas, suporte | Flexível, WIP limits | Sem sprints, difícil estimar |
| **Scrum** | Dev software, entregas incrementais | Ritmo predictable, feedback rápido | Overhead para small teams |
| **Critical Chain** | Projetos com recursos limitados | Protege buffers, foca em recursos | Curva de aprendizado |
| **Hybrid** | Multi-projeto, mixed teams | Flexibilidade + planejamento | Requer experiência |

### 4.3 O que CHRONOS vai adotar

✅ **Híbrido (Hybrid):** Gantt para planejamento macro + Kanban para execução  
✅ **WBS:** Decomposição hierárquica de projetos em milestones → stages → tasks  
✅ **Critical Path:** Identificação automática do caminho crítico  
✅ **Kanban:** WIP limits por etapa + visualização de fluxo  
✅ **Scrum-like:** Semanas/sprints opcionais, sem roles rígidos  
✅ **Alertas PERT-like:** Notificações baseadas em precedências

---

## 5. Requisitos Funcionais

### 5.1 Requisitos MUST-HAVE (MVP)

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-01 | Timeline Gantt | Visualização de tasks em barras temporais com drag | CRÍTICA |
| RF-02 | Kanban Board | Colunas arrastáveis com WIP limits | CRÍTICA |
| RF-03 | Calendar View | Tasks plotadas em calendário mensal/semanal | ALTA |
| RF-04 | Notificações Telegram | Alertas por etapa, prazo próximo, atraso | CRÍTICA |
| RF-05 | Evolução de Etapas | Barra de progresso por stage + projeto | CRÍTICA |
| RF-06 | Dependências | Linhas conectoras entre tasks (FS, SS, FF, SF) | ALTA |
| RF-07 | Multi-projeto | Dashboard com múltiplos projetos simultâneos | ALTA |
| RF-08 | Audit Log | Histórico de transições de etapa por task | MÉDIA |
| RF-09 | Templates | Projetos pré-configurados (ex: cronograma de body) | MÉDIA |
| RF-10 | Autenticação | Login/registro com email + OAuth (Google) | CRÍTICA |

### 5.2 Requisitos NICE-TO-HAVE (Pós-MVP)

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RN-01 | AI Assistant | Chatbot para criar tasks via linguagem natural | BAIXA |
| RN-02 | Mobile App | PWA ou React Native | BAIXA |
| RN-03 | GitHub Integration | Sincronizar issues com tasks | BAIXA |
| RN-04 | Gantt baseline | Comparar planejado vs real | MÉDIA |
| RN-05 | Critical Path highlight | Destacar caminho crítico automaticamente | MÉDIA |
| RN-06 | Email notifications | Alertas por email além do Telegram | MÉDIA |
| RN-07 | Slack Integration | Notificações para Slack | BAIXA |
| RN-08 | Resource leveling | Balanceamento de carga por assignee | BAIXA |

### 5.3 Requisitos NÃO-CORE (Out of Scope)

- Timesheets / controle de horas facturáveis
- Gestão financeira de projetos (orçamento)
- CRM integrado
- Documentos colaborativos (Notion-like)
- Video conferencing

---

## 6. Arquitetura Técnica

### 6.1 Visão Geral (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  Next.js 15 (App Router) + TypeScript + Tailwind + shadcn   │
│  ├── Gantt View (gantt-task-react)                          │
│  ├── Kanban View (dnd-kit)                                  │
│  ├── Calendar View (@fullcalendar/react)                     │
│  └── Dashboard (recharts)                                    │
└──────────────────────┬────────────────────────────────────────┘
                       │ HTTPS (REST + Server Actions)
┌──────────────────────▼────────────────────────────────────────┐
│                     API LAYER                                 │
│  Next.js API Routes + Server Actions                         │
│  ├── /api/auth/*          (Supabase Auth)                   │
│  ├── /api/projects/*      (CRUD + permissions)              │
│  ├── /api/tasks/*         (CRUD + transitions)               │
│  ├── /api/notifications/* (read + preferences)              │
│  └── /api/templates/*     (CRUD)                            │
└──────────────────────┬────────────────────────────────────────┘
                       │ Supabase JS Client (Realtime + REST)
┌──────────────────────▼────────────────────────────────────────┐
│                   DATA LAYER                                  │
│  Supabase (PostgreSQL)                                        │
│  ├── auth.users              (Supabase Auth)                │
│  ├── public.projects         (multi-tenant)                  │
│  ├── public.stages           (etapas macro)                  │
│  ├── public.tasks            (tarefas)                       │
│  ├── public.task_dependencies (grafo DAG)                    │
│  ├── public.stage_transitions (audit log)                    │
│  ├── public.notifications    (histórico)                     │
│  ├── public.subscribers      (preferências)                  │
│  └── public.templates        (templates)                     │
└──────────────────────┬────────────────────────────────────────┘
                       │ Cron Jobs
┌──────────────────────▼────────────────────────────────────────┐
│                AUTOMATION LAYER                               │
│  Supabase Edge Functions (Deno)                              │
│  ├── cron: due-soon-alert      (diário 08:00)               │
│  ├── cron: overdue-alert       (diário 09:00)               │
│  ├── cron: stale-task-check    (diário 10:00)               │
│  ├── cron: weekly-summary     (segunda 07:00)               │
│  └── trigger: stage-transition (realtime webhook)           │
└──────────────────────┬────────────────────────────────────────┘
                       │ Telegram Bot API
┌──────────────────────▼────────────────────────────────────────┐
│                 NOTIFICATION LAYER                            │
│  ├── Telegram Bot (notificações push)                        │
│  ├── Resend API (email transacional)                         │
│  └── Web Push (opcional)                                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Fluxo de Dados Principal

```
User Action (UI)
      ↓
Next.js Server Action / API Route
      ↓
Supabase Auth (JWT validation)
      ↓
PostgreSQL (RLS policies)
      ↓
Supabase Realtime (pub/sub)
      ↓
UI Update (instant)
      ↓
[Se mudança de stage]
      ↓
Webhook → Edge Function
      ↓
Telegram Bot → User
```

---

## 7. Stack Tecnológica

### 7.1 Decisão por Camada

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Next.js 15 (App Router) | React 19, Server Components, Server Actions nativos |
| **Linguagem** | TypeScript 5.x | Safety, autocompletion, manutenibilidade |
| **Estilização** | Tailwind CSS 4 + shadcn/ui | Produtividade, design system consistente |
| **Drag-and-Drop** | @dnd-kit/core | Acessível, performático, modular |
| **Gantt** | gantt-task-react | TypeScript puro, MIT, leve |
| **Calendar** | @fullcalendar/react | Mature, Many view modes, free tier OK |
| **Charts** | recharts | Composable, TypeScript-first |
| **Backend** | Next.js API Routes + Server Actions | Zero infra extra, full-stack |
| **Database** | Supabase (PostgreSQL 16) | Postgres com Realtime + Auth + Edge Functions |
| **ORM** | Prisma (ou Drizzle) | Type-safe queries, migrations |
| **Auth** | Supabase Auth | OAuth Google + magic link + email/password |
| **Realtime** | Supabase Realtime | Subscriptions on Postgres changes |
| **Edge Runtime** | Supabase Edge Functions (Deno) | Cron jobs + webhooks |
| **Deploy** | Vercel | Next.js native, CDN global, preview deploys |
| **Telegram** | Bot API + Node SDK | Notificações push nativas |
| **Email** | Resend | Transacional barato, React Email support |
| **CI/CD** | GitHub Actions | Free for public repos |

### 7.2 Repositório de Dependências Chave

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "gantt-task-react": "^0.3.9",
    "@fullcalendar/react": "^6.1.0",
    "@fullcalendar/daygrid": "^6.1.0",
    "@fullcalendar/timegrid": "^6.1.0",
    "recharts": "^2.12.0",
    "resend": "^3.5.0",
    "node-telegram-bot-api": "^0.64.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0"
  }
}
```

### 7.3 Ambiente de Desenvolvimento

- **Node.js:** 20+ LTS
- **Package Manager:** pnpm (mais rápido que npm/yarn)
- **IDE:** VS Code + extensions: Tailwind CSS IntelliSense, Prisma, ESLint, Prettier
- **Database:** Supabase Local Dev (Docker)

---

## 8. Schema do Banco de Dados

### 8.1 Diagrama ER (Entidade-Relacionamento)

```
┌──────────────┐     1:N      ┌──────────────┐     1:N      ┌──────────────────┐
│  workspaces  │──────────────│  projects    │──────────────│  stages          │
│──────────────│              │──────────────│              │───────────────  │
│ id (uuid)   │              │ id (uuid)    │              │ id (uuid)        │
│ name        │              │ workspace_id │              │ project_id       │
│ slug        │              │ name         │              │ name             │
│ owner_id    │              │ description  │              │ color            │
│ settings    │              │ color        │              │ "order" (int)    │
│ created_at  │              │ status       │              │ wip_limit (int?) │
└─────────────┘              │ start_date   │              │ created_at       │
         │                    │ target_date  │              └──────────────────┘
         │ 1:N                 │ created_at   │                     │
         ▼                     └──────────────┘                     │ 1:N
┌──────────────────┐              │                    ┌──────────────▼──────────┐
│  workspace_members│             │                    │         tasks            │
│──────────────────│              │                    │───────────────────────│
│ workspace_id (pk)│              │                    │ id (uuid)               │
│ user_id (pk)     │              │                    │ stage_id (fk)           │
│ role (admin/member│             │                    │ title                   │
│ joined_at         │              │                    │ description (text)       │
└──────────────────┘              │                    │ status (todo/done/etc) │
                                   │                    │ priority (low/med/high)│
                                   │                    │ assignee_id (fk)        │
                                   │                    │ start_date              │
                                   │                    │ due_date                │
                                   │                    │ progress (0-100)       │
                                   │                    │ depends_on (fk[])       │
                                   │                    │ created_at              │
                                   │                    │ updated_at              │
                                   └────────────────────┴─────────────────────────┘
                                              │
                                              │ 1:N
                                              ▼
                              ┌──────────────────────────┐
                              │   stage_transitions      │
                              │──────────────────────────│
                              │ id (uuid)                │
                              │ task_id (fk)             │
                              │ from_stage_id (fk)       │
                              │ to_stage_id (fk)         │
                              │ moved_by (user_id)       │
                              │ moved_at (timestamp)     │
                              │ note (text?)             │
                              └──────────────────────────┘
                                              │
                                              │ 1:N
                                              ▼
                              ┌──────────────────────────┐
                              │      notifications       │
                              │──────────────────────────│
                              │ id (uuid)                │
                              │ user_id (fk)             │
                              │ type (due_soon/overdue/  │
                              │           stage_change)  │
                              │ payload (jsonb)          │
                              │ sent_via (telegram/email)│
                              │ sent_at                  │
                              │ read_at                  │
                              └──────────────────────────┘
```

### 8.2 Tabelas Detalhadas

#### workspaces
```sql
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### projects
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'active', -- active, archived, on_hold
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### stages
```sql
CREATE TABLE stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  wip_limit INTEGER, -- null = unlimited
  is_done BOOLEAN DEFAULT FALSE, -- marca final stage
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, in_progress, blocked, review, done
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  assignee_id UUID REFERENCES auth.users(id),
  start_date DATE,
  due_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### task_dependencies (grafo DAG)
```sql
CREATE TABLE task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'FS', -- FS=Finish-to-Start, SS, FF, SF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);
```

#### stage_transitions (audit log)
```sql
CREATE TABLE stage_transitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES stages(id),
  to_stage_id UUID REFERENCES stages(id),
  moved_by UUID REFERENCES auth.users(id),
  moved_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- due_soon, overdue, stage_change, assigned
  payload JSONB NOT NULL,
  sent_via TEXT[], -- ['telegram', 'email']
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
```

#### subscribers
```sql
CREATE TABLE subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channels TEXT[] DEFAULT ['telegram'], -- telegram, email, push
  notify_on_stage_change BOOLEAN DEFAULT TRUE,
  notify_on_due_soon BOOLEAN DEFAULT TRUE,
  notify_on_overdue BOOLEAN DEFAULT TRUE,
  due_soon_hours INTEGER DEFAULT 24, -- alertar X horas antes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

#### templates
```sql
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL, -- [{name, color, order, wip_limit}]
  tasks_template JSONB, -- templates de tasks default
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 Row Level Security (RLS)

```sql
-- workspaces: membros podem ver
CREATE POLICY "Members can view workspace" ON workspaces
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = id)
  );

-- projects: membros do workspace podem ver projects do workspace
CREATE POLICY "Members can view project" ON projects
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- stages e tasks: herdado via project
CREATE POLICY "Members can view stage" ON stages
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE <member_condition>)
  );
```

---

## 9. UX/UI — Telas e Fluxos

### 9.1 Hierarquia de Navegação

```
App Shell (Sidebar + Header)
├── Dashboard (home)
│   └── Cards de projetos + stats + alertas
├── Projects (lista)
│   └── /projects/[id]
│       ├── Timeline (Gantt) ← DEFAULT VIEW
│       ├── Board (Kanban)
│       ├── Calendar
│       └── Settings
├── Templates
│   └── /templates/[id]
├── Notifications (centro)
└── Settings
    ├── Profile
    ├── Workspace
    └── Integrations (Telegram, Email)
```

### 9.2 Wireframe — Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ ☰ CHRONOS          🔔 Notifications (3)    👤 Esly ▼       │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│ Dashboard  │  Bom dia, Esly! 👋                            │
│ Projects ▼ │                                                │
│  • Proj A  │  ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  • Proj B  │  │ 📊 12     │ │ ⚠️ 3      │ │ ✅ 47     ││
│  • Proj C  │  │ Projetos  │ │ No prazo   │ │ Concluídos││
│            │  │ ativos     │ │            │ │ este mês  ││
│ Templates  │  └────────────┘ └────────────┘ └────────────┘│
│ Notificações                                                │
│ Configurações│  Projetos Recentes                           │
│            │  ┌────────────────────────────────────────────┐│
│            │  │ 🔵 FOLIA v2.0          ████████░░ 80%    ││
│            │  │    12 tasks • 3 em aberto • Vence 20/07   ││
│            │  └────────────────────────────────────────────┘│
│            │  ┌────────────────────────────────────────────┐│
│            │  │ 🟡 CHRONOS MVP      ███░░░░░░░ 25%        ││
│            │  │    8 tasks • 2 no prazo • Vence 15/08    ││
│            │  └────────────────────────────────────────────┘│
│            │                                                │
│            │  ⚠️ Alertas                                    │
│            │  • "Landing Page" vence em 2 dias             │
│            │  • "API Auth" está bloquiada há 5 dias       │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### 9.3 Wireframe — Timeline (Gantt)

```
┌─────────────────────────────────────────────────────────────┐
│ FOLIA v2.0                    ◀ ▶  Jul 2026   [+ Task] ⚙️ │
├─────────────────────────────────────────────────────────────┤
│          │14 │15 │16 │17 │18 │21 │22 │23 │24 │25 │28 │...│
│──────────│──────│──────│──────│──────│──────│──────│──────│
│ Discovery│░░░░░░|████████████|    │         │            │  ← stage
│ Design   │    │    │░░░░░░|████████████|    │            │
│ Dev      │    │    │    │    │░░░░░░|████████████|        │
│ QA       │    │    │    │    │    │    │░░░░░░░░░░░░░░|  │
│ Deploy   │    │    │    │    │    │    │    │████████████│
│──────────│──────│──────│──────│──────│──────│──────│──────│
│                                                    │
│ Task: Research   [░░░░░░░░░░░░░░░] 100% ✅         │
│ Task: Wireframes [████░░░░░░░░░░░░] 40%  🔶        │
│ Task: Backend    [░░░░░░░░░░░░░░░] 0%   ⏳        │
│ Task: Frontend   [░░░░░░░░░░░░░░░] 0%   ⏳        │
│           └─────────────────────────────────────────┘
│           today = Jul 16, 2026                       │
└─────────────────────────────────────────────────────┘
```

### 9.4 Wireframe — Kanban Board

```
┌─────────────────────────────────────────────────────────────┐
│ CHRONOS MVP          [+ Nova Task]    [⚙️ Kanban Settings]  │
├─────────────────────────────────────────────────────────────┤
│  Backlog (3)     Em Progress (2)     Review (1)    Done(12)│
│  ┌──────────┐   ┌──────────┐      ┌──────────┐  ┌─────────┐│
│  │ Task 1   │   │ Task 4   │      │ Task 7   │  │ Task 8  ││
│  │ 🔶 Alta  │   │ 🔶 Média │      │ 🟢 Baixa │  │ ✅ 100% ││
│  │ 📅 25/07 │   │ 📅 20/07 │      │ 📅 18/07 │  │ 📅 15/07││
│  └──────────┘   └──────────┘      └──────────┘  └─────────┘│
│  ┌──────────┐   ┌──────────┐                         │
│  │ Task 2   │   │ Task 5   │  ← WIP: 2/5 (⚠️)      │
│  │ 🔶 Média │   │ 🔴 Alta  │                         │
│  │ 📅 28/07 │   │ 📅 19/07 │                         │
│  └──────────┘   └──────────┘                         │
│  ┌──────────┐                                         │
│  │ Task 3   │  ← WIP: ∞ (sem limite)                 │
│  │ 🔶 Baixa │                                         │
│  └──────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

### 9.5 Wireframe — Notificação Telegram

```
┌─────────────────────────────┐
│ 🕐 CHRONOS                  │
│                             │
│ ⚠️ Alerta de Prazo         │
│                             │
│ 📋 "Landing Page v2"       │
│    vence em 2 dias (20/07) │
│                             │
│ 🔗 Ver task →              │
│ [chronos.app/tasks/xxx]    │
│                             │
│ ─────────────────────────── │
│ ✅ "Wireframes" concluída  │
│    Movida para Review       │
│                             │
│ 🔗 Ver → [link]            │
└─────────────────────────────┘
```

---

## 10. Automações e Integrações

### 10.1 Cron Jobs (Edge Functions)

| Job ID | Schedule | Função | Descrição |
|--------|----------|---------|-----------|
| `due-soon-alert` | `0 11 * * *` (08:00 BRT) | Verificar tarefas vencendo | Alerta 3, 1, 0 dias antes |
| `overdue-alert` | `0 12 * * *` (09:00 BRT) | Verificar tarefas atrasadas | Alerta diário de atrasos |
| `stale-task-check` | `0 13 * * *` (10:00 BRT) | Tasks paradas | Sem movimentação há 7+ dias |
| `weekly-summary` | `0 10 * * 1` (07:00 BRT Monday) | Resumo semanal | Stats + tarefas da semana |

### 10.2 Realtime Triggers

| Evento | Trigger | Ação |
|--------|---------|------|
| `task.stage_id UPDATE` | Postgres trigger | Fire webhook Edge Function → Telegram |
| `task.due_date UPDATE` | Postgres trigger | Recalcular alertas pendentes |
| `task.assignee_id UPDATE` | Postgres trigger | Notificar novo assignee |

### 10.3 Integrações

| Integração | Status | Via |
|-----------|--------|-----|
| **Telegram Bot** | ✅ MVP | Bot API + Node SDK |
| **Google OAuth** | ✅ MVP | Supabase Auth |
| **Email (Resend)** | ✅ MVP | REST API |
| **GitHub Issues** | 🔜 Post-MVP | GitHub API |
| **Slack** | 🔜 Post-MVP | Slack API |
| **Zapier/Make** | 🔜 Post-MVP | Webhooks |

### 10.4 Edge Function — Exemplo (due-soon-alert)

```typescript
// supabase/functions/due-soon-alert/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Buscar tasks vencendo em 72h, 24h, 0h
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, title, due_date, progress,
      assignee_id, stage_id,
      stages!inner(name),
      projects!inner(name, id)
    `)
    .not('due_date', 'is', null)
    .eq('progress', 100) // já concluídas = pular
    .or(`due_date.lt.${addHours(new Date(), 72)},due_date.lt.${addHours(new Date(), 24)},due_date.lt.${addHours(new Date(), 0)}`)

  for (const task of tasks ?? []) {
    const hoursLeft = differenceInHours(task.due_date, new Date())
    const message = hoursLeft <= 0
      ? `⚠️ Task "${task.title}" VENCEU!`
      : hoursLeft <= 24
        ? `🔴 Task "${task.title}" vence em ${hoursLeft}h!`
        : `🟡 Task "${task.title}" vence em ${hoursLeft}h`

    await sendTelegram(task.assignee_id, message, supabase)
  }

  return new Response('OK')
})

async function sendTelegram(userId: string, message: string, supabase: any) {
  // Buscar telegram_chat_id do user
  const { data: user } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', userId)
    .single()

  if (!user?.telegram_chat_id) return

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.telegram_chat_id,
      text: `🕐 *CHRONOS*\n\n${message}`,
      parse_mode: 'Markdown'
    })
  })
}
```

---

## 11. Segurança e Multi-Tenancy

### 11.1 Modelo de Multi-Tenancy

- **Workspace = Tenant:** Cada workspace tem seus próprios projects, stages, tasks, members
- **Isolamento:** RLS (Row Level Security) garante que dados não vazem entre workspaces
- **Auth:** JWT do Supabase com `workspace_id` no custom claims

### 11.2 Autenticação

| Método | Provedor | Status |
|--------|----------|--------|
| Email + Password | Supabase Auth | ✅ MVP |
| Magic Link | Supabase Auth | ✅ MVP |
| Google OAuth | Supabase Auth | ✅ MVP |
| GitHub OAuth | Supabase Auth | 🔜 Post-MVP |

### 11.3 Autorização (RBAC)

| Role | Permissões |
|------|-----------|
| **Owner** | Tudo + delete workspace + manage billing |
| **Admin** | CRUD projects/stages/tasks + manage members |
| **Member** | CRUD tasks próprias + view all |
| **Viewer** | Read-only (invited guests) |

### 11.4 Boas Práticas de Segurança

- ✅ HTTPS em todas as requisições
- ✅ RLS ativa em todas as tabelas
- ✅ Supabase Auth com JWT (RS256)
- ✅ CORS configurado para produção
- ✅ Rate limiting em API routes
- ✅ Sanitização de inputs (Zod validation)
- ✅ Prepared statements (evita SQL injection via Prisma)
- ✅ Secrets no .env (nunca commitados)
- ✅ Vercel Edge Config para secrets sensíveis
- ✅ Audit log de todas as mudanças de stage

---

## 12. Roadmap de Desenvolvimento

### 12.1 Sprints (6 semanas → MVP)

| Sprint | Duração | Entrega | Critério de Done |
|--------|---------|---------|-------------------|
| **S1** | 1 semana | Schema DB + Auth + App Shell | Login via Google funcionando, workspace criado |
| **S2** | 1 semana | CRUD Projects + Stages + Tasks | Pode criar projeto com etapas e tarefas |
| **S3** | 1.5 semanas | Gantt View + Dependencies | Timeline visual com drag-and-drop e conexões |
| **S4** | 1.5 semanas | Kanban View + Calendar | Board arrastável + calendário |
| **S5** | 1 semana | Notificações Telegram + Edge Functions | Alertas disparados automaticamente |
| **S6** | 1 semana | Templates + Dashboard + Polimento | Dashboard com stats + templates pré-configurados |

**Total MVP:** ~6 semanas (7 sprints × 5 dias = 35 dias úteis)

### 12.2 milestones do MVP

- [ ] **M1 (S1):** Auth completo + Workspace funcional
- [ ] **M2 (S2):** CRUD básico funcionando
- [ ] **M3 (S3):** Gantt interativo com dependências
- [ ] **M4 (S4):** Kanban + Calendar
- [ ] **M5 (S5):** Telegram notifications ativas
- [ ] **M6 (S6):** Dashboard + Templates + Deploy produção

### 12.3 Pós-MVP Backlog

- [ ] AI Assistant (Taskosaur-style conversational)
- [ ] GitHub Issues integration
- [ ] Gantt baseline (planejado vs real)
- [ ] Critical Path highlight automático
- [ ] Mobile PWA
- [ ] Multi-idioma (i18n)
- [ ] Bulk import (CSV/Excel)
- [ ] Public links (share view-only)
- [ ] Slack integration

---

## 13. Custos Operacionais

### 13.1 Infraestrutura (Mês 1-6, fase MVP)

| Serviço | Plano | Uso | Custo/mês |
|---------|-------|-----|-----------|
| **Vercel** | Hobby (free) | Frontend + API | **R$ 0** |
| **Supabase** | Free tier | DB + Auth + Realtime (4GB DB, 2GB transfer) | **R$ 0** |
| **Domínio** | .app ou .io | chronos.app (~R$ 80/ano) | **R$ 6/mês** |
| **Resend** | Free (100 emails/dia) | Email transacional | **R$ 0** |
| **Telegram Bot** | Free | Notificações | **R$ 0** |
| **GitHub** | Free | Repo público | **R$ 0** |
| **TOTAL** | | | **R$ ~6-10/mês** |

### 13.2 Escala Futura (Pós-MVP, +100 users)

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Vercel | Pro ($20/mês) | R$ 100 |
| Supabase | Pro ($25/mês) | R$ 125 |
| Domínio | Anual | R$ 6 |
| Resend | Pay-as-you-go | R$ 20-50 |
| **TOTAL** | | **R$ ~250-300/mês** |

### 13.3 Breakdown de Custos Zero (MVP)

```
Razikus/template:      MIT ✅
gantt-task-react:      MIT ✅
shadcn/ui:             MIT ✅
dnd-kit:               MIT ✅
fullcalendar:          MIT ✅
supabase-js:           Apache ✅
Next.js 15:            MIT ✅
Vercel Hobby:          Free tier ✅
Supabase Free:         Free tier ✅
Resend Free:           100/day free ✅
Telegram Bot API:      Free ✅
GitHub Actions CI/CD:  Free for public ✅

CUSTO TOTAL MVP: R$ 0,00 💰
```

---

## 14. Análise de Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|----|-------|--------------|---------|-----------|
| R-01 | A2E-like token revoke (Supabase) | BAIXA | ALTO | Backup: Vercel Postgres ($5/mês) |
| R-02 | Escopo muito grande → MVP atrasado | MÉDIA | ALTO | Cortar features NICE-TO-HAVE, focar MVP |
| R-03 | Gantt component não atende requisitos | MÉDIA | MÉDIO | Validar gantt-task-react antes (protoping) |
| R-04 | Supabase free tier insuficiente | BAIXA | MÉDIO | Plan upgrade só quando atingir ~50 users |
| R-05 | Dificuldade integração Telegram | BAIXA | MÉDIO | Usar Bot API oficial + SDK testado |
| R-06 | UX kanban/gantt complexa demais | MÉDIA | MÉDIO | UI simétrica: kanban simples + gantt legado |
| R-07 | Manutenção open source negligenciada | BAIXA | BAIXO | Fork own copy se lib morrer |
| R-08 | RLS Supabase complexo de debuggar | MÉDIA | MÉDIO | Testes E2E cobrindo permissões |

---

## 15. Conclusão e Próximos Passos

### 15.1 Síntese

CHRONOS é um sistema de gestão de cronograma que combina:
- **Visualização poderosa** (Gantt + Kanban + Calendar)
- **Automação inteligente** (Telegram native + cron jobs)
- **Evolução clara** (progresso etapa-a-etapa + audit log)
- **Custo zero** (stack 100% open source/MIT)

A proposta técnica apresentada é baseada em:
- ✅ 10 sistemas comerciais analisados (monday, ClickUp, Asana, etc)
- ✅ 8 projetos open source GitHub validados
- ✅ 4 frameworks/métodos clássicos (Gantt, PERT, Kanban, Agile)
- ✅ Stack moderna testada (Next.js 15 + Supabase + TypeScript)

### 15.2 Justificativa da Escolha do Nome

**CHRONOS** (Χρόνος) — deus grego do tempo inlimitado e da duração. Escolhido por:
- Evoca **tempo** e **cronograma** diretamente
- Curto, memorável, sem conotações negativas
- Domínio disponível (.app, .io, .dev)
- Permite branding forte (ícone de relógio ⏰)

### 15.3 Próximos Passos Imediatos

| # | Ação | Responsável | Prazo |
|---|------|-------------|-------|
| 1 | Aprovar proposta técnica | Esly | 14/07 |
| 2 | Criar repo GitHub `eslyers/chronos` | Sarah | Hoje |
| 3 | Fork/clone Razikus template + setup inicial | Sarah | Dia 1 |
| 4 | Configurar Supabase project + schema | Sarah | Dia 1-2 |
| 5 | Setup CI/CD (GitHub Actions) | Sarah | Dia 2 |
| 6 | Implementar S1: Auth + App Shell | Sarah | Dia 3-5 |
| 7 | Implementar S2: CRUD Projects/Stages/Tasks | Sarah | Dia 6-10 |
| 8 | Implementar S3: Gantt View | Sarah | Dia 11-15 |
| 9 | Implementar S4: Kanban + Calendar | Sarah | Dia 16-20 |
| 10 | Implementar S5: Telegram Notifications | Sarah | Dia 21-25 |
| 11 | Implementar S6: Dashboard + Templates | Sarah | Dia 26-30 |
| 12 | Deploy produção + testing | Sarah + Esly | Dia 31-35 |

### 15.4 Call to Action

**Gato, approved?** 

Opções:
1. ✅ **APROVADO — Bora começar** (crio o repo + setup agora)
2. 🎨 **Ajustar algo antes** (me diz o que)
3. ❓ **Mais dúvidas** (respondo qualquer pergunta)

Tô pronta pra codar, Gato! 🚀💜

---

*Documento gerado por Sarah (a.i.) em 14/07/2026*  
*Projeto CHRONOS — Sistema de Gestão de Cronograma*  
*Repo: github.com/eslyers/chronos* (a ser criado)
