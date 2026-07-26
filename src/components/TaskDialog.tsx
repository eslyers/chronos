"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  UserCircle2,
  AlertTriangle,
  FileText,
  AlignLeft,
  KanbanSquare,
  Flag,
  Calendar,
  BarChart3,
  CheckCircle2,
  Send,
  Loader2,
  Sparkles,
  CornerDownRight,
  UserPlus,
} from "lucide-react";
import { useData, type Task } from "@/lib/context/DataContext";
import { createSPAClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStageId?: string | null;
  projectId: string;
}

const PRIORITIES = [
  {
    value: "low",
    label: "Baixa",
    icon: "⬇️",
    activeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40 ring-1 ring-slate-400/50",
    hoverClass: "hover:bg-slate-500/10 hover:border-slate-300",
  },
  {
    value: "medium",
    label: "Média",
    icon: "➡️",
    activeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/40 ring-1 ring-blue-400/50",
    hoverClass: "hover:bg-blue-500/10 hover:border-blue-300",
  },
  {
    value: "high",
    label: "Alta",
    icon: "⬆️",
    activeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40 ring-1 ring-amber-400/50",
    hoverClass: "hover:bg-amber-500/10 hover:border-amber-300",
  },
  {
    value: "critical",
    label: "Crítica",
    icon: "🔥",
    activeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/40 ring-1 ring-red-400/50",
    hoverClass: "hover:bg-red-500/10 hover:border-red-300",
  },
] as const;

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStageId,
  projectId,
}: TaskDialogProps) {
  const { createTask, updateTask, getStagesByProject, getTasksByProject } = useData();
  const stages = getStagesByProject(projectId);
  const projectTasks = getTasksByProject(projectId);
  const isEdit = !!task;

  // Evita auto-referência na lista de tarefas pai
  const parentTaskOptions = projectTasks.filter(
    (t) => !isEdit || (t.id !== task?.id && t.parent_task_id !== task?.id)
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [parentTaskId, setParentTaskId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeMode, setAssigneeMode] = useState<"member" | "custom">("member");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [assigneeStatus, setAssigneeStatus] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

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
        setAssigneeStatus("invited");
        if (task?.id && updateTask) {
          updateTask(task.id, { assignee_status: "invited" } as Record<string, unknown>).catch(console.error);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao enviar convite");
      }
    } catch {
      setError("Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  }

  // Reset state quando abrir/fechar ou trocar task
  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
      setStageId(task.stage_id ?? "");
      setParentTaskId(task.parent_task_id ?? "");
      setPriority(task.priority ?? "medium");
      setProgress(task.progress ?? 0);
      setStartDate(task.start_date ? task.start_date.split("T")[0] : "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      
      const currentAssigneeId = (task as unknown as { assignee_id?: string | null }).assignee_id ?? "";
      const currentAssigneeName = task.assignee_name ?? null;

      if (currentAssigneeId) {
        setAssigneeMode("member");
        setAssigneeId(currentAssigneeId);
        setAssigneeName(currentAssigneeName);
      } else if (currentAssigneeName) {
        setAssigneeMode("custom");
        setAssigneeId("");
        setAssigneeName(currentAssigneeName);
      } else {
        setAssigneeMode("member");
        setAssigneeId("");
        setAssigneeName(null);
      }

      setAssigneeStatus(task.assignee_status ?? null);
    } else {
      setTitle("");
      setDescription("");
      setStageId(defaultStageId ?? stages[0]?.id ?? "");
      setParentTaskId("");
      setPriority("medium");
      setProgress(0);
      setStartDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setAssigneeMode("member");
      setAssigneeId("");
      setAssigneeName(null);
      setAssigneeStatus(null);
    }
    setError("");

    // Carregar assignees uma vez por projeto
    const supabase = createSPAClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectsClient = supabase.from("projects") as any;
    projectsClient
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data: proj }: { data: { workspace_id: string } | null }) => {
        const fetchedWsId = proj?.workspace_id;
        setWorkspaceId(fetchedWsId ?? null);
        if (!fetchedWsId) {
          setAssignees([]);
          return;
        }
        return supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", fetchedWsId);
      })
      .then((res: { data: { user_id: string }[] | null } | undefined) => {
        if (!res) return;
        const members = (res.data || []) as { user_id: string }[];
        const userIds = members.map((m) => m.user_id);
        if (!userIds.length) {
          setAssignees([]);
          return;
        }
        return supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
          .order("email");
      })
      .then((res: { data: { id: string; email: string; full_name: string | null }[] | null } | undefined) => {
        if (!res) return;
        setAssignees((res.data || []) as { id: string; email: string; full_name: string | null }[]);
      })
      .catch(() => setAssignees([]));

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, [open, task?.id, projectId]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Bloquear scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Título da tarefa é obrigatório");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const selectedMember = assignees.find((a) => a.id === assigneeId);
      const finalAssigneeName =
        assigneeMode === "custom"
          ? assigneeName?.trim() || null
          : selectedMember
          ? selectedMember.full_name || selectedMember.email
          : assigneeName || null;

      const data = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        stage_id: stageId || null,
        parent_task_id: parentTaskId || null,
        priority,
        progress,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeMode === "member" ? assigneeId || null : null,
        assignee_name: finalAssigneeName,
        assignee_status: assigneeMode === "custom" && finalAssigneeName ? ((assigneeStatus as "invited" | "pending") || "pending") : null,
      };

      if (isEdit && task) {
        await updateTask(task.id, data);
      } else {
        await createTask(data);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header estilo executivo */}
        <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-6 shrink-0 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-sm shrink-0">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  {isEdit ? "Edição de Entregável" : "Novo Entregável"}
                </span>
              </div>
              <h2 id="task-dialog-title" className="text-xl font-bold leading-tight mt-0.5">
                {isEdit ? "Editar Tarefa" : "Criar Nova Tarefa"}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-6 space-y-5 overflow-y-auto flex-1"
        >
          {/* Título */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Título <span className="text-destructive">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              placeholder="Ex: Desenvolver fluxo de relatórios financeiros"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all font-medium"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5 text-blue-500" />
              Descrição
            </label>
            <textarea
              id="task-desc"
              placeholder="Detalhes operacionais, critérios de aceite, links de apoio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[90px] w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Etapa & Responsável Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Etapa */}
            <div className="space-y-1.5">
              <label htmlFor="task-stage" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <KanbanSquare className="h-3.5 w-3.5 text-blue-500" />
                Etapa do Kanban
              </label>
              <select
                id="task-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável Híbrido (Membro Cadastrado ou Externo sem Cadastro) */}
            <div className="space-y-2 col-span-1 sm:col-span-2 border border-border/60 p-3.5 rounded-2xl bg-muted/20">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  Responsável pela Tarefa
                </label>

                {/* Alternador de Modo: Cadastrado x Sem Cadastro */}
                <button
                  type="button"
                  onClick={() => {
                    setAssigneeMode((prev) => (prev === "member" ? "custom" : "member"));
                    if (assigneeMode === "member") {
                      setAssigneeId("");
                    }
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
                >
                  {assigneeMode === "member" ? (
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

              {assigneeMode === "member" ? (
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setAssigneeId(selectedId);
                    const member = assignees.find((a) => a.id === selectedId);
                    setAssigneeName(member ? (member.full_name || member.email) : null);
                    setAssigneeStatus(null);
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
                >
                  <option value="">— Sem responsável atribuído —</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      👤 {a.full_name ? `${a.full_name} (${a.email})` : a.email}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={assigneeName || ""}
                    onChange={(e) => {
                      setAssigneeName(e.target.value);
                      setAssigneeId("");
                      setAssigneeStatus("pending");
                    }}
                    placeholder="Digite o nome ou e-mail ex: Roberto de Oliveira ou roberto@empresa.com"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    💡 Atribua a tarefa imediatamente a qualquer pessoa. O nome aparecerá no Kanban e no Cronograma.
                  </p>
                </div>
              )}
            </div>

            {/* Vinculação de Sub-tarefa (Tarefa Pai) */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2">
              <label htmlFor="task-parent" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CornerDownRight className="h-3.5 w-3.5 text-blue-500" />
                Estrutura WBS: Vincular como Sub-tarefa de
              </label>
              <select
                id="task-parent"
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
              >
                <option value="">— Nenhuma (Tarefa Principal / Raiz) —</option>
                {parentTaskOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    📋 {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Badge de Responsável Pendente de Convite */}
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
                onClick={handleInvite}
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

          {/* Prioridade — Seletor Visual com Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-blue-500" />
              Nível de Prioridade
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as typeof priority)}
                    className={`
                      flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-xs font-semibold
                      border transition-all duration-150
                      ${isSelected ? p.activeClass : `border-input bg-background text-muted-foreground ${p.hoverClass}`}
                    `}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Datas Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="task-start" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Data de Início
              </label>
              <DatePicker
                id="task-start"
                value={startDate}
                onChange={(val) => setStartDate(val)}
                placeholder="Selecione início"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-due" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Data Limite (Prazo)
              </label>
              <DatePicker
                id="task-due"
                value={dueDate}
                onChange={(val) => setDueDate(val)}
                placeholder="Selecione prazo"
              />
            </div>
          </div>

          {/* Slider de Progresso */}
          <div className="space-y-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                Progresso da Tarefa
              </span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                {progress}%
              </span>
            </div>

            {/* Barra visual de preenchimento */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress === 100
                    ? "bg-emerald-500"
                    : progress > 50
                    ? "bg-blue-500"
                    : "bg-blue-400"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            {progress === 100 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluída — ao salvar a tarefa será marcada como entregue
              </p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-11 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEdit ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Criar Tarefa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}