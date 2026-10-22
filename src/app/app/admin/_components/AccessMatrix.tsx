"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Matriz de acessos (usuários × projetos)
// Linhas: membros do workspace (com papel no workspace e remoção).
// Colunas: projetos. Célula: acesso efetivo — somente leitura para
// donos/admins do workspace e para o dono do projeto; Select para os
// demais. Primeira coluna e cabeçalho fixos; rolagem horizontal fica
// dentro do card (sem rolagem lateral da página).
// ─────────────────────────────────────────────────────────────
import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Crown, Loader2, Search, ShieldCheck, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { AccessMember, AccessOverview, AccessProject, WorkspaceRole } from "@/lib/access/types";
import { PROJECT_ROLE_LABEL } from "@/lib/access/types";
import {
  buildMatrix,
  callerContext,
  CELL_OPTIONS,
  cellValueToRole,
  memberDisplayName,
  ownerCount,
  workspaceRoleControl,
  type CellValue,
  type MatrixCell,
} from "../_lib/access-matrix";
import { cellKey, memberKey, type ProjectMemberInput } from "../_lib/useAccessAdmin";

interface AccessMatrixProps {
  overview: AccessOverview;
  pendingKeys?: Set<string>;
  onChangeProjectMember: (change: ProjectMemberInput) => unknown;
  onChangeWorkspaceRole: (userId: string, role: WorkspaceRole) => unknown;
  onRemoveMember: (userId: string) => unknown;
}

const CELL_VALUE_CLASS: Record<CellValue | "owner", string> = {
  none: "text-muted-foreground",
  viewer: "text-zinc-700 dark:text-zinc-300 bg-zinc-500/10",
  member: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
  admin: "text-purple-700 dark:text-purple-300 bg-purple-500/10",
  owner: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
};

const ROLE_BADGE_CLASS: Record<WorkspaceRole, string> = {
  owner: "text-blue-700 dark:text-blue-300 bg-blue-500/10",
  admin: "text-purple-700 dark:text-purple-300 bg-purple-500/10",
  member: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
  viewer: "text-zinc-700 dark:text-zinc-300 bg-zinc-500/10",
};

function initials(m: Pick<AccessMember, "full_name" | "email">): string {
  const name = memberDisplayName(m);
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AccessMatrix({
  overview,
  pendingKeys,
  onChangeProjectMember,
  onChangeWorkspaceRole,
  onRemoveMember,
}: AccessMatrixProps) {
  const [query, setQuery] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [removing, setRemoving] = React.useState<AccessMember | null>(null);

  const matrix = React.useMemo(
    () => buildMatrix(overview, { query, showArchived }),
    [overview, query, showArchived]
  );
  const caller = React.useMemo(() => callerContext(overview), [overview]);
  const owners = ownerCount(overview.members);
  const archivedCount = overview.projects.filter((p) => p.status === "archived").length;

  return (
    <div className="space-y-4">
      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar membro por nome ou e-mail"
            className="pl-9 h-9"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          Mostrar arquivados{archivedCount > 0 ? ` (${archivedCount})` : ""}
        </label>
        <span className="sm:ml-auto text-xs text-muted-foreground font-semibold" aria-live="polite">
          <strong className="text-foreground">{matrix.rows.length}</strong> de{" "}
          <strong className="text-foreground">{matrix.totalMembers}</strong> membros ·{" "}
          <strong className="text-foreground">{matrix.columns.length}</strong> projetos
        </span>
      </div>

      {matrix.columns.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {archivedCount > 0 && !showArchived
            ? "Todos os projetos deste workspace estão arquivados. Marque “Mostrar arquivados” para vê-los."
            : "Este workspace ainda não tem projetos."}
        </div>
      ) : (
        <div
          role="region"
          aria-label="Matriz de acessos: membros por projeto"
          tabIndex={0}
          className="relative max-h-[70vh] overflow-auto rounded-xl border border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Acesso de cada membro do workspace a cada projeto. Donos e admins do workspace acessam todos os
              projetos; o dono do projeto tem acesso total.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 min-w-[210px] sm:min-w-[260px] border-b border-r border-border/80 bg-card px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Membro
                </th>
                {matrix.columns.map(({ project, peopleWithAccess }) => (
                  <ProjectHeader key={project.id} project={project} peopleWithAccess={peopleWithAccess} />
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={matrix.columns.length + 1}
                    className="sticky left-0 px-3 py-8 text-left text-sm text-muted-foreground"
                  >
                    Nenhum membro encontrado para “{query}”.
                  </td>
                </tr>
              )}
              {matrix.rows.map(({ member, isSelf, cells }) => {
                const name = memberDisplayName(member);
                const control = workspaceRoleControl(caller, member, isSelf, owners);
                const memberPending = pendingKeys?.has(memberKey(member.user_id)) ?? false;
                return (
                  <tr key={member.user_id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-border/60 bg-card px-3 py-2.5 text-left font-normal align-top"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-bold text-foreground"
                          aria-hidden
                        >
                          {initials(member)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-semibold text-foreground max-w-[150px] sm:max-w-[170px]" title={name}>
                              {name}
                            </span>
                            {isSelf && (
                              <Badge variant="outline" className="border-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0 text-[10px]">
                                Você
                              </Badge>
                            )}
                            {member.is_master_admin && (
                              <Badge
                                variant="outline"
                                className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0 text-[10px] gap-0.5"
                                title="Master ADM: acesso total a todos os workspaces"
                              >
                                <ShieldCheck className="h-3 w-3" aria-hidden />
                                Master ADM
                              </Badge>
                            )}
                          </div>
                          {member.full_name?.trim() && (
                            <div className="truncate text-xs text-muted-foreground max-w-[180px] sm:max-w-[200px]" title={member.email}>
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span title={control.disabledReason ?? undefined}>
                          <Select
                            value={member.role}
                            onValueChange={(v) => onChangeWorkspaceRole(member.user_id, v as WorkspaceRole)}
                            disabled={!!control.disabledReason || memberPending}
                          >
                            <SelectTrigger
                              aria-label={`Papel de ${name} no workspace`}
                              title={control.disabledReason ?? undefined}
                              className={cn("h-8 w-[112px] text-xs font-semibold", ROLE_BADGE_CLASS[member.role])}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {control.options.map((o) => (
                                <SelectItem
                                  key={o.role}
                                  value={o.role}
                                  disabled={!!o.disabledReason}
                                  title={o.disabledReason ?? undefined}
                                >
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </span>
                        <span title={control.removeDisabledReason ?? "Remover do workspace"}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-500/10"
                            aria-label={`Remover ${name} do workspace`}
                            disabled={!!control.removeDisabledReason || memberPending}
                            onClick={() => setRemoving(member)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </span>
                        {memberPending && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Salvando" />
                        )}
                      </div>
                    </th>
                    {cells.map(({ project, cell }) => (
                      <td
                        key={project.id}
                        className="border-b border-border/60 px-2 py-2.5 align-middle group-hover:bg-muted/40"
                      >
                        <AccessCell
                          cell={cell}
                          memberName={name}
                          project={project}
                          pending={pendingKeys?.has(cellKey(project.id, member.user_id)) ?? false}
                          onChange={(value) =>
                            onChangeProjectMember({
                              project_id: project.id,
                              user_id: member.user_id,
                              role: cellValueToRole(value),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          <strong className="text-foreground">Admin (todos)</strong>: donos e admins do workspace acessam todos os projetos.
        </span>
        <span>
          <strong className="text-foreground">Dono</strong>: criador do projeto (mude na aba Projetos).
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          Papel Leitura no workspace: somente leitura em qualquer projeto.
        </span>
      </p>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remover do workspace?"
        description={
          removing
            ? `${memberDisplayName(removing)} perderá o acesso ao workspace “${overview.workspace.name}” e a todos os seus projetos. Para voltar, será preciso um novo convite.`
            : undefined
        }
        confirmText="Remover"
        variant="destructive"
        onConfirm={async () => {
          if (removing) await onRemoveMember(removing.user_id);
        }}
      />
    </div>
  );
}

function ProjectHeader({ project, peopleWithAccess }: { project: AccessProject; peopleWithAccess: number }) {
  const archived = project.status === "archived";
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-20 min-w-[140px] max-w-[180px] border-b border-border/80 bg-card px-2 py-2.5 text-left align-bottom font-normal",
        archived && "opacity-70"
      )}
    >
      <Link
        href={`/app/projects/${project.id}`}
        className="flex items-center gap-1.5 rounded-sm font-semibold text-foreground hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={project.name}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: project.color || "#3b82f6" }}
          aria-hidden
        />
        <span className="truncate max-w-[150px]">{project.name}</span>
      </Link>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {peopleWithAccess} com acesso{archived ? " · Arquivado" : ""}
      </div>
    </th>
  );
}

function AccessCell({
  cell,
  memberName,
  project,
  pending,
  onChange,
}: {
  cell: MatrixCell;
  memberName: string;
  project: AccessProject;
  pending: boolean;
  onChange: (value: CellValue) => void;
}) {
  if (cell.kind === "workspace-admin") {
    return (
      <span
        className="inline-flex h-8 items-center rounded-md bg-purple-500/10 px-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300"
        title={cell.reason}
      >
        {cell.label}
      </span>
    );
  }
  if (cell.kind === "owner") {
    return (
      <span
        className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
        title={cell.reason}
      >
        <Crown className="h-3.5 w-3.5" aria-hidden />
        {cell.label}
      </span>
    );
  }

  // Leitura no workspace anula papéis de edição no projeto
  const warn = cell.viewerWarning && (cell.value === "member" || cell.value === "admin");
  return (
    <div className="flex items-center gap-1">
      <span title={cell.disabledReason ?? undefined}>
        <Select
          value={cell.value}
          onValueChange={(v) => onChange(v as CellValue)}
          disabled={!!cell.disabledReason || pending}
        >
          <SelectTrigger
            aria-label={`Acesso de ${memberName} ao projeto ${project.name}`}
            title={cell.disabledReason ?? undefined}
            className={cn("h-8 w-[118px] text-xs font-semibold", CELL_VALUE_CLASS[cell.value])}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cell.value === "owner" && (
              <SelectItem value="owner" disabled>
                {PROJECT_ROLE_LABEL.owner}
              </SelectItem>
            )}
            {CELL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-label="Salvando" />
      ) : warn ? (
        <span
          className="shrink-0"
          title={`${memberName} tem papel Leitura no workspace: acesso somente leitura em todos os projetos, qualquer que seja o papel aqui.`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          <span className="sr-only">Papel Leitura no workspace: somente leitura</span>
        </span>
      ) : null}
    </div>
  );
}
