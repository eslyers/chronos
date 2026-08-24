import {
  getClosingD0Date,
  addBusinessDays,
  getCalculatedWorkdayDate,
  getWorkdayOffsets,
  formatWorkdayColumnHeader,
  getWorkdayOffsetFromDate,
} from "../../business-days";

describe("business-days utility", () => {
  describe("getClosingD0Date", () => {
    it("should return the last business day of the month", () => {
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
  });

  describe("addBusinessDays", () => {
    it("should skip weekends when adding days", () => {
      // Sexta-feira 29/05/2026 + 1 dia útil -> Segunda-feira 01/06/2026
      const friday = new Date(2026, 4, 29);
      const monday = addBusinessDays(friday, 1);
      expect(monday.getDate()).toBe(1);
      expect(monday.getMonth()).toBe(5); // Junho
      expect(monday.getDay()).toBe(1); // Segunda
    });

    it("should skip weekends when subtracting days", () => {
      // Segunda-feira 01/06/2026 - 1 dia útil -> Sexta-feira 29/05/2026
      const monday = new Date(2026, 5, 1);
      const friday = addBusinessDays(monday, -1);
      expect(friday.getDate()).toBe(29);
      expect(friday.getMonth()).toBe(4); // Maio
      expect(friday.getDay()).toBe(5); // Sexta
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
    it("should format offset labels correctly", () => {
      const d0Date = new Date(2026, 6, 31);
      const header0 = formatWorkdayColumnHeader(0, d0Date, true);
      expect(header0.badge).toBe("D0 / WD0");
      expect(header0.formattedDate).toBe("31/07");

      const dMinus2Date = new Date(2026, 6, 29);
      const headerMinus2 = formatWorkdayColumnHeader(-2, dMinus2Date, true);
      expect(headerMinus2.badge).toBe("D-2");
      expect(headerMinus2.formattedDate).toBe("29/07");

      const dPlus3Date = new Date(2026, 7, 5);
      const headerPlus3 = formatWorkdayColumnHeader(3, dPlus3Date, true);
      expect(headerPlus3.badge).toBe("D+3");
      expect(headerPlus3.formattedDate).toBe("05/08");
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
