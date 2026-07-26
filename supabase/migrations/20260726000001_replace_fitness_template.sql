-- ============================================================================
-- CHRONOS — Migration: substitui template nao-corporativo (Fitness) por
-- Gestao de Mudancas Organizacionais (Change Management / PMO)
-- ============================================================================

-- Remove o template de Fitness (nao corporativo)
DELETE FROM public.templates
WHERE name = 'Cronograma de Body (12 semanas)'
  AND category = 'Fitness'
  AND is_public = TRUE;

-- Insere o novo template corporativo de Gestao de Mudancas
INSERT INTO public.templates (name, description, category, icon, is_public, stages, tasks_template)
VALUES (
  'Gestao de Mudancas (Change Management)',
  'Framework para gestao de mudancas organizacionais: diagnostico de impacto, plano de comunicacao, capacitacao, implementacao e consolidacao da mudanca.',
  'Mudanca',
  '🔄',
  TRUE,
  '[
    {"name": "Diagnostico de Impacto", "color": "#f97316", "sort_order": 0},
    {"name": "Plano de Comunicacao", "color": "#8b5cf6", "sort_order": 1},
    {"name": "Capacitacao & Treinamento", "color": "#3b82f6", "sort_order": 2},
    {"name": "Piloto & Validacao", "color": "#f59e0b", "sort_order": 3},
    {"name": "Implementacao", "color": "#ef4444", "sort_order": 4},
    {"name": "Monitoramento & Sustentacao", "color": "#06b6d4", "sort_order": 5},
    {"name": "Consolidacao", "color": "#10b981", "sort_order": 6, "is_done": true}
  ]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT DO NOTHING;
