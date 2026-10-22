// ─────────────────────────────────────────────────────────────
// CHRONOS — Nome de exibição de um usuário (perfil → e-mail → fallback)
// ─────────────────────────────────────────────────────────────

/** Nome do perfil; sem nome, o prefixo do e-mail; sem nenhum dos dois, `fallback`. */
export function userDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
  fallback = "Usuário"
): string {
  const cleanName = name?.trim();
  if (cleanName) return cleanName;
  const prefix = email?.split("@")[0]?.trim();
  return prefix || fallback;
}
