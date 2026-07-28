// ─────────────────────────────────────────────────────────────
// CHRONOS — Business Days (Dias Úteis) Utility
// Cálculo de dias úteis corporativos para Fechamento (Fast Close)
// Pula sábados (6) e domingos (0)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna o último dia útil do mês/ano especificado (Dia D0 / Cut-off).
 * Se o último dia do mês cair em sábado/domingo, retrocede para a sexta-feira.
 */
export function getClosingD0Date(year: number, month: number): Date {
  // month é 1-indexed (1 = Jan, 12 = Dez)
  // Novo Date(year, month, 0) dá o último dia do mês
  const lastDay = new Date(year, month, 0);
  
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

/**
 * Adiciona ou subtrai N dias úteis de uma data base (pula sábados e domingos).
 */
export function addBusinessDays(baseDate: Date, offsetDays: number): Date {
  const result = new Date(baseDate.getTime());
  let count = Math.abs(offsetDays);
  const direction = offsetDays >= 0 ? 1 : -1;

  while (count > 0) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count--;
    }
  }

  return result;
}

/**
 * Converte uma string de intervalo tipo "D-5_D+5" para array de números:
 * [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
 */
export function getWorkdayOffsets(range: string): number[] {
  switch (range) {
    case "D-3_D+3":
      return [-3, -2, -1, 0, 1, 2, 3];
    case "D-2_D+4":
      return [-2, -1, 0, 1, 2, 3, 4];
    case "D-5_D+5":
    default:
      return [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  }
}

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Retorna o rótulo do dia útil com a data de calendário real formatada:
 * Ex: "D-2 (29/07 - Qua)" ou "D0 (31/07 - Sex)"
 */
export function formatWorkdayColumnHeader(offset: number, date: Date): {
  badge: string;
  formattedDate: string;
  weekdayName: string;
} {
  const badge = offset === 0 ? "D0 / WD0" : offset > 0 ? `D+${offset}` : `D${offset}`;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const weekdayName = WEEKDAYS_PT[date.getDay()];
  
  return {
    badge,
    formattedDate: `${dd}/${mm}`,
    weekdayName,
  };
}

/**
 * Retorna o offset de dias úteis entre uma data qualquer e a data D0.
 */
export function getWorkdayOffsetFromDate(targetDate: Date, d0Date: Date): number {
  const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const d0Time = new Date(d0Date.getFullYear(), d0Date.getMonth(), d0Date.getDate()).getTime();
  
  if (targetTime === d0Time) return 0;

  const direction = targetTime > d0Time ? 1 : -1;
  const current = new Date(d0Time);
  let count = 0;

  while (current.getTime() !== targetTime) {
    current.setDate(current.getDate() + direction);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += direction;
    }
  }

  return count;
}
