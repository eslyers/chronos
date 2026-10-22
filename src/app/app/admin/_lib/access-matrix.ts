// ─────────────────────────────────────────────────────────────
// CHRONOS — Administração de acessos: lógica pura da tela
// Monta linhas/colunas da matriz usuários × projetos, filtra, conta
// acessos, decide quais opções oferecer e aplica mudanças otimistas
// sobre o AccessOverview. Sem React e sem I/O: tudo testável.
// ─────────────────────────────────────────────────────────────
import type {
  AccessGrant,
  AccessMember,
  AccessOverview,
  AccessProject,
  ProjectAction,
  ProjectMemberChange,
  ProjectRole,
  ProjectStatus,
  WorkspaceMemberChange,
  WorkspaceRole,
} from "@/lib/access/types";
import { PROJECT_ROLE_LABEL, WORKSPACE_ROLE_LABEL } from "@/lib/access/types";
import {
  effectiveAccess,
  projectAccessChangeError,
  projectTransferError,
  workspaceRoleChangeError,
  type CallerContext,
  type EffectiveAccess,
} from "@/lib/access/rules";

export const WORKSPACE_ROLES: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Ativo",
  on_hold: "Em espera",
  archived: "Arquivado",
  completed: "Concluído",
};

/** Valor de uma célula editável da matriz ("none" = sem acesso). */
export type CellValue = "none" | Exclude<ProjectRole, "owner">;

export const CELL_OPTIONS: { value: CellValue; label: string }[] = [
  { value: "none", label: "Sem acesso" },
  { value: "viewer", label: PROJECT_ROLE_LABEL.viewer },
  { value: "member", label: PROJECT_ROLE_LABEL.member },
  { value: "admin", label: PROJECT_ROLE_LABEL.admin },
];

export function cellValueToRole(value: CellValue): ProjectMemberChange["role"] {
  return value === "none" ? null : value;
}

export function callerContext(overview: Pick<AccessOverview, "caller">): CallerContext {
  return { role: overview.caller.role, isMasterAdmin: overview.caller.is_master_admin };
}

export function memberDisplayName(m: Pick<AccessMember, "full_name" | "email">): string {
  return m.full_name?.trim() || m.email;
}

/** Normaliza para busca: minúsculas e sem acentos. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesMember(m: Pick<AccessMember, "full_name" | "email">, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(`${m.full_name ?? ""} ${m.email}`).includes(q);
}

const ROLE_RANK: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };

/** Membros ordenados por papel (dono → leitura) e depois por nome. */
export function sortMembers<T extends Pick<AccessMember, "role" | "full_name" | "email">>(members: T[]): T[] {
  return [...members].sort(
    (a, b) =>
      ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
      memberDisplayName(a).localeCompare(memberDisplayName(b), "pt-BR", { sensitivity: "base" })
  );
}

export function filterMembers<T extends AccessMember>(members: T[], query: string): T[] {
  return sortMembers(members.filter((m) => matchesMember(m, query)));
}

/** Projetos visíveis como colunas: arquivados ocultos por padrão, ordem alfabética. */
export function visibleProjects<T extends Pick<AccessProject, "status" | "name">>(
  projects: T[],
  showArchived: boolean
): T[] {
  return projects
    .filter((p) => showArchived || p.status !== "archived")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

export function ownerCount(members: Pick<AccessMember, "role">[]): number {
  return members.filter((m) => m.role === "owner").length;
}

/** Quantos membros do workspace enxergam o projeto (admins + dono + concessões). */
export function countPeopleWithAccess(
  project: Pick<AccessProject, "id" | "created_by">,
  members: Pick<AccessMember, "user_id" | "role">[],
  grants: AccessGrant[]
): number {
  return members.filter((m) => effectiveAccess(m, project, grants).kind !== "none").length;
}

// ── Células ──────────────────────────────────────────────────

export type MatrixCell =
  | { kind: "workspace-admin"; label: string; reason: string }
  | { kind: "owner"; label: string; reason: string }
  | {
      kind: "editable";
      value: CellValue | "owner";
      /** Membro com papel Leitura no workspace: só leitura em qualquer projeto. */
      viewerWarning: boolean;
      /** Motivo de bloqueio (ex.: chamador sem permissão); null = editável. */
      disabledReason: string | null;
    };

export function buildCell(
  caller: CallerContext,
  member: Pick<AccessMember, "user_id" | "role">,
  project: Pick<AccessProject, "id" | "created_by">,
  grants: AccessGrant[]
): MatrixCell {
  const access: EffectiveAccess = effectiveAccess(member, project, grants);
  const reason = projectAccessChangeError({ caller, member, project, newRole: null });
  if (access.kind === "workspace-admin") {
    return { kind: "workspace-admin", label: "Admin (todos)", reason: reason ?? "" };
  }
  if (access.kind === "owner") {
    return { kind: "owner", label: PROJECT_ROLE_LABEL.owner, reason: reason ?? "" };
  }
  return {
    kind: "editable",
    value: access.kind === "grant" ? access.role : "none",
    viewerWarning: member.role === "viewer",
    disabledReason: reason,
  };
}

export interface MatrixRow {
  member: AccessMember;
  isSelf: boolean;
  cells: { project: AccessProject; cell: MatrixCell }[];
}

export interface Matrix {
  columns: { project: AccessProject; peopleWithAccess: number }[];
  rows: MatrixRow[];
  /** Total de membros antes do filtro de busca. */
  totalMembers: number;
  hiddenArchived: number;
}

export function buildMatrix(
  overview: AccessOverview,
  opts: { query: string; showArchived: boolean }
): Matrix {
  const caller = callerContext(overview);
  const projects = visibleProjects(overview.projects, opts.showArchived);
  const columns = projects.map((project) => ({
    project,
    peopleWithAccess: countPeopleWithAccess(project, overview.members, overview.grants),
  }));
  const rows = filterMembers(overview.members, opts.query).map((member) => ({
    member,
    isSelf: member.user_id === overview.caller.user_id,
    cells: projects.map((project) => ({
      project,
      cell: buildCell(caller, member, project, overview.grants),
    })),
  }));
  return {
    columns,
    rows,
    totalMembers: overview.members.length,
    hiddenArchived: opts.showArchived ? 0 : overview.projects.filter((p) => p.status === "archived").length,
  };
}

// ── Papel no workspace ───────────────────────────────────────

export interface RoleOption {
  role: WorkspaceRole;
  label: string;
  /** Por que essa opção não pode ser escolhida; null = permitida. */
  disabledReason: string | null;
}

export interface WorkspaceRoleControl {
  options: RoleOption[];
  /** Select inteiro bloqueado (nenhuma troca possível) e o motivo. */
  disabledReason: string | null;
  /** Motivo pelo qual o membro não pode ser removido; null = pode. */
  removeDisabledReason: string | null;
}

export function workspaceRoleControl(
  caller: CallerContext,
  member: Pick<AccessMember, "role">,
  isSelf: boolean,
  owners: number
): WorkspaceRoleControl {
  const check = (newRole: WorkspaceRole | null) =>
    workspaceRoleChangeError({ caller, isSelf, targetRole: member.role, newRole, ownerCount: owners });
  const options = WORKSPACE_ROLES.map((role) => ({
    role,
    label: WORKSPACE_ROLE_LABEL[role],
    disabledReason: role === member.role ? null : check(role),
  }));
  const others = options.filter((o) => o.role !== member.role);
  const allBlocked = others.every((o) => o.disabledReason !== null);
  return {
    options,
    disabledReason: allBlocked ? others[0]?.disabledReason ?? null : null,
    removeDisabledReason: check(null),
  };
}

// ── Projetos ────────────────────────────────────────────────

export interface OwnerOption {
  user_id: string;
  label: string;
}

/** Membros que podem receber o projeto (mais o dono atual, para exibir o valor). */
export function ownerOptions(
  caller: CallerContext,
  project: Pick<AccessProject, "id" | "created_by">,
  members: AccessMember[]
): OwnerOption[] {
  return sortMembers(members)
    .filter(
      (m) =>
        m.user_id === project.created_by ||
        projectTransferError({ caller, project, newOwner: m }) === null
    )
    .map((m) => ({ user_id: m.user_id, label: memberDisplayName(m) }));
}

// ── Mudanças otimistas ───────────────────────────────────────

export function applyProjectMemberChange(o: AccessOverview, c: ProjectMemberChange): AccessOverview {
  const others = o.grants.filter((g) => !(g.project_id === c.project_id && g.user_id === c.user_id));
  return {
    ...o,
    grants: c.role === null ? others : [...others, { project_id: c.project_id, user_id: c.user_id, role: c.role }],
  };
}

export function applyWorkspaceMemberChange(o: AccessOverview, c: WorkspaceMemberChange): AccessOverview {
  if (c.role === null) {
    return {
      ...o,
      members: o.members.filter((m) => m.user_id !== c.user_id),
      grants: o.grants.filter((g) => g.user_id !== c.user_id),
    };
  }
  const role = c.role;
  return { ...o, members: o.members.map((m) => (m.user_id === c.user_id ? { ...m, role } : m)) };
}

export function applyProjectAction(o: AccessOverview, a: ProjectAction): AccessOverview {
  switch (a.action) {
    case "delete":
      return {
        ...o,
        projects: o.projects.filter((p) => p.id !== a.project_id),
        grants: o.grants.filter((g) => g.project_id !== a.project_id),
      };
    case "archive":
    case "activate": {
      const status: ProjectStatus = a.action === "archive" ? "archived" : "active";
      return { ...o, projects: o.projects.map((p) => (p.id === a.project_id ? { ...p, status } : p)) };
    }
    case "transfer":
      return {
        ...o,
        projects: o.projects.map((p) => (p.id === a.project_id ? { ...p, created_by: a.new_owner_id } : p)),
      };
  }
}
