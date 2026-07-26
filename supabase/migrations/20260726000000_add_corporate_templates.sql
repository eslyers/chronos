-- ============================================================================
-- CHRONOS — Migration: 6 novos templates corporativos (total: 10)
-- Data: 2026-07-26
-- Categoria   | Template
-- ------------|---------------------------------------------------
-- RH          | Processo Seletivo & Onboarding
-- Governança  | Gestão de Riscos & Compliance
-- Comercial   | Pipeline de Vendas (CRM)
-- TI          | Desenvolvimento de Software (SDLC completo)
-- Estratégia  | Planejamento Estratégico Anual (OKRs)
-- Eventos     | Gestão de Eventos Corporativos
-- ============================================================================

INSERT INTO public.templates (name, description, category, icon, is_public, stages, tasks_template)
VALUES

  -- 1. Processo Seletivo & Onboarding (RH)
  (
    'Processo Seletivo & Onboarding',
    'Da abertura de vaga ate a integracao completa do novo colaborador: triagem, entrevistas, proposta e onboarding estruturado.',
    'RH',
    '🧑‍💼',
    TRUE,
    '[
      {"name": "Abertura de Vaga", "color": "#6366f1", "sort_order": 0},
      {"name": "Triagem de CVs", "color": "#8b5cf6", "sort_order": 1},
      {"name": "Entrevistas", "color": "#f59e0b", "sort_order": 2},
      {"name": "Proposta & Aprovacao", "color": "#3b82f6", "sort_order": 3},
      {"name": "Admissao", "color": "#06b6d4", "sort_order": 4},
      {"name": "Onboarding", "color": "#10b981", "sort_order": 5},
      {"name": "Concluido", "color": "#22c55e", "sort_order": 6, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  ),

  -- 2. Gestão de Riscos & Compliance (Governança)
  (
    'Gestao de Riscos & Compliance',
    'Identificacao, avaliacao, mitigacao e monitoramento de riscos corporativos e conformidade regulatoria (ISO, LGPD, SOX).',
    'Governanca',
    '🛡️',
    TRUE,
    '[
      {"name": "Identificacao", "color": "#ef4444", "sort_order": 0},
      {"name": "Avaliacao de Impacto", "color": "#f97316", "sort_order": 1},
      {"name": "Plano de Mitigacao", "color": "#f59e0b", "sort_order": 2},
      {"name": "Implementacao", "color": "#3b82f6", "sort_order": 3},
      {"name": "Monitoramento", "color": "#8b5cf6", "sort_order": 4},
      {"name": "Auditoria & Fechamento", "color": "#10b981", "sort_order": 5, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  ),

  -- 3. Pipeline de Vendas CRM (Comercial)
  (
    'Pipeline de Vendas (CRM)',
    'Gestao completa do funil comercial: da prospeccao ao fechamento e pos-venda. Ideal para equipes de vendas B2B e B2C.',
    'Comercial',
    '💰',
    TRUE,
    '[
      {"name": "Prospeccao", "color": "#94a3b8", "sort_order": 0},
      {"name": "Qualificacao", "color": "#6366f1", "sort_order": 1},
      {"name": "Proposta", "color": "#f59e0b", "sort_order": 2},
      {"name": "Negociacao", "color": "#f97316", "sort_order": 3},
      {"name": "Fechamento", "color": "#10b981", "sort_order": 4},
      {"name": "Pos-Venda", "color": "#06b6d4", "sort_order": 5},
      {"name": "Perdido", "color": "#ef4444", "sort_order": 6}
    ]'::jsonb,
    '[]'::jsonb
  ),

  -- 4. SDLC — Desenvolvimento de Software Completo (TI)
  (
    'SDLC - Desenvolvimento de Software',
    'Ciclo completo de desenvolvimento: levantamento de requisitos, arquitetura, desenvolvimento, testes, homologacao e deploy em producao.',
    'TI',
    '💻',
    TRUE,
    '[
      {"name": "Requisitos", "color": "#6366f1", "sort_order": 0},
      {"name": "Arquitetura & Design", "color": "#8b5cf6", "sort_order": 1},
      {"name": "Desenvolvimento", "color": "#3b82f6", "sort_order": 2},
      {"name": "Testes & QA", "color": "#f59e0b", "sort_order": 3},
      {"name": "Homologacao", "color": "#f97316", "sort_order": 4},
      {"name": "Deploy / Go-Live", "color": "#ef4444", "sort_order": 5},
      {"name": "Monitoramento Pos-Deploy", "color": "#10b981", "sort_order": 6, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  ),

  -- 5. Planejamento Estratégico Anual / OKRs (Estratégia)
  (
    'Planejamento Estrategico Anual (OKRs)',
    'Estrutura para ciclo de planejamento estrategico: diagnostico, definicao de OKRs, desdobramento tatico, execucao, acompanhamento e revisao.',
    'Estrategia',
    '🎯',
    TRUE,
    '[
      {"name": "Diagnostico & SWOT", "color": "#6366f1", "sort_order": 0},
      {"name": "Definicao de OKRs", "color": "#8b5cf6", "sort_order": 1},
      {"name": "Planos de Acao", "color": "#3b82f6", "sort_order": 2},
      {"name": "Q1 - Execucao", "color": "#f59e0b", "sort_order": 3},
      {"name": "Q2 - Revisao Mid-Year", "color": "#f97316", "sort_order": 4},
      {"name": "Q3 - Ajuste de Rota", "color": "#06b6d4", "sort_order": 5},
      {"name": "Q4 - Encerramento & Next Cycle", "color": "#10b981", "sort_order": 6, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  ),

  -- 6. Gestão de Eventos Corporativos (Eventos)
  (
    'Gestao de Eventos Corporativos',
    'Planejamento e execucao de eventos: briefing, fornecedores, logistica, comunicacao, execucao no dia D e pos-evento.',
    'Eventos',
    '🎪',
    TRUE,
    '[
      {"name": "Briefing & Aprovacao", "color": "#8b5cf6", "sort_order": 0},
      {"name": "Fornecedores & Orcamentos", "color": "#f59e0b", "sort_order": 1},
      {"name": "Comunicacao & Inscricoes", "color": "#3b82f6", "sort_order": 2},
      {"name": "Logistica & Infraestrutura", "color": "#f97316", "sort_order": 3},
      {"name": "Dia D - Execucao", "color": "#ef4444", "sort_order": 4},
      {"name": "Pos-Evento & Relatorio", "color": "#10b981", "sort_order": 5, "is_done": true}
    ]'::jsonb,
    '[]'::jsonb
  )

ON CONFLICT DO NOTHING;
