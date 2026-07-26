-- ============================================================================
-- CHRONOS — Migration: 3 Templates Corporativos de Finanças & Controladoria
-- 1. Fechamento Contábil Mensal (MEC - Month-End Close)
-- 2. Elaboração de Budget Anual (BDG)
-- 3. Reestimativa Orçamentária & Forecast (REFs / Rolling Forecast)
-- Data: 2026-07-26
-- ============================================================================

INSERT INTO public.templates (name, description, category, icon, is_public, stages, tasks_template)
VALUES

  -- 1. Fechamento Contábil Mensal (MEC)
  (
    'Fechamento Contábil Mensal (MEC)',
    'Ciclo completo de fechamento contábil e financeiro mensal (MEC). Inclui corte operacional, conciliações, provisões (accruals), apuração de impostos, intercompany, DRE e variance analysis.',
    'Finanças',
    '📊',
    TRUE,
    '[
      {"name": "Corte Operacional (Cut-off)", "color": "#6366f1", "sort_order": 0},
      {"name": "Conciliações & Tesouraria", "color": "#3b82f6", "sort_order": 1},
      {"name": "Provisões & Accruals", "color": "#8b5cf6", "sort_order": 2},
      {"name": "Apuração de Estoques & Impostos", "color": "#f59e0b", "sort_order": 3},
      {"name": "Consolidação & DRE", "color": "#06b6d4", "sort_order": 4},
      {"name": "Variance Analysis (Actual vs Budget)", "color": "#10b981", "sort_order": 5},
      {"name": "Lock Contábil & Fechamento", "color": "#22c55e", "sort_order": 6, "is_done": true}
    ]'::jsonb,
    '[
      {"title": "Corte no faturamento e emissão de NFs do mês", "stage_index": 0, "priority": "high"},
      {"title": "Conciliação das contas bancárias e aplicações", "stage_index": 1, "priority": "high"},
      {"title": "Lançamento de provisões de folha e encargos", "stage_index": 2, "priority": "high"},
      {"title": "Apuração dos impostos diretos e indiretos", "stage_index": 3, "priority": "critical"},
      {"title": "Fechamento da DRE consolidada e eliminação intercompany", "stage_index": 4, "priority": "critical"},
      {"title": "Reunião de análise de variações (Variance Analysis)", "stage_index": 5, "priority": "medium"},
      {"title": "Bloqueio do período contábil no ERP (Lock)", "stage_index": 6, "priority": "critical"}
    ]'::jsonb
  ),

  -- 2. Elaboração de Budget Anual (BDG)
  (
    'Elaboração de Budget Anual (BDG)',
    'Processo anual de planejamento orçamentário (BDG). Coleta de premissas macroeconômicas, construção orçamentária pelas áreas (OPEX, CAPEX, Headcount), reuniões de challenge e aprovação no Conselho.',
    'Finanças',
    '📑',
    TRUE,
    '[
      {"name": "Premissas & Guideline Top-Down", "color": "#6366f1", "sort_order": 0},
      {"name": "Construção Orçamentária pelas Áreas", "color": "#3b82f6", "sort_order": 1},
      {"name": "Consolidação da Primeira Versão (V0)", "color": "#8b5cf6", "sort_order": 2},
      {"name": "Rodadas de Challenge Sessions", "color": "#f59e0b", "sort_order": 3},
      {"name": "Ajustes Finais & Alinhamento CFO", "color": "#06b6d4", "sort_order": 4},
      {"name": "Aprovação no Conselho (Baseline)", "color": "#22c55e", "sort_order": 5, "is_done": true}
    ]'::jsonb,
    '[
      {"title": "Definição de premissas macroeconômicas (Inflação, Dólar, Selic)", "stage_index": 0, "priority": "high"},
      {"title": "Envio dos guidelines e metas top-down para diretores", "stage_index": 0, "priority": "high"},
      {"title": "Mapeamento de headcount e custos com pessoal pelas áreas", "stage_index": 1, "priority": "critical"},
      {"title": "Elaboração de orçamentos de OPEX por centro de custos", "stage_index": 1, "priority": "high"},
      {"title": "Consolidação DRE inicial e fluxo de caixa V0", "stage_index": 2, "priority": "high"},
      {"title": "Reuniões de challenge entre Controladoria e Gestores", "stage_index": 3, "priority": "critical"},
      {"title": "Apresentação e congelamento do orçamento final (Baseline)", "stage_index": 5, "priority": "critical"}
    ]'::jsonb
  ),

  -- 3. Reestimativa Orçamentária & Forecast (REFs / Rolling Forecast)
  (
    'Reestimativa Orçamentária & Forecast (REFs)',
    'Ciclo contínuo de reestimativa orçamentária (Ref 1, Ref 2, Ref 3 ou Rolling Forecast). Integração do executado (Actuals) com projeção atualizada das áreas e análise de desvios.',
    'Finanças',
    '📈',
    TRUE,
    '[
      {"name": "Extração do Executado (Actuals)", "color": "#6366f1", "sort_order": 0},
      {"name": "Atualização de Premissas", "color": "#3b82f6", "sort_order": 1},
      {"name": "Coleta de Forecast pelas Áreas", "color": "#8b5cf6", "sort_order": 2},
      {"name": "Consolidação DRE Forecast", "color": "#f59e0b", "sort_order": 3},
      {"name": "Análise de Desvios (Budget vs REF)", "color": "#06b6d4", "sort_order": 4},
      {"name": "Apresentação Executiva & Alinhamento", "color": "#22c55e", "sort_order": 5, "is_done": true}
    ]'::jsonb,
    '[
      {"title": "Fechamento e congelamento do executado real do trimestre", "stage_index": 0, "priority": "high"},
      {"title": "Revisão de premissas operacionais e de mercado", "stage_index": 1, "priority": "medium"},
      {"title": "Coleta de projeção atualizada de vendas e despesas com as áreas", "stage_index": 2, "priority": "critical"},
      {"title": "Consolidação do modelo financeiro (Actuals + Forecast)", "stage_index": 3, "priority": "high"},
      {"title": "Análise comparativa de variações em relação ao Budget", "stage_index": 4, "priority": "high"},
      {"title": "Elaboração de deck executivo para Diretoria Financeira", "stage_index": 5, "priority": "high"}
    ]'::jsonb
  );
