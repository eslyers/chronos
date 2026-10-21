// ─────────────────────────────────────────────────────────────
// CHRONOS — Responsável da tarefa (payload consistente com o banco)
// chk_assignee_consistency aceita só três formas:
//   1. membro do workspace: assignee_id preenchido e assignee_name NULL
//   2. convite pendente:   assignee_id NULL, assignee_name + status 'pending'
//   3. sem responsável:    tudo NULL
// O nome de exibição de um membro vem do perfil, nunca de assignee_name.
// ─────────────────────────────────────────────────────────────
import type { Task } from "@/lib/context/DataContext";

export type AssigneeMode = "member" | "custom";

export type AssigneePayload = Pick<Task, "assignee_id" | "assignee_name" | "assignee_status">;

export function buildAssigneePayload(
  mode: AssigneeMode,
  assigneeId: string | null | undefined,
  assigneeName: string | null | undefined
): AssigneePayload {
  if (mode === "member") {
    const id = assigneeId?.trim();
    return id
      ? { assignee_id: id, assignee_name: null, assignee_status: null }
      : { assignee_id: null, assignee_name: null, assignee_status: null };
  }
  const name = assigneeName?.trim();
  return name
    ? { assignee_id: null, assignee_name: name, assignee_status: "pending" }
    : { assignee_id: null, assignee_name: null, assignee_status: null };
}
