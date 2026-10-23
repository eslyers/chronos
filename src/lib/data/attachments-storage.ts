// ─────────────────────────────────────────────────────────────
// CHRONOS — Anexos no Supabase Storage
// Bucket privado "task-attachments"; caminho <task_id>/<uuid>-<nome>. As
// policies do Storage liberam o arquivo para quem acessa o projeto da tarefa
// (primeira pasta do caminho), e a tabela só aceita caminhos dessa pasta.
// ─────────────────────────────────────────────────────────────

export const ATTACHMENTS_BUCKET = "task-attachments";
/** Igual ao file_size_limit do bucket (migration 20261028000000). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Validade dos links de download. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Nome seguro para o Storage: sem acentos, barras ou caracteres especiais. */
export function sanitizeFileName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .slice(-100);
  return base || "arquivo";
}

export function buildAttachmentPath(taskId: string, fileName: string, uniqueId: string): string {
  return `${taskId}/${uniqueId}-${sanitizeFileName(fileName)}`;
}

/** Só libera links http(s), data: (anexos antigos) e blob: (modo demo). */
export function isSafeAttachmentHref(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^(https?:|data:|blob:)/i.test(url.trim());
}

export function attachmentTooLargeMessage(size: number): string | null {
  if (size <= MAX_ATTACHMENT_BYTES) return null;
  return `O arquivo tem ${(size / 1024 / 1024).toFixed(1)} MB; o limite é ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`;
}
