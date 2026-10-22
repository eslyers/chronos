"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Aba "Projetos" da administração
// Status, dono (transferência com confirmação), pessoas com acesso,
// arquivar/reativar e excluir (com confirmação por nome).
// ─────────────────────────────────────────────────────────────
import * as React from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Loader2, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { canManageWorkspace } from "@/lib/access/rules";
import type { AccessOverview, AccessProject, ProjectStatus } from "@/lib/access/types";
import {
  callerContext,
  countPeopleWithAccess,
  memberDisplayName,
  normalizeSearch,
  ownerOptions,
  PROJECT_STATUS_LABEL,
} from "../_lib/access-matrix";
import { projectKey, type ProjectActionInput } from "../_lib/useAccessAdmin";
import { DeleteProjectDialog } from "./DeleteProjectDialog";

const STATUS_CLASS: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  on_hold: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  archived: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

/** Valor do Select de dono para projetos sem dono (Radix não aceita ""). */
const NO_OWNER = "__sem_dono__";

interface ProjectsTableProps {
  overview: AccessOverview;
  pendingKeys?: Set<string>;
  onAction: (action: ProjectActionInput) => Promise<boolean>;
}

export function ProjectsTable({ overview, pendingKeys, onAction }: ProjectsTableProps) {
  const [query, setQuery] = React.useState("");
  const [transfer, setTransfer] = React.useState<{ project: AccessProject; newOwnerId: string } | null>(null);
  const [deleting, setDeleting] = React.useState<AccessProject | null>(null);
  const caller = React.useMemo(() => callerContext(overview), [overview]);
  const canManage = canManageWorkspace(caller);

  const memberName = React.useCallback(
    (userId: string | null) => {
      const m = overview.members.find((x) => x.user_id === userId);
      return m ? memberDisplayName(m) : null;
    },
    [overview.members]
  );

  // Arquivados por último; dentro de cada grupo, ordem alfabética
  const projects = React.useMemo(() => {
    const q = normalizeSearch(query);
    return overview.projects
      .filter((p) => !q || normalizeSearch(p.name).includes(q))
      .sort(
        (a, b) =>
          Number(a.status === "archived") - Number(b.status === "archived") ||
          a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      );
  }, [overview.projects, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projeto"
            aria-label="Buscar projeto por nome"
            className="pl-9 h-9"
          />
        </div>
        <span className="sm:ml-auto text-xs text-muted-foreground font-semibold" aria-live="polite">
          <strong className="text-foreground">{projects.length}</strong> de{" "}
          <strong className="text-foreground">{overview.projects.length}</strong> projetos
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Projetos do workspace {overview.workspace.name}</caption>
          <thead className="bg-muted/30">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">Projeto</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-3 py-2.5">Dono</th>
              <th scope="col" className="px-3 py-2.5 text-right">Pessoas com acesso</th>
              <th scope="col" className="px-4 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {overview.projects.length === 0 ? "Este workspace ainda não tem projetos." : `Nenhum projeto encontrado para “${query}”.`}
                </td>
              </tr>
            )}
            {projects.map((project) => {
              const archived = project.status === "archived";
              const pending = pendingKeys?.has(projectKey(project.id)) ?? false;
              const options = ownerOptions(caller, project, overview.members);
              const ownerKnown = options.some((o) => o.user_id === project.created_by);
              const people = countPeopleWithAccess(project, overview.members, overview.grants);
              return (
                <tr key={project.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="inline-flex items-center gap-2 rounded-sm font-semibold text-foreground hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color || "#3b82f6" }}
                        aria-hidden
                      />
                      <span className="truncate max-w-[260px]" title={project.name}>{project.name}</span>
                    </Link>
                  </th>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={cn("text-[11px] font-semibold", STATUS_CLASS[project.status])}>
                      {PROJECT_STATUS_LABEL[project.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={project.created_by && ownerKnown ? project.created_by : NO_OWNER}
                      onValueChange={(v) => {
                        if (v !== NO_OWNER && v !== project.created_by) setTransfer({ project, newOwnerId: v });
                      }}
                      disabled={!canManage || pending}
                    >
                      <SelectTrigger aria-label={`Dono do projeto ${project.name}`} className="h-8 w-[200px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!ownerKnown && (
                          <SelectItem value={NO_OWNER} disabled>
                            {project.created_by ? "Ex-membro do workspace" : "Sem dono"}
                          </SelectItem>
                        )}
                        {options.map((o) => (
                          <SelectItem key={o.user_id} value={o.user_id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{people}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Salvando" />}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs border-border/80"
                        disabled={!canManage || pending}
                        aria-label={`${archived ? "Reativar" : "Arquivar"} o projeto ${project.name}`}
                        onClick={() =>
                          onAction({ project_id: project.id, action: archived ? "activate" : "archive" })
                        }
                      >
                        {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        {archived ? "Reativar" : "Arquivar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs border-border/80 text-destructive hover:bg-red-500/10 hover:text-destructive"
                        disabled={!canManage || pending}
                        aria-label={`Excluir o projeto ${project.name}`}
                        onClick={() => setDeleting(project)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!transfer}
        onOpenChange={(open) => !open && setTransfer(null)}
        title="Transferir projeto?"
        description={
          transfer
            ? `${memberName(transfer.newOwnerId) ?? "O membro escolhido"} passará a ser o dono de “${transfer.project.name}”, com acesso total ao projeto${
                memberName(transfer.project.created_by)
                  ? `, no lugar de ${memberName(transfer.project.created_by)}`
                  : ""
              }.`
            : undefined
        }
        confirmText="Transferir"
        onConfirm={async () => {
          if (transfer) {
            await onAction({
              project_id: transfer.project.id,
              action: "transfer",
              new_owner_id: transfer.newOwnerId,
            });
          }
        }}
      />

      <DeleteProjectDialog
        project={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={(projectId) => onAction({ project_id: projectId, action: "delete" })}
      />
    </div>
  );
}
