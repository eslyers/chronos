// ─────────────────────────────────────────────────────────────
// CHRONOS — Identificação do Master ADM (fonte única)
// Configurável por MASTER_ADMIN_EMAIL (servidor) / NEXT_PUBLIC_MASTER_ADMIN_EMAIL
// (tela). No servidor, compare SEMPRE com o email da sessão autenticada
// (auth.getUser), nunca com profiles.email.
// ─────────────────────────────────────────────────────────────

const DEFAULT_MASTER_ADMIN_EMAIL = "eslyers@gmail.com";

export const MASTER_ADMIN_EMAIL = (
  process.env.MASTER_ADMIN_EMAIL ||
  process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ||
  DEFAULT_MASTER_ADMIN_EMAIL
).toLowerCase();

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}
