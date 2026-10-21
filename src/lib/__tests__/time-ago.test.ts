import { timeAgo } from "@/lib/time-ago";

describe("timeAgo", () => {
  const now = new Date(2026, 9, 21, 15, 0, 0); // 21/10/2026 15:00 local
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;

  test("returns empty string for missing or invalid input", () => {
    expect(timeAgo(null, now)).toBe("");
    expect(timeAgo(undefined, now)).toBe("");
    expect(timeAgo("", now)).toBe("");
    expect(timeAgo("not-a-date", now)).toBe("");
  });

  test("treats less than a minute and future instants as 'agora'", () => {
    expect(timeAgo(ago(30_000), now)).toBe("agora");
    expect(timeAgo(ago(-5 * MIN), now)).toBe("agora");
  });

  test("formats minutes, hours and days", () => {
    expect(timeAgo(ago(1 * MIN), now)).toBe("1min atrás");
    expect(timeAgo(ago(59 * MIN), now)).toBe("59min atrás");
    expect(timeAgo(ago(60 * MIN), now)).toBe("1h atrás");
    expect(timeAgo(ago(23 * 60 * MIN + 59 * MIN), now)).toBe("23h atrás");
    expect(timeAgo(ago(24 * 60 * MIN), now)).toBe("1d atrás");
    expect(timeAgo(ago(29 * 24 * 60 * MIN), now)).toBe("29d atrás");
  });

  test("falls back to the pt-BR date after 30 days", () => {
    const old = new Date(2026, 7, 1, 10, 0, 0);
    expect(timeAgo(old, now)).toBe(old.toLocaleDateString("pt-BR"));
  });

  test("accepts ISO strings and a numeric 'now'", () => {
    const iso = ago(5 * MIN).toISOString();
    expect(timeAgo(iso, now.getTime())).toBe("5min atrás");
  });
});
