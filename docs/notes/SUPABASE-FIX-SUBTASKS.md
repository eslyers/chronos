# 🌳 WBS Hierarchy: Sub-tarefas

## O que foi feito

✅ Migration `20260716000002_add_parent_task_id.sql` criada
✅ Backend persiste `parent_task_id` (criar + atualizar)
✅ UI: botão **"🌳 Hierarquia"** na Timeline
✅ Gantt: sub-tasks renderizam com hierarquia (`project: 'task-${parentId}'`)

## ⚠️ Falta: aplicar SQL no Supabase

Pra ativar de verdade, você precisa rodar a migration no Supabase Dashboard:

📍 https://supabase.com/dashboard/project/qzfhjuawxytzcqwtlhof/sql/new

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS no_self_parent;
ALTER TABLE public.tasks
  ADD CONSTRAINT no_self_parent CHECK (parent_task_id IS NULL OR parent_task_id != id);
```

## Como testar

1. **Apply SQL** acima no Supabase Dashboard
2. **Hard refresh** em `/app/timeline` (Ctrl+Shift+R)
3. Seleciona um projeto
4. Clica em **"🌳 Hierarquia"** no header
5. Hover sobre uma task → clica no **+** ao lado dela
6. Digite o nome da sub-tarefa → Enter
7. Volta no Gantt → a sub-tarefa aparece com prefixo **↳** e indentada

## Hierarquia ilimitada

- Pode criar sub-sub-tarefas (netos)
- Cada nível tem indentação visual no Gantt
- Botão **L0/L1/L2** mostra a profundidade
- Click no **Chevron** colapsa/expande a árvore