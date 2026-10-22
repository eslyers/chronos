// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras puras dos campos de duração do TaskDialog
// (Horas Est. / Horas Reais) e do badge de variação estimado × real.
// ─────────────────────────────────────────────────────────────
import { parseDurationToHours, formatHoursToHHMM, formatHoursBadge } from "@/lib/duration";

/** Mantém só os caracteres aceitos ao digitar uma duração (dígitos, ":", "h", "m", ".", "," e espaço). */
export function sanitizeDurationInput(raw: string): string {
  return raw.replace(/[^0-9:hmHM.,\s]/g, "");
}

/**
 * Normalização no blur: devolve o valor formatado em HH:MM, ou null quando o
 * campo está vazio ou não é uma duração reconhecida (nesse caso não altera).
 */
export function normalizeDurationOnBlur(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = parseDurationToHours(value);
  return parsed !== null ? formatHoursToHHMM(parsed) : null;
}

export type HoursVariance =
  | { kind: "exact" }
  | { kind: "under"; diffFormatted: string; pct: number }
  | { kind: "over"; diffFormatted: string; pct: number };

/** Diferença entre horas reais e estimadas; null se alguma não for uma duração positiva. */
export function computeHoursVariance(estimated: string, actual: string): HoursVariance | null {
  const est = parseDurationToHours(estimated);
  const act = parseDurationToHours(actual);
  if (est === null || act === null || est <= 0 || act <= 0) return null;
  const diff = act - est;
  const pct = Math.round(((act - est) / est) * 100);
  const diffFormatted = formatHoursBadge(Math.abs(diff));
  if (diff === 0) return { kind: "exact" };
  if (diff < 0) return { kind: "under", diffFormatted, pct };
  return { kind: "over", diffFormatted, pct };
}
