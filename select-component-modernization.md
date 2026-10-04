# Plano de Modernização Completa de Componentes Select (Dropdown)

**Slug**: select-component-modernization  
**Responsável**: Frontend Specialist  
**Data**: 2026-10-04  

---

## 1. Visão Geral & Objetivo
Substituir 100% dos elementos nativos HTML `<select>` no Chronos por seletores modernos baseados em **Radix UI Select (`@radix-ui/react-select`)**.  
Garantir alinhamento ao design system do Chronos (`DESIGN.md`):
- Efeito glassmorphism dark (`bg-card/95 backdrop-blur-md border-border/80 shadow-2xl`).
- Cantos arredondados (`rounded-xl` no popover, `rounded-lg` nos itens).
- Realce suave ao passar o mouse (`focus:bg-accent/80 transition-colors`).
- Ícones contextuais (Escudo para Admin, Usuário para Membro, Olho para Visualizador; indicadores de status e flags de prioridade).
- Ícone de `Check` azul no item ativo.
- Acessibilidade completa (teclado, ARIA, foco).

---

## 2. Inventário de Arquivos e Locais Identificados
1. `src/components/ui/select.tsx` -> Arquitetura base com Radix UI Select primitives.
2. `src/app/app/users/_components/MembersTable.tsx` -> Seletor de Papel (Administrador / Membro / Visualizador) com ícones.
3. `src/components/ProjectMembersDialog.tsx` -> Papel ao convidar membro de projeto e papel na listagem de membros.
4. `src/components/TaskDialog.tsx` -> Status, Prioridade e Atribuição (Assignee).
5. `src/components/ProjectDialog.tsx` -> Status e Categoria do Projeto.
6. `src/app/app/fast-close/page.tsx` -> Filtros de Mês, Ano, Grupo e Status.
7. `src/app/app/workload/page.tsx` -> Filtro de Projetos.
8. `src/app/app/timeline/page.tsx` -> Filtro de Projetos.
9. `src/app/app/activity/page.tsx` -> Filtro de Atividades.
10. `src/components/CopyClosingDialog.tsx` -> Mês e Ano de destino.
11. `src/components/DependencyManager.tsx` -> Tarefa predecessora, sucessora e tipo de dependência.
12. `src/components/ImportDialog.tsx` -> Mapeamento de colunas de importação.
13. `src/app/app/settings/page.tsx` -> Idioma / Fuso horário.

---

## 3. Fases de Execução
- **Fase 1**: Criar/Atualizar `src/components/ui/select.tsx` com primitives completas do `@radix-ui/react-select` e z-index apropriado (`z-[110]`) para funcionar dentro e fora de modais.
- **Fase 2**: Atualizar `MembersTable.tsx` (tabela de usuários) com o novo Radix Select e ícones (Shield, User, Eye).
- **Fase 3**: Atualizar `ProjectMembersDialog.tsx`, `TaskDialog.tsx` e `ProjectDialog.tsx`.
- **Fase 4**: Atualizar telas de filtros: `Fast Close`, `Workload`, `Timeline` e `Activity`.
- **Fase 5**: Atualizar diálogos auxiliares: `CopyClosingDialog`, `DependencyManager`, `ImportDialog` e `Settings`.
- **Fase 6**: Testes unitários (`npm test`), checagem de tipos (`npm run type-check`), linter (`npm run lint`), build de produção (`npm run build`) e commit.
