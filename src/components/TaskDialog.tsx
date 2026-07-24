"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserCircle2, AlertTriangle } from "lucide-react";
import { useData, type Task } from "@/lib/context/DataContext";
import { createSPAClient } from "@/lib/supabase/client";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStageId?: string | null;
  projectId: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStageId,
  projectId,
}: TaskDialogProps) {
  const { createTask, updateTask, getStagesByProject } = useData();
  const stages = getStagesByProject(projectId);
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [assigneeStatus, setAssigneeStatus] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);

  // Convidar responsável pendente por email
  async function handleInvite() {
    if (!assigneeName || !workspaceId) return;
    setInviting(true);
    try {
      const emailOrName = assigneeName.trim();
      // Tenta descobrir se é email ou nome
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
        // Atualiza no banco também
        const { updateTask } = useData?.() ?? {};
        if (task?.id && updateTask) {
          updateTask(task.id, { assignee_status: "invited" } as Record<string, unknown>).catch(console.error);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao enviar convite");
      }
    } catch (e) {
      setError("Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  }
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset state quando abrir/fechar ou trocar task
  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
      setStageId(task.stage_id ?? "");
      setPriority(task.priority ?? "medium");
      setProgress(task.progress ?? 0);
      setStartDate(task.start_date ? task.start_date.split("T")[0] : "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setAssigneeId((task as unknown as { assignee_id?: string | null }).assignee_id ?? "");
      setAssigneeName(task.assignee_name ?? null);
      setAssigneeStatus(task.assignee_status ?? null);
    } else {
      setTitle("");
      setDescription("");
      setStageId(defaultStageId ?? stages[0]?.id ?? "");
      setPriority("medium");
      setProgress(0);
      setStartDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
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

    // Foco no título após abrir (timeout pra garantir que DOM renderizou)
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
      const data = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        stage_id: stageId || null,
        priority,
        progress,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        // Fecha só se clicou no overlay (não no conteúdo)
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4">
          <h2 id="task-dialog-title" className="text-lg font-semibold">
            {isEdit ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isEdit
              ? "Atualize os detalhes da tarefa."
              : "Adicione uma nova tarefa ao projeto."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-medium">
              Título *
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              placeholder="Ex: Implementar autenticação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="task-desc" className="text-sm font-medium">
              Descrição
            </label>
            <textarea
              id="task-desc"
              placeholder="Detalhes, critérios de aceite, links úteis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="task-stage" className="text-sm font-medium">
                Etapa
              </label>
              <select
                id="task-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 col-span-2">
              <label htmlFor="task-assignee" className="text-sm font-medium flex items-center gap-1.5">
                <UserCircle2 className="h-3.5 w-3.5" />
                Responsável
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={assignees.length === 0}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
              >
                <option value="">— Sem responsável —</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
              </select>
              {assignees.length === 0 && (
                <p className="text-xs text-slate-500">Nenhum membro encontrado neste workspace.</p>
              )}
              {/* Badge pendente: responsável não-cadastrado no workspace */}
              {assigneeStatus === "pending" && assigneeName && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Pendente: <strong>{assigneeName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviting}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                    {inviting ? "Enviando..." : `Convidar ${assigneeName.split(" ")[0]}`}
                  </button>
                </div>
              )}
              {assigneeStatus === "invited" && (
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                  Convite pendente de aceite
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="task-priority" className="text-sm font-medium">
                Prioridade
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <option value="low">⬇️ Baixa</option>
                <option value="medium">➡️ Média</option>
                <option value="high">⬆️ Alta</option>
                <option value="critical">🔥 Crítica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="task-start" className="text-sm font-medium">
                Início
              </label>
              <input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="task-due" className="text-sm font-medium">
                Prazo
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              <span>Progresso</span>
              <span className="text-amber-600 font-semibold">{progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            {progress === 100 && (
              <p className="text-xs text-emerald-600">✅ Tarefa será marcada como concluída</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 px-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 rounded-md bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 text-sm font-medium"
            >
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}