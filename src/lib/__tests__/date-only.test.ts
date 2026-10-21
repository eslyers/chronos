import {
  toDateOnly,
  formatDateOnly,
  parseDateOnly,
  daysBetweenDateOnly,
  shiftDateOnly,
  todayDateOnly,
} from "../date-only";

describe("date-only helpers", () => {
  it("normalizes date-only and ISO strings", () => {
    expect(toDateOnly("2026-10-21")).toBe("2026-10-21");
    expect(toDateOnly("2026-10-21T00:00:00.000Z")).toBe("2026-10-21");
    expect(toDateOnly(" 2026-10-21T15:30:00-03:00 ")).toBe("2026-10-21");
  });

  it("rejects empty and impossible dates", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly("")).toBeNull();
    expect(toDateOnly("21/10/2026")).toBeNull();
    expect(toDateOnly("2026-02-31")).toBeNull();
    expect(toDateOnly("2026-13-01")).toBeNull();
  });

  it("formats and parses in local time (no UTC shift)", () => {
    expect(formatDateOnly(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    const parsed = parseDateOnly("2026-10-21")!;
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([2026, 9, 21]);
    expect(todayDateOnly(new Date(2026, 9, 21, 23, 30))).toBe("2026-10-21");
  });

  it("shifts and diffs dates across month, year and DST boundaries", () => {
    expect(shiftDateOnly("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDateOnly("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateOnly("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDateOnly("2026-03-08", 1)).toBe("2026-03-09"); // DST nos EUA
    expect(shiftDateOnly("2026-10-21", -21)).toBe("2026-09-30");
    expect(shiftDateOnly("2026-10-21", 0)).toBe("2026-10-21");
    expect(shiftDateOnly(null, 3)).toBeNull();
    expect(daysBetweenDateOnly("2026-10-01", "2026-10-21")).toBe(20);
    expect(daysBetweenDateOnly("2026-10-21", "2026-10-01")).toBe(-20);
    expect(daysBetweenDateOnly("invalid", "2026-10-01")).toBe(0);
  });
});
