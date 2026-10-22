// ─────────────────────────────────────────────────────────────
// CHRONOS — Rotinas padrão do Fast Close (fechamento contábil)
// Usadas pelo "⚡ Gerar Rotinas Padrão" do cockpit de fechamento.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";

export type DefaultRoutine = { offset: number; title: string; priority: Task["priority"] };

/** Régua padrão do mês, com e sem D0 (sem D0 o último dia útil vira D-1). */
export const DEFAULT_ROUTINES: { withD0: DefaultRoutine[]; withoutD0: DefaultRoutine[] } = {
  withD0: [
    { offset: -5, title: "[D-5] Notificação de encerramento de POs", priority: "medium" },
    { offset: -4, title: "[D-4] Corte de faturamento e remessas", priority: "high" },
    { offset: -3, title: "[D-3] Conciliação de Contas a Receber (AR)", priority: "high" },
    { offset: -2, title: "[D-2] Integração da Folha & Benefícios", priority: "critical" },
    { offset: -1, title: "[D-1] Provisões & Conciliação Bancária Prévia", priority: "high" },
    { offset: 0, title: "[D0] Trava oficial de lançamentos no ERP", priority: "critical" },
    { offset: 1, title: "[D+1] Depreciação e Accruals Operacionais", priority: "high" },
    { offset: 2, title: "[D+2] Conciliação Intercompany & FX Gain/Loss", priority: "medium" },
    { offset: 3, title: "[D+3] Apuração de Impostos Diretos/Indiretos", priority: "high" },
    { offset: 4, title: "[D+4] Emissão do Balancete Final (Trial Balance)", priority: "critical" },
    { offset: 5, title: "[D+5] Reporting Executivo ao CFO & Conselho", priority: "critical" },
  ],
  withoutD0: [
    { offset: -5, title: "[D-5] Notificação de encerramento de POs", priority: "medium" },
    { offset: -4, title: "[D-4] Corte de faturamento e remessas", priority: "high" },
    { offset: -3, title: "[D-3] Conciliação de Contas a Receber (AR)", priority: "high" },
    { offset: -2, title: "[D-2] Provisões & Conciliação Bancária Prévia", priority: "high" },
    { offset: -1, title: "[D-1] Trava oficial e encerramento do mês", priority: "critical" },
    { offset: 1, title: "[D+1] Depreciação e Accruals Operacionais", priority: "high" },
    { offset: 2, title: "[D+2] Conciliação Intercompany & FX Gain/Loss", priority: "medium" },
    { offset: 3, title: "[D+3] Apuração de Impostos Diretos/Indiretos", priority: "high" },
    { offset: 4, title: "[D+4] Emissão do Balancete Final (Trial Balance)", priority: "critical" },
    { offset: 5, title: "[D+5] Reporting Executivo ao CFO & Conselho", priority: "critical" },
  ],
};

export function getDefaultRoutines(useD0: boolean): DefaultRoutine[] {
  return useD0 ? DEFAULT_ROUTINES.withD0 : DEFAULT_ROUTINES.withoutD0;
}
