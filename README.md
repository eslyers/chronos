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
- **UI:** Tailwind CSS + Radix UI (shadcn/ui) + lucide-react
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions em Deno)
- **Drag-and-drop:** @dnd-kit (Kanban, Fast Close) + gantt-task-react (Gantt)
- **Gráficos:** recharts (carregado sob demanda)
- **Planilhas:** SheetJS (xlsx) para importação e exportação
- **E-mail / alertas:** Brevo + Telegram
- **Deploy:** Vercel

## 📁 Estrutura

```
src/
├── app/
│   ├── page.tsx                 # Landing page pública
│   ├── auth/                    # Login, cadastro, convite, reset, callback OAuth
│   ├── app/                     # Área logada: dashboard, projetos, kanban, timeline,
│   │                            # calendário, fast-close, workload, atividade, usuários…
│   └── api/                     # Rotas server-side (convites, importação, cron, admin)
├── components/                  # Telas e diálogos (ui/ = primitivas Radix/shadcn)
├── lib/
│   ├── context/                 # GlobalContext (usuário/papel) e DataContext (dados)
│   ├── data/                    # Camada Supabase, modelos, cache local, seed demo
│   ├── supabase/                # Clients browser/server/admin + middleware
│   ├── date-only.ts             # Datas sem hora (colunas DATE) — use sempre estes helpers
│   ├── task-status.ts           # Concluída / atrasada / vence hoje
│   └── priority.ts              # Rótulos e cores de prioridade (DESIGN.md)
└── middleware.ts                # Protege /app/*

supabase/
├── migrations/                  # Schema, RLS e funções (aplicar em ordem)
├── functions/                   # Edge Functions (alertas de prazo e notificações)
└── tests/rls.test.mjs           # Testes de RLS em Postgres em memória (PGlite)
```

## 🛠️ Setup local

Pré-requisitos: Node.js 20+ e, para dados reais, um projeto Supabase.

```bash
git clone https://github.com/eslyers/chronos.git
cd chronos
npm install --legacy-peer-deps
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:3000
```

Sem `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` o app sobe em **modo demo** (dados de exemplo no localStorage).

Para o banco: `npx supabase link --project-ref <ref>` e `npx supabase db push` (aplica `supabase/migrations` em ordem).

## ✅ Qualidade

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (Next) |
| `npm run type-check` | TypeScript sem emitir |
| `npm test` | Jest (lib, camada de dados, DataContext, componentes) |
| `npm run test:rls` | Aplica todas as migrations no PGlite e testa políticas RLS e RPCs |
| `npm run build` | Build de produção |

Convenções:
- Datas de tarefas/projetos são `DATE` (`YYYY-MM-DD`): nunca use `new Date("YYYY-MM-DD")` nem `toISOString()` para "hoje" — use `lib/date-only.ts` e `lib/task-status.ts`.
- Mutações do `DataContext` exibem toast de erro e **relançam** a exceção: feche formulários só após sucesso.
- Toda tabela nova precisa de RLS e de cenários em `supabase/tests/rls.test.mjs`.

## 📦 Deploy

- **App:** Vercel (`vercel.json`), com as variáveis do `.env.example`.
- **Banco e Edge Functions:** veja [SUPABASE-DEPLOY.md](SUPABASE-DEPLOY.md) — inclui a ordem de deploy do hardening de segurança e os segredos exigidos pelas funções.

## 🗺️ Roadmap

- [x] Projetos, etapas e tarefas com WBS (subtarefas) e dependências
- [x] Gantt com arrastar/redimensionar, Kanban com WIP, calendário e Fast Close (fechamento contábil D0)
- [x] Templates, clonagem de projetos (RPC transacional), importação/exportação de planilhas
- [x] Convites, papéis por workspace e isolamento por projeto (RLS)
- [x] Alertas de prazo por e-mail/Telegram (Edge Functions)
- [ ] Atualização em tempo real (Supabase Realtime)
- [ ] Cache de servidor com mutações otimistas (ex.: TanStack Query)
- [ ] Anexos no Supabase Storage (hoje em base64 na tabela)

Detalhes de produto em [PROPOSTA.md](PROPOSTA.md) e na [base de conhecimento](docs/knowledge-base/README.md).

## 🤝 Contribuindo

PRs são bem-vindos! Para mudanças grandes, abra uma issue primeiro.

## 📄 Licença

MIT — Veja [LICENSE](LICENSE)

---

**Built with ❤️ by Esly & Sarah** — Powered by Next.js + Supabase

