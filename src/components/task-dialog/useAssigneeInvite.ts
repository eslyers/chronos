"use client";

import { useState } from "react";

interface UseAssigneeInviteOptions {
  assigneeName: string | null;
  workspaceId: string | null;
  onInvited: () => void;
  onError: (message: string) => void;
}

/** Convite por e-mail do responsável externo pendente. */
export function useAssigneeInvite({ assigneeName, workspaceId, onInvited, onError }: UseAssigneeInviteOptions) {
  const [inviting, setInviting] = useState(false);

  // Convidar responsável pendente por email
  async function handleInvite() {
    if (!assigneeName || !workspaceId) return;
    setInviting(true);
    try {
      const emailOrName = assigneeName.trim();
      const isEmail = emailOrName.includes("@");
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: isEmail ? emailOrName : undefined,
          name: isEmail ? undefined : emailOrName,
          role: "member",
          workspace_id: workspaceId,
          send_email: true,
        }),
      });
      if (res.ok) {
        // Só no estado local: chk_assignee_consistency aceita apenas 'pending' para
        // responsável externo (assignee_id NULL + assignee_name), então não persiste 'invited'
        onInvited();
        // A API cria o convite mesmo quando o envio falha; avisa o motivo
        const data = await res.json().catch(() => ({}));
        if (data.email && data.email.sent === false) {
          onError(
            `Convite criado, mas o email não foi enviado: ${data.email.error || "erro desconhecido"}. ` +
              "Reenvie pela tela de Usuários ou compartilhe o link."
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Erro ao enviar convite");
      }
    } catch {
      onError("Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  }

  return { inviting, handleInvite };
}
