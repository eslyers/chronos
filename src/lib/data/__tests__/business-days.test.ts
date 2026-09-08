import {
  getClosingD0Date,
  addBusinessDays,
  getCalculatedWorkdayDate,
  getWorkdayOffsets,
  formatWorkdayColumnHeader,
  getWorkdayOffsetFromDate,
  isBusinessDay,
  isNationalHoliday,
  getHolidayName,
  getEasterSunday,
} from "../../business-days";

describe("business-days utility", () => {
  describe("getEasterSunday and moving holidays", () => {
    it("should calculate Easter Sunday accurately for 2026", () => {
      // Páscoa em 2026: 05 de Abril
      const easter2026 = getEasterSunday(2026);
      expect(easter2026.getFullYear()).toBe(2026);
      expect(easter2026.getMonth()).toBe(3); // Abril (0-indexed)
      expect(easter2026.getDate()).toBe(5);
    });

    it("should identify Good Friday and Carnival in 2026", () => {
      // Sexta-feira Santa 2026: 03 de Abril
      const goodFriday2026 = new Date(2026, 3, 3);
      expect(isNationalHoliday(goodFriday2026)).toBe(true);
      expect(getHolidayName(goodFriday2026)).toContain("Sexta-feira Santa");
      expect(isBusinessDay(goodFriday2026)).toBe(false);

      // Terça de Carnaval 2026: 17 de Fevereiro
      const carnivalTuesday = new Date(2026, 1, 17);
      expect(isNationalHoliday(carnivalTuesday)).toBe(true);
      expect(getHolidayName(carnivalTuesday)).toContain("Carnaval");
      expect(isBusinessDay(carnivalTuesday)).toBe(false);

      // Corpus Christi 2026: 04 de Junho
      const corpusChristi = new Date(2026, 5, 4);
      expect(isNationalHoliday(corpusChristi)).toBe(true);
      expect(getHolidayName(corpusChristi)).toBe("Corpus Christi");
      expect(isBusinessDay(corpusChristi)).toBe(false);
    });
  });

  describe("national fixed holidays", () => {
    it("should identify fixed holidays (Tiradentes, Dia do Trabalho, Consciência Negra)", () => {
      // 21 de Abril: Tiradentes
      const tiradentes = new Date(2026, 3, 21);
      expect(isNationalHoliday(tiradentes)).toBe(true);
      expect(getHolidayName(tiradentes)).toBe("Tiradentes");
      expect(isBusinessDay(tiradentes)).toBe(false);

      // 01 de Maio: Dia Mundial do Trabalho (cai numa Sexta-feira em 2026)
      const laborDay = new Date(2026, 4, 1);
      expect(isNationalHoliday(laborDay)).toBe(true);
      expect(getHolidayName(laborDay)).toBe("Dia Mundial do Trabalho");
      expect(isBusinessDay(laborDay)).toBe(false);

      // 20 de Novembro: Dia da Consciência Negra (Lei 14.759/2023)
      const blackAwareness = new Date(2026, 10, 20);
      expect(isNationalHoliday(blackAwareness)).toBe(true);
      expect(getHolidayName(blackAwareness)).toBe("Dia Nacional de Zumbi e da Consciência Negra");
      expect(isBusinessDay(blackAwareness)).toBe(false);
    });
  });

  describe("getClosingD0Date with holiday skipping", () => {
    it("should return the last business day of the month skipping weekends", () => {
      // Maio 2026: 31 de Maio é Domingo -> Último dia útil deve ser 29 de Maio (Sexta)
      const d0May2026 = getClosingD0Date(2026, 5);
      expect(d0May2026.getFullYear()).toBe(2026);
      expect(d0May2026.getMonth()).toBe(4); // 0-indexed: 4 = Maio
      expect(d0May2026.getDate()).toBe(29);
      expect(d0May2026.getDay()).toBe(5); // Sexta-feira
    });

    it("should return the last day if it is already a weekday", () => {
      // Julho 2026: 31 de Julho é Sexta-feira
      const d0July2026 = getClosingD0Date(2026, 7);
      expect(d0July2026.getFullYear()).toBe(2026);
      expect(d0July2026.getMonth()).toBe(6); // 0-indexed: 6 = Julho
      expect(d0July2026.getDate()).toBe(31);
      expect(d0July2026.getDay()).toBe(5); // Sexta-feira
    });

    it("should skip holidays when computing D0 if the last day is a holiday", () => {
      // Dezembro 2025: 31/12 é Quarta, 25/12 é Natal. Se 31/12 fosse feriado, retrocederia.
      // Em Abril 2026: 30 de Abril é Quinta-feira (dia útil normal).
      const d0Apr2026 = getClosingD0Date(2026, 4);
      expect(d0Apr2026.getDate()).toBe(30);
    });
  });

  describe("addBusinessDays with holidays and weekends", () => {
    it("should skip both holidays and weekends when adding days", () => {
      // Quinta-feira 30/04/2026 + 1 dia útil:
      // Sexta 01/05/2026 é Dia do Trabalho (feriado)
      // Sábado 02/05 e Domingo 03/05 (fim de semana)
      // Resultado: Segunda-feira 04/05/2026
      const apr30 = new Date(2026, 3, 30);
      const nextDay = addBusinessDays(apr30, 1);
      expect(nextDay.getFullYear()).toBe(2026);
      expect(nextDay.getMonth()).toBe(4); // Maio
      expect(nextDay.getDate()).toBe(4); // 04 de Maio
      expect(nextDay.getDay()).toBe(1); // Segunda-feira
    });

    it("should skip holidays and weekends when subtracting days", () => {
      // Segunda-feira 04/05/2026 - 1 dia útil:
      // Pula Fim de Semana (03/05 e 02/05) e Feriado (01/05)
      // Resultado: Quinta-feira 30/04/2026
      const may04 = new Date(2026, 4, 4);
      const prevDay = addBusinessDays(may04, -1);
      expect(prevDay.getMonth()).toBe(3); // Abril
      expect(prevDay.getDate()).toBe(30);
      expect(prevDay.getDay()).toBe(4); // Quinta-feira
    });

    it("should skip Tiradentes (21/04) when traversing mid-week", () => {
      // Segunda-feira 20/04/2026 + 1 dia útil:
      // Terça 21/04 é Tiradentes
      // Resultado: Quarta-feira 22/04/2026
      const monday = new Date(2026, 3, 20);
      const result = addBusinessDays(monday, 1);
      expect(result.getDate()).toBe(22);
      expect(result.getDay()).toBe(3); // Quarta
    });
  });

  describe("getCalculatedWorkdayDate", () => {
    it("should calculate D0, D-1, and D+1 with useD0=true", () => {
      // Julho 2026: D0 = 31/07 (Sexta)
      const d0 = getCalculatedWorkdayDate(2026, 7, 0, true);
      expect(d0.getDate()).toBe(31);

      // D-1 = 30/07 (Quinta)
      const dMinus1 = getCalculatedWorkdayDate(2026, 7, -1, true);
      expect(dMinus1.getDate()).toBe(30);

      // D+1 = 03/08 (Segunda)
      const dPlus1 = getCalculatedWorkdayDate(2026, 7, 1, true);
      expect(dPlus1.getDate()).toBe(3);
      expect(dPlus1.getMonth()).toBe(7); // Agosto
    });
  });

  describe("getWorkdayOffsets", () => {
    it("should return the standard D-5 to D+5 range", () => {
      const offsets = getWorkdayOffsets("D-5_D+5", undefined, true);
      expect(offsets).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    });

    it("should exclude D0 when useD0 is false", () => {
      const offsets = getWorkdayOffsets("D-3_D+3", undefined, false);
      expect(offsets).toEqual([-3, -2, -1, 1, 2, 3]);
      expect(offsets).not.toContain(0);
    });
  });

  describe("formatWorkdayColumnHeader", () => {
    it("should format offset labels and report holiday info", () => {
      const d0Date = new Date(2026, 6, 31);
      const header0 = formatWorkdayColumnHeader(0, d0Date, true);
      expect(header0.badge).toBe("D0 / WD0");
      expect(header0.formattedDate).toBe("31/07");
      expect(header0.holidayName).toBeNull();

      const laborDay = new Date(2026, 4, 1);
      const headerHoliday = formatWorkdayColumnHeader(1, laborDay, true);
      expect(headerHoliday.holidayName).toBe("Dia Mundial do Trabalho");
    });
  });

  describe("getWorkdayOffsetFromDate", () => {
    it("should correctly find the offset matching a target date", () => {
      // Julho 2026: 31/07/2026 = D0
      const targetDate = new Date(2026, 6, 31);
      const offset = getWorkdayOffsetFromDate(targetDate, 2026, 7, true);
      expect(offset).toBe(0);
    });
  });
});
