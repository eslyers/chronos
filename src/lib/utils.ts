import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength));
  }

  return result;
}

/**
 * Faz o parse seguro de strings de data ("YYYY-MM-DD" ou ISO) evitando deslocamento de fusos horários (UTC vs Local).
 */
export function parseLocalDate(iso: string | null): Date | null {
  if (!iso) return null;
  const dateOnly = iso.split("T")[0];
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 12, 0, 0);
    }
  }
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formata data no formato brasileiro curto (ex: "06 de ago.") sem perdas de fuso horário.
 */
export function formatDateBR(iso: string | null): string {
  const d = parseLocalDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * Calcula dias até a data especificada zerando as horas para comparação justa.
 */
export function daysUntil(iso: string | null): number | null {
  const d = parseLocalDate(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}