-- ============================================================================
-- CHRONOS Migration: 20261022000000_clone_project_rpc.sql
-- Clona um projeto (etapas, tarefas em qualquer profundidade de WBS e
-- dependências) numa única transação. Substitui as ~N requisições
-- sequenciais do client, que deixavam clones parciais quando algo falhava.
--
-- SECURITY INVOKER: roda com as permissões de quem chama, então a RLS vale
-- normalmente (só clona o que o usuário enxerga, só cria onde pode criar).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_project(
  p_source_project_id UUID,
  p_name TEXT,
  p_options JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source public.projects%ROWTYPE;
  v_new_project_id UUID;
  v_workspace_id UUID := COALESCE((p_options->>'workspace_id')::uuid, NULL);
  v_clone_tasks BOOLEAN := COALESCE((p_options->>'clone_tasks')::boolean, TRUE);
  v_clone_deps BOOLEAN := COALESCE((p_options->>'clone_dependencies')::boolean, TRUE);
  v_reset_status BOOLEAN := COALESCE((p_options->>'reset_status')::boolean, FALSE);
  v_keep_assignees BOOLEAN := COALESCE((p_options->>'keep_assignees')::boolean, FALSE);
  v_offset INTEGER := COALESCE((p_options->>'date_offset_days')::integer, 0);
  v_first_stage UUID;
  -- Mapas id antigo → id novo (jsonb: sem tabelas temporárias, que exigem
  -- privilégio TEMPORARY no banco)
  v_stage_map JSONB := '{}'::jsonb;
  v_task_map JSONB := '{}'::jsonb;
  r RECORD;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_source FROM public.projects WHERE id = p_source_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto de origem não encontrado ou sem acesso'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.projects (
    workspace_id, name, description, color, status, start_date, target_date,
    track_time, created_by
  ) VALUES (
    COALESCE(v_workspace_id, v_source.workspace_id),
    p_name,
    CASE WHEN p_options ? 'description' THEN p_options->>'description' ELSE v_source.description END,
    COALESCE(NULLIF(p_options->>'color', ''), v_source.color),
    'active',
    CASE WHEN p_options ? 'start_date' THEN (p_options->>'start_date')::date ELSE v_source.start_date END,
    CASE WHEN p_options ? 'target_date' THEN (p_options->>'target_date')::date ELSE v_source.target_date END,
    COALESCE((p_options->>'track_time')::boolean, v_source.track_time),
    auth.uid()
  )
  RETURNING id INTO v_new_project_id;

  FOR r IN
    SELECT * FROM public.stages WHERE project_id = p_source_project_id ORDER BY sort_order, id
  LOOP
    INSERT INTO public.stages (project_id, name, color, sort_order, is_done, wip_limit)
    VALUES (v_new_project_id, r.name, r.color, r.sort_order, r.is_done, r.wip_limit)
    RETURNING id INTO v_new_id;
    v_stage_map := v_stage_map || jsonb_build_object(r.id::text, v_new_id);
    v_first_stage := COALESCE(v_first_stage, v_new_id);
  END LOOP;

  IF v_clone_tasks AND v_first_stage IS NOT NULL THEN
    -- Pais antes dos filhos, em qualquer profundidade
    FOR r IN
      WITH RECURSIVE tree AS (
        SELECT t.*, 0 AS depth
        FROM public.tasks t
        WHERE t.project_id = p_source_project_id
          AND (t.parent_task_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.tasks p
            WHERE p.id = t.parent_task_id AND p.project_id = p_source_project_id
          ))
        UNION ALL
        SELECT c.*, tree.depth + 1
        FROM public.tasks c
        JOIN tree ON c.parent_task_id = tree.id
        WHERE c.project_id = p_source_project_id AND tree.depth < 50
      )
      SELECT * FROM tree ORDER BY depth, position, created_at, id
    LOOP
      INSERT INTO public.tasks (
        project_id, stage_id, parent_task_id, title, description, priority,
        status, progress, start_date, due_date, estimated_hours, actual_hours,
        position, assignee_id, assignee_name, assignee_status, created_by
      ) VALUES (
        v_new_project_id,
        COALESCE((v_stage_map->>r.stage_id::text)::uuid, v_first_stage),
        (v_task_map->>r.parent_task_id::text)::uuid,
        r.title,
        r.description,
        r.priority,
        CASE WHEN v_reset_status THEN 'todo' ELSE r.status END,
        CASE WHEN v_reset_status THEN 0 ELSE r.progress END,
        r.start_date + v_offset,
        r.due_date + v_offset,
        r.estimated_hours,
        CASE WHEN v_reset_status THEN NULL ELSE r.actual_hours END,
        r.position,
        -- chk_assignee_consistency: membro (id) OU convite pendente (nome + status)
        CASE WHEN v_keep_assignees THEN r.assignee_id END,
        CASE WHEN v_keep_assignees AND r.assignee_id IS NULL THEN r.assignee_name END,
        CASE WHEN v_keep_assignees AND r.assignee_id IS NULL THEN r.assignee_status END,
        auth.uid()
      )
      RETURNING id INTO v_new_id;
      v_task_map := v_task_map || jsonb_build_object(r.id::text, v_new_id);
    END LOOP;

    IF v_clone_deps THEN
      INSERT INTO public.task_dependencies (task_id, depends_on_task_id, dependency_type)
      SELECT (v_task_map->>d.task_id::text)::uuid,
             (v_task_map->>d.depends_on_task_id::text)::uuid,
             d.dependency_type
      FROM public.task_dependencies d
      WHERE v_task_map ? d.task_id::text
        AND v_task_map ? d.depends_on_task_id::text;
    END IF;
  END IF;

  RETURN v_new_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_project(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_project(UUID, TEXT, JSONB) TO authenticated, service_role;
