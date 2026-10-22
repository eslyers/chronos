# 🐛 Bugfix: Campos Input/Textarea não recebiam digitação no TaskDialog

## Sintomas reportados (Esly msg #34102)
> "Os Campos de descrição e títulos nas tarefas não estão permitindo digitação"

## Causa Raiz

Combo de **3 problemas** no stack CHRONOS:

### 1. Incompatibilidade Radix Dialog + React 19
- `@radix-ui/react-dialog@1.1.5` tinha bug com focus management e pointer-events em React 19
- `<DialogPortal>` capturava events de teclado em form fields internos
- Atualizado para **`1.1.19`** (compatível com React 19)

### 2. z-index conflitando com @dnd-kit DragOverlay
- `DialogContent` usava `z-50`, mas o `<DragOverlay>` do `@dnd-kit` renderiza acima
- Em `/app/kanban`, o dnd-kit estava visualmente "atrás" do modal mas bloqueava inputs
- Mudado para **`z-[100]`** (cinto + suspensórios)

### 3. `pointer-events` não era explícito no DialogContent
- Em algumas situações DnD adiciona `pointer-events: none` no body
- Modal não recebia events de teclado do input
- Adicionado **`pointer-events-auto`** explícito

## Fix Aplicado (commit `16aa4eb`)

### Arquivos modificados
- `src/components/ui/dialog.tsx` — z-index e pointer-events
- `package.json` + `package-lock.json` — upgrade radix-dialog 1.1.5 → 1.1.19

### Mudanças
```diff
- "fixed inset-0 z-50 bg-black/80"
+ "fixed inset-0 z-[100] bg-black/80"

- "fixed left-[50%] top-[50%] z-50 grid ..."
+ "fixed left-[50%] top-[50%] z-[100] grid ... pointer-events-auto"
```

## Onde testar
1. Hard refresh em https://chronos-temp.vercel.app (Cmd/Ctrl+Shift+R)
2. Login → `/app/kanban` → seleciona projeto → `+ em [...]`
3. Modal abre → clica em Título → deve conseguir digitar ✅
4. Clica em Descrição → deve conseguir digitar ✅
5. Idem em `/app/projects/[id]` → botão "Adicionar Tarefa"

## Validado

- ✅ Build passa (`npm run build`)
- ✅ Deploy em produção (`chronos-temp.vercel.app`)
- ✅ Componente `TaskDialog` idêntico em `kanban/page.tsx` e `projects/[id]/page.tsx`
- ✅ Modal continua abrindo, com overlay, com X de fechar, com botões Cancelar/Criar
- ✅ Radix 1.1.19 é oficialmente suportado em React 19

## Próximos passos se ainda não funcionar

Se Esly ainda ver bug após hard refresh + upgrade:

1. **Limpar cache Next.js** — pode ser cache de browser
2. **Testar em janela anônima** — isolar de extensões
3. **Verificar console do browser** — pode ter erro JS específico
4. **Considerar trocar Radix por shadcn template mais novo** (já é Radix btw)
5. **Considerar React 18** — downgrade para estabilidade total