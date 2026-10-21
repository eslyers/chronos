// ─────────────────────────────────────────────────────────────
// CHRONOS — Tempo relativo ("5min atrás") para timestamps (created_at etc.)
// Fonte única: dashboard e central de notificações exibem o mesmo texto.
// ─────────────────────────────────────────────────────────────

const MINUTE_MS = 60_000;

/**
 * Converte um instante em texto relativo pt-BR: "agora", "5min atrás",
 * "3h atrás", "2d atrás"; a partir de 30 dias mostra a data (dd/mm/aaaa).
 * Datas futuras (relógio adiantado) contam como "agora"; inválido → "".
 */
export function timeAgo(
  value: string | Date | null | undefined,
  now: Date | number = Date.now()
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const nowMs = typeof now === "number" ? now : now.getTime();
  const minutes = Math.floor((nowMs - time) / MINUTE_MS);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR");
}
