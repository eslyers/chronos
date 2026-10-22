// ─────────────────────────────────────────────────────────────
// CHRONOS — Administração de acessos: contrato entre API e tela
// Rotas (todas exigem owner/admin do workspace ou Master ADM):
//   GET  /api/access/overview?workspace_id=…   → AccessOverview
//   POST /api/access/project-member            ← ProjectMemberChange
//   POST /api/access/workspace-member          ← WorkspaceMemberChange
//   POST /api/access/project                   ← ProjectAction
// Mutações respondem { ok: true } ou { error: string } com status 4xx/5xx.
// ─────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ProjectRole = "owner" | "admin" | "member" | "viewer";
export type ProjectStatus = "active" | "on_hold" | "archived" | "completed";

export interface AccessWorkspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface AccessMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: WorkspaceRole;
  is_master_admin: boolean;
}

export interface AccessProject {
  id: string;
  name: string;
  color: string | null;
  status: ProjectStatus;
  /** Dono do projeto (criador); null em projetos antigos sem dono. */
  created_by: string | null;
  created_at: string;
}

/** Linha de project_members. */
export interface AccessGrant {
  project_id: string;
  user_id: string;
  role: ProjectRole;
}

export interface AccessInvite {
  email: string;
  role: WorkspaceRole;
  expires_at: string;
}

export interface AccessCaller {
  user_id: string;
  /** Papel no workspace consultado (null se for Master ADM sem vínculo). */
  role: WorkspaceRole | null;
  is_master_admin: boolean;
}

export interface AccessOverview {
  workspace: AccessWorkspace;
  /** Só para o Master ADM: todos os workspaces, para o seletor. */
  workspaces?: AccessWorkspace[];
  caller: AccessCaller;
  members: AccessMember[];
  projects: AccessProject[];
  grants: AccessGrant[];
  invites: AccessInvite[];
}

/** role null = revogar o acesso ao projeto. */
export interface ProjectMemberChange {
  workspace_id: string;
  project_id: string;
  user_id: string;
  role: Exclude<ProjectRole, "owner"> | null;
}

/** role null = remover do workspace. */
export interface WorkspaceMemberChange {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole | null;
}

export type ProjectAction =
  | { workspace_id: string; project_id: string; action: "archive" | "activate" | "delete" }
  | { workspace_id: string; project_id: string; action: "transfer"; new_owner_id: string };

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Leitura",
};

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Leitura",
};
