"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  CornerDownRight,
  UserPlus,
  MessageSquare,
  Paperclip,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  useData,
  type Task,
  type Stage,
  type TaskComment,
  type TaskAttachment,
} from "@/lib/context/DataContext";
import { createSPAClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { TaskCommentsSection } from "@/components/task-dialog/TaskCommentsSection";
import { TaskAttachmentsSection } from "@/components/task-dialog/TaskAttachmentsSection";
import { parseDurationToHours, formatHoursToHHMM, formatHoursBadge } from "@/lib/duration";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStageId?: string | null;
  defaultDueDate?: string | null;
  projectId?: string;
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

const DEFAULT_KANBAN_STAGES: Array<{ id: string; name: string; is_done: boolean }> = [
  { id: "todo", name: "A Fazer", is_done: false },
  { id: "in_progress", name: "Em Andamento", is_done: false },
  { id: "review", name: "Em Revisão", is_done: false },
  { id: "done", name: "Concluído", is_done: true },
];

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStageId,
  defaultDueDate,
  projectId,
}: TaskDialogProps) {
  const {
    createTask,
    updateTask,
    getProject,
    getStagesByProject,
    getTasksByProject,
    getTaskComments,
    addTaskComment,
    deleteTaskComment,
    getTaskAttachments,
    addTaskAttachment,
    deleteTaskAttachment,
  } = useData();
  const projectStages = useMemo<Stage[]>(
    () => (projectId ? getStagesByProject(projectId) : []),
    [projectId, getStagesByProject]
  );
  const stages = useMemo<Array<{ id: string; name: string; is_done?: boolean }>>(
    () => (projectStages.length > 0 ? projectStages : DEFAULT_KANBAN_STAGES),
    [projectStages]
  );
  const projectTasks = useMemo<Task[]>(
    () => (projectId ? getTasksByProject(projectId) : []),
    [projectId, getTasksByProject]
  );
  const isEdit = !!task;

  const currentProjectId = projectId || task?.project_id;
  const currentProject = currentProjectId ? getProject(currentProjectId) : undefined;
  const trackTime = currentProject ? currentProject.track_time !== false : true;

  // Evita auto-referência na lista de tarefas pai
  const parentTaskOptions = useMemo<Task[]>(
    () => projectTasks.filter((t: Task) => !isEdit || (t.id !== task?.id && t.parent_task_id !== task?.id)),
    [projectTasks, isEdit, task?.id]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [parentTaskId, setParentTaskId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [assigneeMode, setAssigneeMode] = useState<"member" | "custom">("member");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [assigneeStatus, setAssigneeStatus] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);

  // Rastreadores para inicializar o form apenas na abertura real (impede reset ao digitar)
  const prevOpenRef = useRef(false);
  const prevTaskIdRef = useRef<string | null>(null);

  // Abas
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "attachments">("details");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Carregar comentários e anexos
  const refreshComments = useCallback(async () => {
    if (task?.id) {
      const data = await getTaskComments(task.id);
      setComments(data);
    }
  }, [task?.id, getTaskComments]);

  const refreshAttachments = useCallback(async () => {
    if (task?.id) {
      const data = await getTaskAttachments(task.id);
      setAttachments(data);
    }
  }, [task?.id, getTaskAttachments]);

  useEffect(() => {
    if (open && task?.id) {
      refreshComments();
      refreshAttachments();
    } else {
      setActiveTab("details");
      setComments([]);
      setAttachments([]);
    }
  }, [open, task?.id, refreshComments, refreshAttachments]);

  // Carregar membros do workspace
  useEffect(() => {
    if (!open || !projectId) return;

    let isMounted = true;
    async function loadMembers() {
      try {
        const supabase = createSPAClient();
        const { data: proj } = await supabase
          .from("projects")
          .select("workspace_id")
          .eq("id", projectId!)
          .maybeSingle();

        const projData = proj as { workspace_id: string } | null;
        const fetchedWsId = projData?.workspace_id;
        if (!isMounted) return;
        setWorkspaceId(fetchedWsId ?? null);
        if (!fetchedWsId) {
          setAssignees([]);
          return;
        }

        const { data: members } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", fetchedWsId);

        const userIds = ((members as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
        if (!userIds.length) {
          if (isMounted) setAssignees([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
          .order("email");

        if (isMounted) {
          setAssignees((profiles as { id: string; email: string; full_name: string | null }[] | null) ?? []);
        }
      } catch (err) {
        console.error("[TaskDialog] error loading assignees:", err);
        if (isMounted) setAssignees([]);
      }
    }

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [open, projectId]);

  // Sincronizar campos do formulário (apenas na abertura real ou ao trocar de tarefa)
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      prevTaskIdRef.current = null;
      return;
    }

    const currentTaskId = task?.id ?? "new";
    const isNewlyOpened = !prevOpenRef.current;
    const isDifferentTask = currentTaskId !== prevTaskIdRef.current;

    // Se já estava aberto e é a mesma tarefa, NÃO reseta os campos enquanto o usuário digita
    if (!isNewlyOpened && !isDifferentTask) {
      return;
    }

    prevOpenRef.current = true;
    prevTaskIdRef.current = currentTaskId;

    if (task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
      setStageId(task.stage_id ?? "");
      setParentTaskId(task.parent_task_id ?? "");
      setPriority(task.priority ?? "medium");
      setProgress(task.progress ?? 0);
      setStartDate(task.start_date ? task.start_date.split("T")[0] : "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setEstimatedHours(task.estimated_hours != null ? formatHoursToHHMM(task.estimated_hours) : "");
      setActualHours(task.actual_hours != null ? formatHoursToHHMM(task.actual_hours) : "");

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
      setDueDate(defaultDueDate || "");
      setEstimatedHours("");
      setActualHours("");
      setAssigneeMode("member");
      setAssigneeId("");
      setAssigneeName(null);
      setAssigneeStatus(null);
    }
    setError("");

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, [open, task, defaultStageId, defaultDueDate, stages]);

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
          Promise.resolve(
            updateTask(task.id, { assignee_status: "invited" } as Record<string, unknown>)
          ).catch(console.error);
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

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isCompleted = progress === 100;
      let calculatedStatus: Task["status"] = task?.status ?? "todo";
      if (isCompleted) {
        calculatedStatus = "done";
      } else if (calculatedStatus === "done") {
        calculatedStatus = progress > 0 ? "in_progress" : "todo";
      }

      const parsedEst = parseDurationToHours(estimatedHours);
      const parsedAct = parseDurationToHours(actualHours);

      const taskData: Partial<Task> = {
        title: title.trim(),
        description: description.trim() || null,
        stage_id: stageId || null,
        parent_task_id: parentTaskId || null,
        priority,
        status: calculatedStatus,
        progress,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimated_hours: trackTime && parsedEst !== null && !isNaN(parsedEst) ? parsedEst : null,
        actual_hours: trackTime && parsedAct !== null && !isNaN(parsedAct) ? parsedAct : null,
        assignee_id: assigneeMode === "member" && assigneeId ? assigneeId : null,
        assignee_name: assigneeMode === "custom" && assigneeName ? assigneeName.trim() : null,
        assignee_status: assigneeStatus as Task["assignee_status"],
      };

      if (isEdit && task) {
        await updateTask(task.id, taskData);
      } else {
        if (!projectId) {
          setError("Projeto não identificado para criação da tarefa");
          setLoading(false);
          return;
        }
        await createTask({
          ...taskData,
          project_id: projectId,
        });
      }

      onOpenChange(false);
    } catch (err: unknown) {
      console.error("[TaskDialog] submit error:", err);
      setError("Erro ao salvar tarefa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden h-[92vh] sm:h-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Tab Navigation (Apenas em Edição) */}
        {isEdit && (
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto justify-start flex-nowrap scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-background rounded-t-lg shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Dados da Tarefa
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "comments"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-background rounded-t-lg shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comentários ({comments.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attachments")}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "attachments"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-background rounded-t-lg shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Anexos ({attachments.length})
            </button>
          </div>
        )}

        {/* ABA 💬 COMENTÁRIOS */}
        {activeTab === "comments" && task && (
          <TaskCommentsSection
            taskId={task.id}
            comments={comments}
            onRefresh={refreshComments}
            addTaskComment={addTaskComment}
            deleteTaskComment={deleteTaskComment}
          />
        )}

        {/* ABA 📎 ANEXOS */}
        {activeTab === "attachments" && task && (
          <TaskAttachmentsSection
            taskId={task.id}
            attachments={attachments}
            onRefresh={refreshAttachments}
            addTaskAttachment={addTaskAttachment}
            deleteTaskAttachment={deleteTaskAttachment}
          />
        )}

        {/* ABA 📋 DADOS DA TAREFA */}
        {activeTab === "details" && (
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
                className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground dark:text-zinc-100 px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all font-medium"
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
                className="flex min-h-[90px] w-full rounded-xl border border-input bg-background text-foreground dark:text-zinc-100 px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all resize-none leading-relaxed font-medium"
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
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all cursor-pointer"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100 dark:bg-zinc-900 dark:text-zinc-100">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsável */}
              <div className="space-y-2 col-span-1 sm:col-span-2 border border-border/60 p-3.5 rounded-2xl bg-muted/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCircle2 className="h-3.5 w-3.5 text-blue-500" />
                    Responsável pela Tarefa
                  </label>

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

              {/* Vinculação de Sub-tarefa (WBS) */}
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

            {/* Prioridade */}
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

            {/* Datas & Carga de Trabalho Grid */}
            <div className={`grid grid-cols-1 ${trackTime ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
              <div className="space-y-1.5">
                <label htmlFor="task-start" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Data Início
                </label>
                <DatePicker
                  id="task-start"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  placeholder="Início"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="task-due" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Prazo Final
                </label>
                <DatePicker
                  id="task-due"
                  value={dueDate}
                  onChange={(val) => setDueDate(val)}
                  placeholder="Prazo"
                />
              </div>
              {trackTime && (
                <div className="space-y-1.5">
                  <label htmlFor="task-estimated-hours" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Horas Est.
                  </label>
                  <div className="relative">
                    <input
                      id="task-estimated-hours"
                      type="text"
                      autoComplete="off"
                      value={estimatedHours}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9:hmHM.,\s]/g, "");
                        setEstimatedHours(val);
                      }}
                      onBlur={() => {
                        if (estimatedHours.trim()) {
                          const parsed = parseDurationToHours(estimatedHours);
                          if (parsed !== null) {
                            setEstimatedHours(formatHoursToHHMM(parsed));
                          }
                        }
                      }}
                      placeholder="ex: 36h:25m ou 08:00"
                      className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground dark:text-zinc-100 pl-3.5 pr-16 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono font-medium transition-all shadow-xs"
                    />
                    <span className="absolute right-3 top-3 text-[11px] text-muted-foreground font-mono font-semibold pointer-events-none select-none">
                      HH:MM
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Slider de Progresso */}
            <div className="space-y-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                  Progresso da Tarefa
                </span>
                <div className="flex items-center gap-2">
                  {progress < 100 ? (
                    <button
                      type="button"
                      onClick={() => setProgress(100)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-emerald-500/20 shadow-xs cursor-pointer"
                      title="Marcar tarefa como 100% concluída"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Concluir (100%)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProgress(90)}
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg transition-colors border border-border/60 cursor-pointer"
                      title="Reabrir tarefa em andamento"
                    >
                      Reabrir Tarefa
                    </button>
                  )}
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                    {progress}%
                  </span>
                </div>
              </div>

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
                id="task-progress-slider"
                name="task-progress-slider"
                aria-label="Progresso da tarefa em porcentagem"
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
                  {trackTime ? "Concluída — informe abaixo as horas reais gastas" : "Tarefa Concluída"}
                </p>
              )}
            </div>

            {/* Bloco de Horas Reais Gastas (Ativado na Conclusão da Tarefa) */}
            {trackTime && (progress === 100 || stages.find((s) => s.id === stageId)?.is_done || task?.status === "done") && (
              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="task-actual-hours"
                    className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Horas Reais Gastas (Execução)
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    Tarefa Concluída 🎉
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Informe a quantidade de horas que foram efetivamente trabalhadas nesta atividade para apuração real de carga e prazos.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative w-full sm:w-56">
                    <input
                      id="task-actual-hours"
                      type="text"
                      autoComplete="off"
                      placeholder="ex: 36h:25m ou 08:00"
                      value={actualHours}
                      onChange={(e) => setActualHours(e.target.value.replace(/[^0-9:hmHM.,\s]/g, ""))}
                      onBlur={() => {
                        if (actualHours.trim()) {
                          const parsed = parseDurationToHours(actualHours);
                          if (parsed !== null) {
                            setActualHours(formatHoursToHHMM(parsed));
                          }
                        }
                      }}
                      className="flex h-11 w-full rounded-xl border border-emerald-500/50 bg-background text-foreground dark:text-zinc-100 pl-3.5 pr-16 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-mono font-semibold transition-all shadow-xs"
                    />
                    <span className="absolute right-3 top-3 text-[11px] text-muted-foreground font-mono font-semibold pointer-events-none select-none">
                      HH:MM
                    </span>
                  </div>

                  {estimatedHours.trim() && !actualHours && (
                    <button
                      type="button"
                      onClick={() => setActualHours(estimatedHours)}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 self-start sm:self-center cursor-pointer"
                    >
                      Copiar horas estimadas ({estimatedHours})
                    </button>
                  )}

                  {(() => {
                    const est = parseDurationToHours(estimatedHours);
                    const act = parseDurationToHours(actualHours);
                    if (est !== null && act !== null && est > 0 && act > 0) {
                      const diff = act - est;
                      const pct = Math.round(((act - est) / est) * 100);
                      const diffFormatted = formatHoursBadge(Math.abs(diff));
                      if (diff === 0) {
                        return (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                            ✓ Concluído exatamente no tempo estimado!
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                            🚀 {diffFormatted} a menos que o estimado ({Math.abs(pct)}% economia)
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                            ⏱️ +{diffFormatted} a mais que o estimado (+{pct}%)
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}

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
        )}
      </div>
    </div>
  );
}