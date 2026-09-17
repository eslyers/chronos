/**
 * CHRONOS — Utilitários de Duração de Tarefas (Horas e Minutos)
 * Suporte nativo a durações superiores a 24h no formato HH:MM / HHh:MMm (ex: "36h:25m", "36:25", "120:00").
 */

/**
 * Converte qualquer representação textual de duração para horas em formato decimal (float).
 * Exemplos suportados:
 * - "36h:25m", "36h25m", "36h 25m", "36h:25" -> 36.4167
 * - "36:25", "36:25h" -> 36.4167
 * - "8", "8h", "08:00" -> 8.0
 * - "8.5", "8,5", "8h30m" -> 8.5
 * - "45m", "45min" -> 0.75
 */
export function parseDurationToHours(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    return isNaN(val) || val < 0 ? null : Number(val.toFixed(4));
  }

  const raw = String(val).trim().toLowerCase();
  if (!raw) return null;

  // 1. Padrão "36h:25m", "36h25m", "36h 25m", "36h:25", "36:25h"
  const hmMatch = raw.match(/^(\d+)\s*h[:\s]*(\d+)?\s*m?$/i) || raw.match(/^(\d+):(\d+)\s*h$/i);
  if (hmMatch) {
    const hours = parseInt(hmMatch[1], 10);
    const minutes = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
    return Number((hours + minutes / 60).toFixed(4));
  }

  // 2. Padrão "36:25" (HH:MM com horas ilimitadas)
  const colonMatch = raw.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return Number((hours + minutes / 60).toFixed(4));
  }

  // 3. Padrão "45m" ou "45min" (apenas minutos)
  const mMatch = raw.match(/^(\d+)\s*(?:m|min|minutos)$/i);
  if (mMatch) {
    const minutes = parseInt(mMatch[1], 10);
    return Number((minutes / 60).toFixed(4));
  }

  // 4. Padrão decimal "36.5", "36,5" ou inteiro "36"
  const normalized = raw.replace(",", ".");
  const num = parseFloat(normalized);
  if (!isNaN(num) && num >= 0) {
    return Number(num.toFixed(4));
  }

  return null;
}

/**
 * Formata um valor decimal de horas para string HH:MM padrão com sufixo (ex: "36h:25m" ou "08h:00m").
 * Garante pelo menos 2 dígitos nas horas quando < 10, e 2 dígitos nos minutos.
 */
export function formatHoursToHHMM(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) {
    return "";
  }

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;

  return `${hStr}h:${mStr}m`;
}

/**
 * Formata para exibição em badges visuais nos cards e tabelas:
 * - Se minutos forem 0: "8h" ou "36h"
 * - Se tiver minutos: "36h:25m" ou "8h:30m"
 */
export function formatHoursBadge(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) {
    return "";
  }

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h}h`;
  }
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${h}h:${mStr}m`;
}
