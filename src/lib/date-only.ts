// ─────────────────────────────────────────────────────────────
// CHRONOS — Datas sem hora (colunas DATE: start_date, due_date, target_date)
// `new Date("YYYY-MM-DD")` é meia-noite UTC, que no Brasil (UTC-3) cai no dia
// anterior. Estes helpers trabalham só com o texto YYYY-MM-DD ou com datas
// locais, nunca com toISOString().
// ─────────────────────────────────────────────────────────────

const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const DAY_MS = 86_400_000;

function utcDayNumber(value: string): number | null {
  const m = DATE_ONLY_PREFIX.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  // Rejeita datas inexistentes (ex.: 2026-02-31)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return ms / DAY_MS;
}

function fromUtcDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Normaliza "YYYY-MM-DD" ou ISO ("YYYY-MM-DDTHH:mm...") para "YYYY-MM-DD"; inválido → null. */
export function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = utcDayNumber(value.trim());
  return day === null ? null : fromUtcDayNumber(day);
}

/** Data local (fuso do navegador) como "YYYY-MM-DD". */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Hoje no fuso local, como "YYYY-MM-DD". */
export function todayDateOnly(now: Date = new Date()): string {
  return formatDateOnly(now);
}

/** Converte "YYYY-MM-DD" (ou ISO) em meia-noite LOCAL. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  const clean = toDateOnly(value);
  if (!clean) return null;
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Dias de `from` até `to` (positivo se `to` for depois). Inválido → 0. */
export function daysBetweenDateOnly(from: string, to: string): number {
  const a = utcDayNumber(from);
  const b = utcDayNumber(to);
  if (a === null || b === null) return 0;
  return b - a;
}

/** Soma `days` dias a uma data "YYYY-MM-DD" (aritmética em UTC: imune a horário de verão). */
export function shiftDateOnly(value: string | null | undefined, days: number): string | null {
  if (!value) return null;
  const day = utcDayNumber(value.trim());
  if (day === null) return null;
  return fromUtcDayNumber(day + (Number.isFinite(days) ? Math.trunc(days) : 0));
}
