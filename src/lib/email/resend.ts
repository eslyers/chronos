// ⚠️  DEPRECATED (2026-07-22): Migrado para Brevo por decisão do Esly.
//     Use `src/lib/email/brevo.ts` em vez deste arquivo.
//     Este módulo será removido após validação completa em prod.
// ─────────────────────────────────────────────────────────────
// CHRONOS — Email via Resend API (LEGACY)
// ─────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "CHRONOS <noreply@resend.dev>";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY não configurada" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
      }),
    });

    const data = await response.json() as { id?: string; message?: string; };

    if (!response.ok) {
      return { success: false, error: data.message ?? `HTTP ${response.status}` };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

// ── Templates de email ────────────────────────────────────────

export function taskDueEmailTemplate(params: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  hoursUntil: number;
  taskUrl: string;
  assigneeName?: string;
}): { subject: string; html: string } {
  const { taskTitle, projectName, dueDate, hoursUntil, taskUrl, assigneeName } = params;

  const urgencyColor = hoursUntil <= 0 ? "#ef4444" : hoursUntil <= 24 ? "#f59e0b" : "#3b82f6";
  const urgencyLabel = hoursUntil <= 0 ? "VENCE HOJE!" : hoursUntil <= 24 ? "Vence em 24h" : `Vence em ${hoursUntil}h`;

  const subject = `🕐 CHRONOS — ${urgencyLabel}: ${taskTitle}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:12px 12px 0 0;padding:32px;color:white">
      <div style="font-size:14px;opacity:0.9;margin-bottom:8px">🕐 CHRONOS</div>
      <h1 style="margin:0;font-size:24px;font-weight:700">Lembrete de Tarefa</h1>
    </div>

    <!-- Body -->
    <div style="background:white;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e2e8f0;border-top:none">
      <!-- Urgency badge -->
      <div style="display:inline-block;background:${urgencyColor}20;color:${urgencyColor};padding:6px 16px;border-radius:100px;font-size:14px;font-weight:600;margin-bottom:24px">
        ${urgencyLabel}
      </div>

      <!-- Task info -->
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;font-weight:600">${taskTitle}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">
        ${assigneeName ? `Olá ${assigneeName}, ` : ""}esta tarefa precisa da sua atenção:
      </p>

      <!-- Details card -->
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:6px 0">📁 Projeto</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${projectName}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">📅 Vencimento</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${dueDate}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">⏰ Tempo restante</td>
            <td style="color:${urgencyColor};font-weight:700;text-align:right">${hoursUntil <= 0 ? "ATRASADA!" : `${hoursUntil} horas`}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <a href="${taskUrl}" style="display:block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-align:center;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;margin-bottom:24px">
        Ver tarefa no CHRONOS →
      </a>

      <!-- Footer -->
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
        Enviado automaticamente pelo CHRONOS · Sistema de Gestão de Cronograma<br>
        Você está recebendo este email porque tem tarefas com prazo próximo.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}