// ─────────────────────────────────────────────────────────────
// CHRONOS — Templates de Email (Brevo)
// 5 templates: task_due | task_assigned | status_changed | comment_added | invite
// Todos retornam { subject, html } prontos pra sendEmail()
// ─────────────────────────────────────────────────────────────

const BRAND_GRADIENT = "linear-gradient(135deg,#3b82f6,#1e40af)";
const CRITICAL = "#ef4444";
const HIGH = "#1e40af";
const MEDIUM = "#3b82f6";
const LOW = "#22c55e";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseHtml(opts: {
  badge?: { color: string; label: string };
  title: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  footer?: string;
}) {
  const badge = opts.badge
    ? `<div style="display:inline-block;background:${opts.badge.color}20;color:${opts.badge.color};padding:6px 16px;border-radius:100px;font-size:14px;font-weight:600;margin-bottom:24px">${opts.badge.label}</div>`
    : "";

  const cta = opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:block;background:${BRAND_GRADIENT};color:white;text-align:center;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;margin-bottom:24px">${opts.ctaLabel ?? "Ver no CHRONOS →"}</a>`
    : "";

  const footer = opts.footer ??
    `<p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">Enviado automaticamente pelo CHRONOS · Sistema de Gestão de Cronograma</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:${BRAND_GRADIENT};border-radius:12px 12px 0 0;padding:32px;color:white">
      <div style="font-size:14px;opacity:0.9;margin-bottom:8px">🕐 CHRONOS</div>
      <h1 style="margin:0;font-size:24px;font-weight:700">${escapeHtml(opts.title)}</h1>
    </div>
    <div style="background:white;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e2e8f0;border-top:none">
      ${badge}
      ${opts.bodyHtml}
      ${cta}
      ${footer}
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 1. TASK DUE — tarefa vencendo (3/1/0 dias)
// ─────────────────────────────────────────────────────────────
export function taskDueEmailTemplate(params: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  hoursUntil: number;
  taskUrl: string;
  assigneeName?: string;
}): { subject: string; html: string } {
  const { taskTitle, projectName, dueDate, hoursUntil, taskUrl, assigneeName } = params;
  const color = hoursUntil <= 0 ? CRITICAL : hoursUntil <= 24 ? HIGH : MEDIUM;
  const label = hoursUntil <= 0 ? "VENCE HOJE!" : hoursUntil <= 24 ? "Vence em 24h" : `Vence em ${hoursUntil}h`;

  const subject = `🕐 CHRONOS — ${label}: ${taskTitle}`;
  const html = baseHtml({
    badge: { color, label },
    title: "Lembrete de Tarefa",
    ctaUrl: taskUrl,
    ctaLabel: "Ver tarefa no CHRONOS →",
    bodyHtml: `
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;font-weight:600">${escapeHtml(taskTitle)}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">
        ${assigneeName ? `Olá ${escapeHtml(assigneeName)}, ` : ""}esta tarefa precisa da sua atenção:
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:6px 0">📁 Projeto</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(projectName)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">📅 Vencimento</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(dueDate)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">⏰ Tempo restante</td>
            <td style="color:${color};font-weight:700;text-align:right">${hoursUntil <= 0 ? "ATRASADA!" : `${hoursUntil} horas`}</td>
          </tr>
        </table>
      </div>
    `,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────
// 2. TASK ASSIGNED — Esly atribuiu uma task pra você
// ─────────────────────────────────────────────────────────────
export function taskAssignedEmailTemplate(params: {
  taskTitle: string;
  projectName: string;
  dueDate?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  taskUrl: string;
  assigneeName?: string;
  assignedBy?: string;
}): { subject: string; html: string } {
  const priorityColor: Record<string, string> = { critical: CRITICAL, high: HIGH, medium: MEDIUM, low: LOW };
  const priorityLabel: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };

  const subject = `📋 CHRONOS — Você foi atribuído: ${params.taskTitle}`;
  const html = baseHtml({
    badge: { color: priorityColor[params.priority], label: "📋 Nova tarefa atribuída" },
    title: "Nova tarefa atribuída",
    ctaUrl: params.taskUrl,
    ctaLabel: "Ver tarefa →",
    bodyHtml: `
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;font-weight:600">${escapeHtml(params.taskTitle)}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">
        ${params.assigneeName ? `Olá <strong>${escapeHtml(params.assigneeName)}</strong>, ` : ""}
        ${params.assignedBy ? `<strong>${escapeHtml(params.assignedBy)}</strong> atribuiu` : "Foi atribuída"}
        uma tarefa pra você:
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:6px 0">📁 Projeto</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(params.projectName)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:6px 0">🚦 Prioridade</td>
            <td style="color:${priorityColor[params.priority]};font-weight:700;text-align:right">${priorityLabel[params.priority]}</td>
          </tr>
          ${params.dueDate ? `
          <tr>
            <td style="color:#64748b;padding:6px 0">📅 Prazo</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(params.dueDate)}</td>
          </tr>` : ""}
        </table>
      </div>
    `,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────
// 3. STATUS CHANGED — status de uma task mudou
// ─────────────────────────────────────────────────────────────
export function statusChangedEmailTemplate(params: {
  taskTitle: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: string;
  taskUrl: string;
  comment?: string;
}): { subject: string; html: string } {
  const statusEmoji: Record<string, string> = {
    todo: "⭕", in_progress: "🟡", review: "🟣", done: "✅", blocked: "🚫",
  };
  const subject = `🔄 CHRONOS — Status: ${params.taskTitle}`;
  const html = baseHtml({
    title: "Status atualizado",
    ctaUrl: params.taskUrl,
    bodyHtml: `
      <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;font-weight:600">${escapeHtml(params.taskTitle)}</h2>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:0 0 24px;padding:20px;background:#f8fafc;border-radius:8px">
        <span style="font-size:14px;color:#64748b">${statusEmoji[params.oldStatus] ?? "•"} ${escapeHtml(params.oldStatus)}</span>
        <span style="color:#94a3b8;font-size:20px">→</span>
        <span style="font-size:14px;color:#1e293b;font-weight:700">${statusEmoji[params.newStatus] ?? "•"} ${escapeHtml(params.newStatus)}</span>
      </div>
      ${params.changedBy ? `<p style="margin:0 0 16px;color:#64748b;font-size:14px">Movido por <strong>${escapeHtml(params.changedBy)}</strong></p>` : ""}
      ${params.comment ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #3b82f6;background:#eff6ff;color:#1e293b;font-size:14px">${escapeHtml(params.comment)}</blockquote>` : ""}
      <p style="margin:0;color:#64748b;font-size:14px">📁 <strong>${escapeHtml(params.projectName)}</strong></p>
    `,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────
// 4. COMMENT ADDED — novo comentário em task
// ─────────────────────────────────────────────────────────────
export function commentAddedEmailTemplate(params: {
  taskTitle: string;
  commentAuthor: string;
  commentText: string;
  taskUrl: string;
  projectName: string;
}): { subject: string; html: string } {
  const truncatedText = params.commentText.length > 500
    ? params.commentText.slice(0, 500) + "..."
    : params.commentText;

  const subject = `💬 CHRONOS — Novo comentário: ${params.taskTitle}`;
  const html = baseHtml({
    badge: { color: "#8b5cf6", label: "💬 Novo comentário" },
    title: "Novo comentário",
    ctaUrl: params.taskUrl,
    ctaLabel: "Responder no CHRONOS →",
    bodyHtml: `
      <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;font-weight:600">${escapeHtml(params.taskTitle)}</h2>
      <p style="margin:0 0 12px;color:#64748b;font-size:14px"><strong>${escapeHtml(params.commentAuthor)}</strong> comentou em <strong>${escapeHtml(params.projectName)}</strong>:</p>
      <blockquote style="margin:0 0 24px;padding:16px 20px;border-left:3px solid #8b5cf6;background:#faf5ff;color:#1e293b;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(truncatedText)}</blockquote>
    `,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────
// 5. WORKSPACE INVITE — convite pra entrar no workspace
// ─────────────────────────────────────────────────────────────
export function inviteEmailTemplate(params: {
  inviteeEmail: string;
  workspaceName: string;
  invitedByName: string;
  inviteUrl: string;
  role: "admin" | "member" | "viewer";
  expiresInHours: number;
}): { subject: string; html: string } {
  const roleLabel: Record<string, string> = { admin: "Administrador", member: "Membro", viewer: "Visualizador" };

  const subject = `🎉 Você foi convidado(a) para o workspace ${params.workspaceName} no CHRONOS`;
  const html = baseHtml({
    badge: { color: "#22c55e", label: "🎉 Convite" },
    title: `Você foi convidado(a)!`,
    ctaUrl: params.inviteUrl,
    ctaLabel: "Aceitar convite →",
    footer: `
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:center">
        Este convite expira em <strong>${params.expiresInHours} horas</strong>.
      </p>
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
        Se você não esperava esse convite, pode ignorar este email com segurança.
      </p>
    `,
    bodyHtml: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#1e293b;font-weight:600">
        Olá! 👋
      </h2>
      <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6">
        <strong>${escapeHtml(params.invitedByName)}</strong> convidou você para participar do workspace
        <strong>${escapeHtml(params.workspaceName)}</strong> como <strong>${roleLabel[params.role]}</strong>.
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:14px;color:#64748b">📋 Detalhes do convite:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:4px 0">📁 Workspace</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(params.workspaceName)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:4px 0">👤 Email</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${escapeHtml(params.inviteeEmail)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:4px 0">🔑 Papel</td>
            <td style="color:#1e293b;font-weight:600;text-align:right">${roleLabel[params.role]}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">
        Ao aceitar, você terá acesso ao cronograma, kanban, calendário e templates do workspace.
        Se decidir criar uma conta, seu email <strong>${escapeHtml(params.inviteeEmail)}</strong> já ficará vinculado automaticamente.
      </p>
    `,
  });
  return { subject, html };
}
