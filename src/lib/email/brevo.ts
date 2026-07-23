// ─────────────────────────────────────────────────────────────
// CHRONOS — Email via Brevo API
// Provider único de email transacional para o Chronos
// (Edge Functions já usam Brevo, agora o Next.js também)
// Docs: https://developers.brevo.com/reference/sendtransacemail
// ─────────────────────────────────────────────────────────────

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? process.env.RESEND_API_KEY ?? "";
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "eslyers@gmail.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "CHRONOS";

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

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!BREVO_API_KEY) {
    return { success: false, error: "BREVO_API_KEY não configurada" };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: payload.to, name: payload.toName ?? payload.to.split("@")[0] }],
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
        replyTo: payload.replyTo ? { email: payload.replyTo } : undefined,
      }),
    });

    const data = await response.json() as { messageId?: string; message?: string; code?: string };

    if (!response.ok) {
      return { success: false, error: data.message ?? `HTTP ${response.status}` };
    }

    return { success: true, id: data.messageId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

// ── Helper pra tags de rastreamento ─────────────────────────
export async function sendEmailWithTags(
  payload: EmailPayload,
  tags: string[]
): Promise<EmailResult> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: payload.to, name: payload.toName ?? payload.to.split("@")[0] }],
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
      tags: tags.map((t) => t.slice(0, 30)), // Brevo limita tag name a 30 chars
    }),
  });

  const data = await response.json() as { messageId?: string; message?: string };
  if (!response.ok) {
    return { success: false, error: data.message ?? `HTTP ${response.status}` };
  }
  return { success: true, id: data.messageId };
}
