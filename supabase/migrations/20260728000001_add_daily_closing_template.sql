-- ============================================================================
-- CHRONOS — Template: Fechamento Contábil Mensal por Dias Úteis (D-5 a D+5)
-- Execute no Supabase SQL Editor
-- ============================================================================

INSERT INTO public.templates (name, description, category, icon, is_public, stages)
VALUES (
  'Fechamento Contábil Mensal por Dias Úteis (D-5 a D+5)',
  'Modelo corporativo de Fast Close organizado pela régua de dias úteis (Working Days D-5 a D+5). Ideal para Controladoria, Contabilidade e FP&A com marcos diários de cut-off, provisões, conciliações, impostos, intercompany e report executivo ao CFO.',
  'Controladoria',
  '⏱️',
  true,
  '[
    {
      "name": "D-5 a D-3 — Pré-Fechamento & Cut-off Operacional",
      "color": "#6366f1",
      "sort_order": 0,
      "tasks": [
        { "title": "[D-5] Notificação de encerramento de Ordens de Compra (PO Cut-off)", "duration_days": 1 },
        { "title": "[D-4] Corte de faturamento de vendas e remessas", "duration_days": 1 },
        { "title": "[D-3] Conciliação prévia de Contas a Receber (AR) e Inadimplência", "duration_days": 1 },
        { "title": "[D-3] Verificação de notas fiscais pendentes de entrada (AP)", "duration_days": 1 }
      ]
    },
    {
      "name": "D-2 a D-1 — Provisões, Folha & Conciliações Prévias",
      "color": "#3b82f6",
      "sort_order": 1,
      "tasks": [
        { "title": "[D-2] Rodada de integração da Folha de Pagamento & Benefícios", "duration_days": 1 },
        { "title": "[D-2] Provisão de Férias, 13º Salário e Encargos Sociais", "duration_days": 1 },
        { "title": "[D-1] Lançamento de despesas diferidas e amortizações prévias", "duration_days": 1 },
        { "title": "[D-1] Conciliação bancária prévia e validação de saldos de tesouraria", "duration_days": 1 }
      ]
    },
    {
      "name": "D0 / WD0 — Trava do ERP & Corte Contábil Oficial",
      "color": "#ec4899",
      "sort_order": 2,
      "tasks": [
        { "title": "[D0] Trava oficial de lançamentos operacionais no ERP (SAP/Oracle/TOTVS)", "duration_days": 1 },
        { "title": "[D0] Extração dos extratos bancários finais do mês (Bank Cut-off)", "duration_days": 1 },
        { "title": "[D0] Fechamento e consolidação de estoques e inventário físico", "duration_days": 1 }
      ]
    },
    {
      "name": "D+1 a D+3 — Lançamentos de Fechamento, Impostos & Intercompany",
      "color": "#f59e0b",
      "sort_order": 3,
      "tasks": [
        { "title": "[D+1] Cálculo de depreciação e movimentação do Ativo Imobilizado", "duration_days": 1 },
        { "title": "[D+1] Lançamento de Accruals Operacionais (Provisões de frete, serviços)", "duration_days": 1 },
        { "title": "[D+2] Conciliação e eliminação de saldos Intercompany (IC)", "duration_days": 1 },
        { "title": "[D+2] Variação cambial de ativos e passivos em moeda estrangeira (FX Gain/Loss)", "duration_days": 1 },
        { "title": "[D+3] Apuração de Impostos Diretos e Indiretos (PIS/COFINS/ICMS/ISS/IRPJ)", "duration_days": 1 }
      ]
    },
    {
      "name": "D+4 a D+5 — Balancete Final & Reporting Executivo ao CFO",
      "color": "#10b981",
      "sort_order": 4,
      "is_done": true,
      "tasks": [
        { "title": "[D+4] Emissão do Balancete Contábil Final (Trial Balance Lock)", "duration_days": 1 },
        { "title": "[D+4] Análise de variação de DRE (Actual vs Budget / Forecast)", "duration_days": 1 },
        { "title": "[D+5] Divulgação do Report Executivo de Fechamento ao CFO e Conselho", "duration_days": 1 }
      ]
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
