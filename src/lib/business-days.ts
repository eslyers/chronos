// ─────────────────────────────────────────────────────────────
// CHRONOS — Business Days (Dias Úteis) Utility
// Cálculo de dias úteis corporativos para Fechamento (Fast Close)
// Pula sábados (6) e domingos (0)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna o último dia útil do mês/ano especificado.
 * Se o último dia do mês cair em sábado/domingo, retrocede para a sexta-feira.
 */
export function getClosingD0Date(year: number, month: number): Date {
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
 * Calcula a data de calendário real para um offset de dia útil.
 * - Se useD0 = true: offset 0 = último dia útil do mês (D0).
 * - Se useD0 = false: não existe D0. O último dia útil do mês vira D-1 (offset -1).
 *   offsets negativos (ex: -1) equivalem a 31/07, -2 vira 30/07.
 *   offsets positivos (ex: +1) equivalem a 03/08 (primeiro dia útil do próximo mês).
 */
export function getCalculatedWorkdayDate(
  year: number,
  month: number,
  offset: number,
  useD0: boolean = true
): Date {
  const lastDayOfMonth = getClosingD0Date(year, month);

  if (useD0) {
    return addBusinessDays(lastDayOfMonth, offset);
  } else {
    if (offset < 0) {
      // offset = -1 -> addBusinessDays(lastDayOfMonth, 0) -> 31/07 (D-1)
      // offset = -2 -> addBusinessDays(lastDayOfMonth, -1) -> 30/07 (D-2)
      return addBusinessDays(lastDayOfMonth, offset + 1);
    } else {
      // offset = +1 -> addBusinessDays(lastDayOfMonth, 1) -> 03/08 (D+1)
      return addBusinessDays(lastDayOfMonth, offset);
    }
  }
}

/**
 * Retorna os offsets disponíveis conforme o intervalo e se D0 está ativo.
 */
export function getWorkdayOffsets(
  range: string,
  customOffsets?: number[],
  useD0: boolean = true
): number[] {
  let list: number[];

  if (customOffsets && customOffsets.length > 0) {
    list = Array.from(new Set(customOffsets)).sort((a, b) => a - b);
  } else {
    switch (range) {
      case "D-3_D+3":
        list = [-3, -2, -1, 0, 1, 2, 3];
        break;
      case "D-2_D+4":
        list = [-2, -1, 0, 1, 2, 3, 4];
        break;
      case "D-10_D+10":
        list = [-10, -7, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 7, 10];
        break;
      case "D-5_D+5":
      default:
        list = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
        break;
    }
  }

  // Se não usa D0, remove o offset 0 da lista
  if (!useD0) {
    list = list.filter((o) => o !== 0);
  }

  return list;
}

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Retorna o rótulo do dia útil com a data de calendário real formatada.
 */
export function formatWorkdayColumnHeader(
  offset: number,
  date: Date,
  useD0: boolean = true
): {
  badge: string;
  formattedDate: string;
  weekdayName: string;
} {
  let badge: string;
  if (useD0) {
    badge = offset === 0 ? "D0 / WD0" : offset > 0 ? `D+${offset}` : `D${offset}`;
  } else {
    badge = offset > 0 ? `D+${offset}` : `D${offset}`;
  }

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
 * Retorna o offset de dias úteis entre uma data qualquer e o fechamento do mês.
 */
export function getWorkdayOffsetFromDate(
  targetDate: Date,
  year: number,
  month: number,
  useD0: boolean = true
): number {
  const lastDayOfMonth = getClosingD0Date(year, month);
  const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const lastDayTime = new Date(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate()).getTime();
  
  if (useD0) {
    if (targetTime === lastDayTime) return 0;
    const direction = targetTime > lastDayTime ? 1 : -1;
    const current = new Date(lastDayTime);
    let count = 0;

    while (current.getTime() !== targetTime) {
      current.setDate(current.getDate() + direction);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count += direction;
      }
    }
    return count;
  } else {
    // Sem D0: se for a mesma data do último dia do mês, vira D-1 (-1)
    if (targetTime === lastDayTime) return -1;

    if (targetTime < lastDayTime) {
      // Data anterior ao último dia útil do mês
      const current = new Date(lastDayTime);
      let count = -1; // Começa de D-1
      while (current.getTime() !== targetTime) {
        current.setDate(current.getDate() - 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count--;
        }
      }
      return count;
    } else {
      // Data posterior (próximo mês) -> D+1, D+2...
      const current = new Date(lastDayTime);
      let count = 0;
      while (current.getTime() !== targetTime) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
      }
      return count;
    }
  }
}
