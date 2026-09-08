// ─────────────────────────────────────────────────────────────
// CHRONOS — Business Days (Dias Úteis) Utility
// Cálculo de dias úteis corporativos para Fechamento (Fast Close)
// Pula fins de semana e feriados nacionais/bancários oficiais do Brasil
// ─────────────────────────────────────────────────────────────

/**
 * Retorna a data do Domingo de Páscoa para um determinado ano
 * utilizando o algoritmo astronômico/gregoriano de Meeus/Jones/Butcher.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Cache anual para evitar reprocessamento de feriados móveis
const holidaysCache = new Map<number, Map<string, string>>();

function formatIsoDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Retorna todos os feriados nacionais e bancários do Brasil para um determinado ano.
 * Inclui os feriados fixos por legislação federal e os feriados móveis vinculados à Páscoa.
 */
export function getBrazilianHolidays(year: number): Map<string, string> {
  if (holidaysCache.has(year)) {
    return holidaysCache.get(year)!;
  }

  const holidays = new Map<string, string>();

  // 1. Feriados Nacionais Fixos (Brasil)
  holidays.set(formatIsoDateKey(year, 1, 1), "Confraternização Universal (Ano Novo)");
  holidays.set(formatIsoDateKey(year, 4, 21), "Tiradentes");
  holidays.set(formatIsoDateKey(year, 5, 1), "Dia Mundial do Trabalho");
  holidays.set(formatIsoDateKey(year, 9, 7), "Independência do Brasil");
  holidays.set(formatIsoDateKey(year, 10, 12), "Nossa Senhora Aparecida");
  holidays.set(formatIsoDateKey(year, 11, 2), "Finados");
  holidays.set(formatIsoDateKey(year, 11, 15), "Proclamação da República");
  holidays.set(formatIsoDateKey(year, 11, 20), "Dia Nacional de Zumbi e da Consciência Negra");
  holidays.set(formatIsoDateKey(year, 12, 25), "Natal");

  // 2. Feriados Móveis e Bancários (Baseados na Páscoa)
  const easter = getEasterSunday(year);

  const addDaysToEaster = (offsetDays: number): Date => {
    const d = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate());
    d.setDate(d.getDate() + offsetDays);
    return d;
  };

  const carnivalMonday = addDaysToEaster(-48);
  const carnivalTuesday = addDaysToEaster(-47);
  const goodFriday = addDaysToEaster(-2);
  const corpusChristi = addDaysToEaster(60);

  holidays.set(
    formatIsoDateKey(carnivalMonday.getFullYear(), carnivalMonday.getMonth() + 1, carnivalMonday.getDate()),
    "Carnaval (Segunda-feira)"
  );
  holidays.set(
    formatIsoDateKey(carnivalTuesday.getFullYear(), carnivalTuesday.getMonth() + 1, carnivalTuesday.getDate()),
    "Carnaval (Terça-feira)"
  );
  holidays.set(
    formatIsoDateKey(goodFriday.getFullYear(), goodFriday.getMonth() + 1, goodFriday.getDate()),
    "Sexta-feira Santa (Paixão de Cristo)"
  );
  holidays.set(
    formatIsoDateKey(corpusChristi.getFullYear(), corpusChristi.getMonth() + 1, corpusChristi.getDate()),
    "Corpus Christi"
  );

  holidaysCache.set(year, holidays);
  return holidays;
}

/**
 * Retorna se uma data é feriado nacional ou bancário oficial do Brasil.
 */
export function isNationalHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getBrazilianHolidays(year);
  const key = formatIsoDateKey(year, date.getMonth() + 1, date.getDate());
  return holidays.has(key);
}

/**
 * Retorna o nome do feriado nacional brasileiro caso exista, ou null.
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const holidays = getBrazilianHolidays(year);
  const key = formatIsoDateKey(year, date.getMonth() + 1, date.getDate());
  return holidays.get(key) || null;
}

/**
 * Retorna verdadeiro se a data for um dia útil corporativo
 * (não é sábado, domingo nem feriado nacional/bancário).
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  return !isNationalHoliday(date);
}

/**
 * Retorna o último dia útil do mês/ano especificado (D0).
 * Se o último dia do mês for fim de semana ou feriado, retrocede para o dia útil anterior.
 */
export function getClosingD0Date(year: number, month: number): Date {
  const lastDay = new Date(year, month, 0);
  while (!isBusinessDay(lastDay)) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

/**
 * Adiciona ou subtrai N dias úteis de uma data base (pula sábados, domingos e feriados).
 */
export function addBusinessDays(baseDate: Date, offsetDays: number): Date {
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  let count = Math.abs(offsetDays);
  const direction = offsetDays >= 0 ? 1 : -1;

  while (count > 0) {
    result.setDate(result.getDate() + direction);
    if (isBusinessDay(result)) {
      count--;
    }
  }

  return result;
}

/**
 * Calcula a data de calendário real para um offset de dia útil.
 * - Se useD0 = true: offset 0 = último dia útil do mês (D0).
 * - Se useD0 = false: não existe D0. O último dia útil do mês vira D-1 (offset -1).
 *   offsets negativos (ex: -1) equivalem ao último dia útil, -2 vira o penúltimo.
 *   offsets positivos (ex: +1) equivalem ao primeiro dia útil do mês subsequente.
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
      return addBusinessDays(lastDayOfMonth, offset + 1);
    } else {
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
 * Retorna o rótulo do dia útil com a data de calendário real formatada
 * e metadados sobre feriados se houver.
 */
export function formatWorkdayColumnHeader(
  offset: number,
  date: Date,
  useD0: boolean = true
): {
  badge: string;
  formattedDate: string;
  weekdayName: string;
  holidayName: string | null;
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
    holidayName: getHolidayName(date),
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
      if (isBusinessDay(current)) {
        count += direction;
      }
    }
    return count;
  } else {
    // Sem D0: se for a mesma data do último dia do mês, vira D-1 (-1)
    if (targetTime === lastDayTime) return -1;

    if (targetTime < lastDayTime) {
      const current = new Date(lastDayTime);
      let count = -1;
      while (current.getTime() !== targetTime) {
        current.setDate(current.getDate() - 1);
        if (isBusinessDay(current)) {
          count--;
        }
      }
      return count;
    } else {
      const current = new Date(lastDayTime);
      let count = 0;
      while (current.getTime() !== targetTime) {
        current.setDate(current.getDate() + 1);
        if (isBusinessDay(current)) {
          count++;
        }
      }
      return count;
    }
  }
}
