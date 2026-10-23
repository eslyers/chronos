-- ============================================================================
-- CHRONOS Migration: 20261027000000_dependency_cycles_and_rate_limit.sql
--   1. Bloqueia dependências circulares entre tarefas no banco (antes só o
--      client checava, e só com as dependências que tinha carregado)
--   2. Limite de requisições para as rotas da API (contadores por janela)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. DEPENDÊNCIAS CIRCULARES
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_dependency_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.task_id = NEW.depends_on_task_id THEN
    RAISE EXCEPTION 'Uma tarefa não pode depender de si mesma' USING ERRCODE = '23514';
  END IF;

  -- Serializa inclusões concorrentes: duas inserções simultâneas (A→B e B→A)
  -- passariam cada uma pela checagem sozinha e fechariam um ciclo juntas
  PERFORM pg_advisory_xact_lock(hashtext('chronos:task_dependencies'));

  -- NEW.task_id depende de NEW.depends_on_task_id: há ciclo se, seguindo as
  -- dependências a partir de depends_on_task_id, chegarmos a task_id.
  -- UNION (não UNION ALL) garante término mesmo com ciclos antigos nos dados.
  IF EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT NEW.depends_on_task_id
      UNION
      SELECT d.depends_on_task_id
      FROM public.task_dependencies d
      JOIN chain c ON d.task_id = c.id
      WHERE d.id IS DISTINCT FROM NEW.id
    )
    SELECT 1 FROM chain WHERE id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Esta dependência criaria um ciclo no cronograma' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dependency_cycle ON public.task_dependencies;
CREATE TRIGGER trg_prevent_dependency_cycle
  BEFORE INSERT OR UPDATE OF task_id, depends_on_task_id ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dependency_cycle();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. LIMITE DE REQUISIÇÕES
-- Usado pelas rotas /api (service_role). Sem policies: anon/authenticated não
-- leem nem escrevem a tabela.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;

-- Registra uma chamada e devolve true se ainda está dentro do limite
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_hits INTEGER;
BEGIN
  IF p_window_seconds <= 0 OR p_limit <= 0 THEN
    RAISE EXCEPTION 'Parâmetros de limite inválidos';
  END IF;

  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limits AS rl (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = rl.hits + 1
  RETURNING hits INTO v_hits;

  -- Limpeza oportunista das janelas antigas (~1% das chamadas)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;
