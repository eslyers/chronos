"use client";

import { UserCircle2, UserPlus, AlertTriangle, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssigneeMode } from "./task-form";
import type { WorkspaceAssignee } from "./useWorkspaceAssignees";

interface AssigneeFieldProps {
  mode: AssigneeMode;
  assigneeId: string;
  assigneeName: string | null;
  assignees: WorkspaceAssignee[];
  onToggleMode: () => void;
  onSelectMember: (assigneeId: string) => void;
  onExternalNameChange: (name: string) => void;
}

// Responsável: membro do workspace (Select) ou pessoa externa (nome / e-mail livre)
export function AssigneeField({
  mode,
  assigneeId,
  assigneeName,
  assignees,
  onToggleMode,
  onSelectMember,
  onExternalNameChange,
}: AssigneeFieldProps) {
  return (
    <div className="space-y-2 col-span-1 sm:col-span-2 border border-border/60 p-3.5 rounded-2xl bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label
          htmlFor={mode === "member" ? "task-assignee" : "task-assignee-name"}
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <UserCircle2 className="h-3.5 w-3.5 text-blue-500" />
          Responsável pela Tarefa
        </label>

        <button
          type="button"
          onClick={onToggleMode}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
        >
          {mode === "member" ? (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              Sem cadastro? Digitar nome / e-mail
            </>
          ) : (
            <>
              <UserCircle2 className="h-3.5 w-3.5" />
              Escolher membro do Workspace
            </>
          )}
        </button>
      </div>

      {mode === "member" ? (
        <Select
          value={assigneeId || "unassigned"}
          onValueChange={(val) => onSelectMember(val === "unassigned" ? "" : val)}
        >
          <SelectTrigger id="task-assignee" className="h-10 rounded-xl bg-background border-border/80">
            <SelectValue placeholder="Selecione o responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">— Sem responsável atribuído —</span>
            </SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{a.full_name ? `${a.full_name} (${a.email})` : a.email}</span>
                </div>
              </SelectItem>
            ))}
            {/* Responsável atual fora da lista (membros ainda carregando ou removido do
                workspace): mantém a opção para o gatilho não ficar em branco */}
            {assigneeId && !assignees.some((a) => a.id === assigneeId) && (
              <SelectItem value={assigneeId}>
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground">Responsável atual (fora do workspace)</span>
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-1.5">
          <input
            id="task-assignee-name"
            aria-label="Nome ou e-mail do responsável externo"
            type="text"
            value={assigneeName || ""}
            onChange={(e) => onExternalNameChange(e.target.value)}
            placeholder="Digite o nome ou e-mail ex: Roberto de Oliveira ou roberto@empresa.com"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
          />
          <p className="text-[11px] text-muted-foreground">
            💡 Atribua a tarefa imediatamente a qualquer pessoa. O nome aparecerá no Kanban e no Cronograma.
          </p>
        </div>
      )}
    </div>
  );
}

interface AssigneeInviteBannerProps {
  assigneeName: string | null;
  assigneeStatus: string | null;
  inviting: boolean;
  onInvite: () => void;
}

// Badge de responsável externo pendente de convite / convite já enviado
export function AssigneeInviteBanner({ assigneeName, assigneeStatus, inviting, onInvite }: AssigneeInviteBannerProps) {
  return (
    <>
      {assigneeStatus === "pending" && assigneeName && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Responsável externo: <strong>{assigneeName}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onInvite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-300 disabled:opacity-50 transition-colors shrink-0"
          >
            {inviting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {inviting ? "Enviando..." : "Convidar"}
          </button>
        </div>
      )}
      {assigneeStatus === "invited" && (
        <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Convite enviado por e-mail (aguardando aceite)</span>
        </div>
      )}
    </>
  );
}
