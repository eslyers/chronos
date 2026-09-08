# 📚 Base de Conhecimento CHRONOS (Knowledge Base)

Bem-vindo à base de conhecimento técnica e operacional do **CHRONOS**. Esta documentação foi estruturada para orientar o desenvolvimento, manutenção e execução dos ajustes do sistema nos pilares de **Performance**, **Segurança**, **Funcionalidade** e **Aparência/UX**.

---

## 🗂️ Índice de Documentos

| # | Documento | Descrição e Foco |
| :---: | :--- | :--- |
| **00** | [00-VISAO-GERAL-E-ARQUITETURA.md](00-VISAO-GERAL-E-ARQUITETURA.md) | Visão geral do produto, mapa arquitetural, stack tecnológica, estrutura de diretórios e fluxo de dados dual-mode (Supabase vs LocalStorage). |
| **01** | [01-PERFORMANCE.md](01-PERFORMANCE.md) | Diagnóstico detalhado de gargalos (DataContext monolítico, query waterfalls, subqueries RLS no Postgres) e guia de otimização de renderização. |
| **02** | [02-SEGURANCA.md](02-SEGURANCA.md) | Políticas de isolamento RLS, autenticação no Middleware Next.js, proteção de rotas de API/Cron e prevenção contra injeções. |
| **03** | [03-FUNCIONALIDADES-E-REGRAS.md](03-FUNCIONALIDADES-E-REGRAS.md) | Regras de negócio especializadas: cálculo de dias úteis com $D0$ no Fast Close, grafo de dependências DAG, hierarquia WBS e notificações. |
| **04** | [04-DESIGN-SYSTEM-E-UX.md](04-DESIGN-SYSTEM-E-UX.md) | Sistema de tokens HSL, tema escuro/claro, acessibilidade, componentes shadcn/ui e oportunidades de polimento de interface e usabilidade. |
| **05** | [05-GUIA-DE-AJUSTES-E-ROADMAP.md](05-GUIA-DE-AJUSTES-E-ROADMAP.md) | Matriz de priorização (P0, P1, P2), planos de ação práticos passo a passo e sequência recomendada de implementação. |

---

## 🛠️ Como Utilizar esta Base de Conhecimento

1. **Para implementar novas features:** Consulte o documento `03-FUNCIONALIDADES-E-REGRAS.md` para entender as convenções de modelo e dependências existentes.
2. **Para otimizar o sistema:** Siga as recomendações de `01-PERFORMANCE.md` e a matriz de prioridades de `05-GUIA-DE-AJUSTES-E-ROADMAP.md`.
3. **Para auditorias e deploy em produção:** Valide o checklist em `02-SEGURANCA.md`.
4. **Para criar ou ajustar telas:** Mantenha a fidelidade aos tokens descritos em `04-DESIGN-SYSTEM-E-UX.md`.
