// ─────────────────────────────────────────────────────────────
// CHRONOS — Email via Brevo API
// Provider único de email transacional para o Chronos
// (Edge Functions já usam Brevo, agora o Next.js também)
// Docs: https://developers.brevo.com/reference/sendtransacemail
// ─────────────────────────────────────────────────────────────

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY ?? process.env.RESEND_API_KEY ?? "",
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? "notificacoes@chronos.expert",
    senderName: process.env.BREVO_SENDER_NAME ?? "CHRONOS",
  };
}

export interface EmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Lê a resposta do Brevo tolerando corpo não-JSON (ex.: página de erro de
 * proxy) e monta uma mensagem com status HTTP e código do Brevo, para que o
 * motivo da falha (chave inválida, IP não autorizado, cota diária, remetente
 * não validado…) chegue legível à tela e aos logs.
 */
export async function readBrevoResponse(
  response: Response
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const raw = await response.text().catch(() => "");
  let data: { messageId?: string; message?: string; code?: string } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // corpo não é JSON
  }
  if (response.ok) return { ok: true, messageId: data.messageId };
  const detail = data.message || raw.slice(0, 200) || response.statusText || "sem detalhes";
  const code = data.code ? `, ${data.code}` : "";
  return { ok: false, error: `Brevo recusou o envio (HTTP ${response.status}${code}): ${detail}` };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();
  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY não configurada" };
  }

  try {
    const body: Record<string, unknown> = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.to, name: payload.toName ?? payload.to.split("@")[0] }],
      subject: payload.subject,
      htmlContent: payload.html,
    };
    if (payload.text) {
      body.textContent = payload.text;
    }
    if (payload.replyTo) {
      body.replyTo = { email: payload.replyTo };
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const parsed = await readBrevoResponse(response);
    if (!parsed.ok) return { success: false, error: parsed.error };
    return { success: true, id: parsed.messageId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

// ── Helper pra tags de rastreamento ─────────────────────────
export async function sendEmailWithTags(
  payload: EmailPayload,
  tags: string[]
): Promise<EmailResult> {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();
  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY não configurada" };
  }

    const body: Record<string, unknown> = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.to, name: payload.toName ?? payload.to.split("@")[0] }],
      subject: payload.subject,
      htmlContent: payload.html,
      tags: tags.map((t) => t.slice(0, 30)),
    };
    if (payload.text) {
      body.textContent = payload.text;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  const parsed = await readBrevoResponse(response);
  if (!parsed.ok) return { success: false, error: parsed.error };
  return { success: true, id: parsed.messageId };
}
