# 🕐 CHRONOS

> Sistema de gestão de cronograma e timeline. Gantt + Kanban + Notificações Telegram em um só lugar.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-blue)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)

**CHRONOS** (Χρόνος — deus grego do tempo) é um sistema open source de gestão de cronograma focado em:

- 📅 **Timeline Gantt** com drag-and-drop e dependências
- 🎯 **Kanban Board** com WIP limits e transições auditáveis
- 🔔 **Notificações Telegram** nativas (alertas de prazo)
- 📊 **Evolução etapa-a-etapa** com histórico completo
- 🎨 **Templates** prontos para início rápido
- 💰 **Custo zero** com stack open source

## 🚀 Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + lucide-react
- **Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Cron Jobs:** Supabase Edge Functions (Deno)
- **Drag-and-Drop:** @dnd-kit (Kanban) + gantt-task-react (Gantt)
- **Calendário:** @fullcalendar/react
- **Charts:** recharts
- **Deploy:** Vercel

## 📁 Estrutura

```
src/
├── app/
│   ├── (home)/page.tsx               # Landing page pública
│   ├── auth/                          # Login, register, reset, callback
│   ├── app/                           # Dashboard protegido
│   │   ├── page.tsx                   # Dashboard
│   │   ├── projects/                  # Gestão de projetos (S2)
│   │   ├── timeline/                  # Gantt view (S3)
│   │   ├── kanban/                    # Kanban view (S4)
│   │   ├── templates/                 # Templates prontos
│   │   ├── notifications/             # Centro de notificações
│   │   └── settings/                  # Perfil + Telegram config
│   └── api/
│       └── telegram/test/route.ts     # Test endpoint p/ Telegram
├── components/
│   ├── AppLayout.tsx                  # Shell com sidebar + header
│   └── ui/                            # shadcn/ui components
├── lib/
│   ├── supabase/                      # Supabase client (browser, server, middleware)
│   ├── context/                       # GlobalContext (user state)
│   ├── types.ts                       # Database types (gerado)
│   └── utils.ts                       # Helpers
├── middleware.ts                      # Auth middleware
└── styles/globals.css

supabase/
├── migrations/
│   └── 20260714120000_chronos_schema.sql   # Schema completo (10 tabelas)
├── functions/
│   └── due-soon-alert/                    # Edge Function p/ notificações
└── config.toml
```

## 🗄️ Schema do Banco

10 tabelas com Row Level Security (RLS):

| Tabela | Função |
|--------|--------|
| `workspaces` | Multi-tenancy (cada usuário tem o seu) |
| `workspace_members` | RBAC dentro do workspace |
| `projects` | Cronogramas (cards macro) |
| `stages` | Etapas do projeto (A fazer → Em progresso → Concluído) |
| `tasks` | Tarefas individuais |
| `task_dependencies` | Grafo DAG entre tasks (FS/SS/FF/SF) |
| `stage_transitions` | Audit log de mudanças de etapa |
| `notification_subscribers` | Preferências de notificação |
| `notifications` | Histórico de alertas enviados |
| `templates` | Templates pré-configurados |

## 🛠️ Setup Local

### Pré-requisitos

- Node.js 20+
- pnpm ou npm
- Conta Supabase (free tier)

### 1. Clonar e instalar

```bash
git clone https://github.com/eslyers/chronos.git
cd chronos
pnpm install
```

### 2. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

3. Preencha as variáveis (URL + Anon Key + Service Role Key)

### 3. Aplicar migrations

```bash
# Local (requer supabase CLI)
supabase db push

# OU: copie o conteúdo de supabase/migrations/20260714120000_chronos_schema.sql
#     e cole no SQL Editor do Supabase Dashboard
```

### 4. Rodar dev server

```bash
pnpm dev
# ou
npm run dev
```

Acesse http://localhost:3000

## 📦 Deploy

### Vercel (recomendado)

1. Push para GitHub ✅ (já feito)
2. Importe o projeto no [vercel.com](https://vercel.com)
3. Adicione as env vars
4. Deploy automático em cada push

### Supabase Edge Functions (Sprint 5)

```bash
supabase functions deploy due-soon-alert
# Configurar cron job no Supabase Dashboard
# Recommended: 0 11 * * * (08:00 BRT)
```

## 🗺️ Roadmap

- [x] **S1 (HOJE):** Schema DB + Auth + App Shell ✅
- [ ] **S2:** CRUD Projects + Stages + Tasks
- [ ] **S3:** Gantt view (gantt-task-react)
- [ ] **S4:** Kanban view + Calendar
- [ ] **S5:** Notificações Telegram (Edge Functions)
- [ ] **S6:** Dashboard + Templates + Polimento

Veja [PROPOSTA.md](PROPOSTA.md) para detalhes completos.

## 🤝 Contribuindo

PRs são bem-vindos! Para mudanças grandes, abra uma issue primeiro.

## 📄 Licença

MIT — Veja [LICENSE](LICENSE)

---

**Built with ❤️ by Esly & Sarah** — Powered by Next.js + Supabase
