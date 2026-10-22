// ─────────────────────────────────────────────────────────────
// CHRONOS — Validação de segredos compartilhados (server-only)
// Compara "Authorization: Bearer <secret>" em tempo constante.
// ─────────────────────────────────────────────────────────────
import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function hasValidBearerSecret(request: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;
  // Hash antes de comparar: timingSafeEqual exige buffers do mesmo tamanho
  return timingSafeEqual(digest(provided), digest(secret));
}
