# 🔧 FIX URGENTE: Dependencies (RF-06)

## Status
✅ Build passou, deploy em produção feito (`chronos-temp.vercel.app`)
✅ Commit `4f81855` pushed to main
⏳ Falta: você aplicar migration SQL no Supabase

## O que tá pronto na UI
- Botão **"🔗 Dependências"** na Timeline (só aparece com projeto selecionado)
- Modal com:
  - **Form** pra criar (seleciona tarefa origem → tarefa destino + tipo FS/SS/FF/SF)
  - **Lista** de dependências ativas com botão remover
  - **Validação client-side**: bloqueia auto-dependência e ciclos
- **Setas visuais** no Gantt (linhas conectando as tasks)
- **Detecção de ciclo** com BFS/DFS antes de salvar

## Por que precisa de migration
Mesmo bug de sempre: a policy `Members can manage dependencies` é `FOR ALL USING (...)` **sem `WITH CHECK`**, então INSERT/DELETE falha silenciosamente por RLS. A migration adiciona policies explícitas.

## SQL pra colar (30 segundos):

Abre: https://supabase.com/dashboard/project/qzfhjuawxytzcqwtlhof/sql/new

```sql
-- Fix RLS em task_dependencies (mesmo padrão da migration Settings)
DROP POLICY IF EXISTS "Members can manage dependencies" ON public.task_dependencies;

DROP POLICY IF EXISTS "Members can view dependencies" ON public.task_dependencies;
CREATE POLICY "Members can view dependencies" ON public.task_dependencies
  FOR SELECT USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Members can insert dependencies" ON public.task_dependencies
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Members can delete dependencies" ON public.task_dependencies
  FOR DELETE USING (
    task_id IN (SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ))
  );
```

Clica **Run** → **hard refresh** em `/app/timeline` → testa adicionar uma dependência! 🎯