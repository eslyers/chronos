// ─────────────────────────────────────────────────────────────
// CHRONOS — Regras de permissão da administração de acessos
// Funções puras usadas pela API (que roda com service_role e por isso não
// passa pelos triggers/RLS do banco) e pela tela (para desabilitar o que o
// usuário não pode fazer). Retornam a mensagem de erro, ou null se permitido.
// ─────────────────────────────────────────────────────────────
import type { AccessGrant, AccessMember, AccessProject, ProjectRole, WorkspaceRole } from "./types";

export interface CallerContext {
  role: WorkspaceRole | null;
  isMasterAdmin: boolean;
}

export function canManageWorkspace(caller: CallerContext): boolean {
  return caller.isMasterAdmin || caller.role === "owner" || caller.role === "admin";
}

/** Erro ao alterar (ou remover, newRole null) o papel de um membro no workspace. */
export function workspaceRoleChangeError(params: {
  caller: CallerContext;
  isSelf: boolean;
  targetRole: WorkspaceRole;
  newRole: WorkspaceRole | null;
  /** Quantos owners o workspace tem hoje. */
  ownerCount: number;
}): string | null {
  const { caller, isSelf, targetRole, newRole, ownerCount } = params;
  if (!canManageWorkspace(caller)) return "Apenas administradores podem gerenciar membros";
  if (isSelf) return "Não é permitido alterar o próprio papel";
  if (newRole === targetRole) return null;
  const touchesOwner = targetRole === "owner" || newRole === "owner";
  if (touchesOwner && !(caller.isMasterAdmin || caller.role === "owner")) {
    return "Apenas o dono pode atribuir ou alterar o papel de dono";
  }
  if (targetRole === "owner" && newRole !== "owner" && ownerCount <= 1) {
    return "O workspace precisa de ao menos um dono";
  }
  return null;
}

/** Acesso efetivo de um membro a um projeto, como a RLS o calcula. */
export type EffectiveAccess =
  | { kind: "workspace-admin" }
  | { kind: "owner" }
  | { kind: "grant"; role: ProjectRole }
  | { kind: "none" };

export function effectiveAccess(
  member: Pick<AccessMember, "user_id" | "role">,
  project: Pick<AccessProject, "id" | "created_by">,
  grants: AccessGrant[]
): EffectiveAccess {
  if (member.role === "owner" || member.role === "admin") return { kind: "workspace-admin" };
  if (project.created_by === member.user_id) return { kind: "owner" };
  const grant = grants.find((g) => g.project_id === project.id && g.user_id === member.user_id);
  return grant ? { kind: "grant", role: grant.role } : { kind: "none" };
}

/** Pode editar tarefas/etapas do projeto? (espelha can_edit_project no banco) */
export function canEditProject(
  member: Pick<AccessMember, "user_id" | "role">,
  project: Pick<AccessProject, "id" | "created_by">,
  grants: AccessGrant[]
): boolean {
  if (member.role === "viewer") return false;
  const access = effectiveAccess(member, project, grants);
  if (access.kind === "workspace-admin" || access.kind === "owner") return true;
  return access.kind === "grant" && access.role !== "viewer";
}

/** Erro ao conceder/alterar/revogar (newRole null) o acesso de um membro a um projeto. */
export function projectAccessChangeError(params: {
  caller: CallerContext;
  member: Pick<AccessMember, "user_id" | "role"> | undefined;
  project: Pick<AccessProject, "id" | "created_by"> | undefined;
  newRole: Exclude<ProjectRole, "owner"> | null;
}): string | null {
  const { caller, member, project } = params;
  if (!canManageWorkspace(caller)) return "Apenas administradores podem gerenciar acessos";
  if (!project) return "Projeto não encontrado neste workspace";
  if (!member) return "O usuário não é membro deste workspace";
  if (member.role === "owner" || member.role === "admin") {
    return "Donos e admins do workspace já têm acesso a todos os projetos";
  }
  if (project.created_by === member.user_id) {
    return "O dono do projeto tem acesso total; use \"Transferir dono\" para mudar";
  }
  return null;
}

/** Erro ao transferir o projeto para outro dono. */
export function projectTransferError(params: {
  caller: CallerContext;
  project: Pick<AccessProject, "id" | "created_by"> | undefined;
  newOwner: Pick<AccessMember, "user_id" | "role"> | undefined;
}): string | null {
  const { caller, project, newOwner } = params;
  if (!canManageWorkspace(caller)) return "Apenas administradores podem transferir projetos";
  if (!project) return "Projeto não encontrado neste workspace";
  if (!newOwner) return "O novo dono precisa ser membro do workspace";
  if (newOwner.role === "viewer") return "Um membro com papel Leitura não pode ser dono de projeto";
  if (project.created_by === newOwner.user_id) return "Esse usuário já é o dono do projeto";
  return null;
}
