"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AlertTriangle, FileText, AlignLeft, KanbanSquare, Calendar, Clock } from "lucide-react";
import { useData, type Task, type Stage } from "@/lib/context/DataContext";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TaskCommentsSection } from "@/components/task-dialog/TaskCommentsSection";
import { TaskAttachmentsSection } from "@/components/task-dialog/TaskAttachmentsSection";
import { TaskDialogHeader, TaskDialogFooter } from "@/components/task-dialog/TaskDialogHeader";
import { TaskDialogTabs } from "@/components/task-dialog/TaskDialogTabs";
import { AssigneeField, AssigneeInviteBanner } from "@/components/task-dialog/AssigneeField";
import { ParentTaskField } from "@/components/task-dialog/ParentTaskField";
import { PrioritySelector } from "@/components/task-dialog/PrioritySelector";
import { DurationInput } from "@/components/task-dialog/DurationInput";
import { ProgressField } from "@/components/task-dialog/ProgressField";
import { ActualHoursPanel } from "@/components/task-dialog/ActualHoursPanel";
import { useTaskForm } from "@/components/task-dialog/useTaskForm";
import { useTaskActivity } from "@/components/task-dialog/useTaskActivity";
import { useWorkspaceAssignees } from "@/components/task-dialog/useWorkspaceAssignees";
import { useAssigneeInvite } from "@/components/task-dialog/useAssigneeInvite";
import { buildTaskPayload } from "@/components/task-dialog/task-form";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStageId?: string | null;
  defaultDueDate?: string | null;
  projectId?: string;
}

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
    addTaskComment,
    deleteTaskComment,
    addTaskAttachment,
    deleteTaskAttachment,
    isProjectLoaded,
    loadProjectDetails,
  } = useData();
  // Aberto de uma visão "Todos" o projectId vem vazio: o projeto é o da própria tarefa
  const currentProjectId = projectId ?? task?.project_id;
  // Só etapas reais do projeto (nunca ids fictícios como "todo"/"in_progress")
  const stages = useMemo<Stage[]>(
    () => (currentProjectId ? getStagesByProject(currentProjectId) : []),
    [currentProjectId, getStagesByProject]
  );
  const projectTasks = useMemo<Task[]>(
    () => (currentProjectId ? getTasksByProject(currentProjectId) : []),
    [currentProjectId, getTasksByProject]
  );
  const isEdit = !!task;

  const currentProject = currentProjectId ? getProject(currentProjectId) : undefined;
  const trackTime = currentProject ? currentProject.track_time !== false : true;

  // Evita auto-referência na lista de tarefas pai
  const parentTaskOptions = useMemo<Task[]>(
    () => projectTasks.filter((t: Task) => !isEdit || (t.id !== task?.id && t.parent_task_id !== task?.id)),
    [projectTasks, isEdit, task?.id]
  );

  const [loading, setLoading] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Abas + comentários e anexos
  const { activeTab, setActiveTab, comments, attachments, refreshComments, refreshAttachments } =
    useTaskActivity(open, task?.id);

  // Garante etapas/tarefas do projeto em memória (visões globais carregam sob demanda)
  useEffect(() => {
    if (!open || !currentProjectId || isProjectLoaded(currentProjectId)) return;
    loadProjectDetails(currentProjectId).catch((err) =>
      console.error("[TaskDialog] error loading project details:", err)
    );
  }, [open, currentProjectId, isProjectLoaded, loadProjectDetails]);

  // Membros do workspace
  const { assignees, workspaceId } = useWorkspaceAssignees(open, currentProjectId);

  const { form, dispatch, setField } = useTaskForm({
    open,
    task,
    defaultStageId,
    defaultDueDate,
    stages,
    titleInputRef,
  });

  const { inviting, handleInvite } = useAssigneeInvite({
    assigneeName: form.assigneeName,
    workspaceId,
    onInvited: () => setField("assigneeStatus", "invited"),
    onError: (message) => setField("error", message),
  });

  async function handleSubmit() {
    if (!form.title.trim()) {
      setField("error", "Título é obrigatório");
      return;
    }

    setLoading(true);
    setField("error", "");

    try {
      const taskData = buildTaskPayload(form, { task, stages, trackTime });

      if (isEdit && task) {
        await updateTask(task.id, taskData);
      } else {
        if (!currentProjectId) {
          setField("error", "Projeto não identificado para criação da tarefa");
          return;
        }
        await createTask({
          ...taskData,
          project_id: currentProjectId,
        });
      }

      // Fecha só depois de salvar com sucesso
      onOpenChange(false);
    } catch (err: unknown) {
      // O DataContext já exibiu o toast com o motivo; mantém o formulário aberto
      console.error("[TaskDialog] submit error:", err);
      setField("error", "Não foi possível salvar a tarefa. Revise os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // Bloco de horas reais aparece na conclusão (progresso 100%, etapa final ou status concluído)
  const showActualHours =
    trackTime && (form.progress === 100 || stages.find((s) => s.id === form.stageId)?.is_done || task?.status === "done");

  // Radix Dialog: Esc/clique fora respeitam camadas (um Select ou DatePicker aberto
  // fecha só ele), foco preso no modal e devolvido ao gatilho ao fechar
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        overlayClassName="bg-black/60 backdrop-blur-xs"
        // Formulário: clique fora não descarta o que foi digitado (só Esc / Cancelar / X)
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleInputRef.current?.focus();
        }}
        className="flex flex-col gap-0 p-0 w-full max-w-none sm:max-w-lg bg-card border-border rounded-t-2xl rounded-b-none sm:rounded-2xl shadow-2xl overflow-hidden h-[92vh] sm:h-auto max-h-[92vh] sm:max-h-[90vh] top-auto bottom-0 translate-y-0 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]"
      >
        <TaskDialogHeader isEdit={isEdit} onClose={() => onOpenChange(false)} />

        {/* Tab Navigation (Apenas em Edição) */}
        {isEdit && (
          <TaskDialogTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            commentsCount={comments.length}
            attachmentsCount={attachments.length}
          />
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
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
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
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
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
                <Select value={form.stageId} onValueChange={(val) => setField("stageId", val)}>
                  <SelectTrigger id="task-stage" className="h-10 rounded-xl bg-card border-border/80">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <KanbanSquare className="h-3.5 w-3.5 text-blue-500" />
                          <span>{s.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável */}
              <AssigneeField
                mode={form.assigneeMode}
                assigneeId={form.assigneeId}
                assigneeName={form.assigneeName}
                assignees={assignees}
                onToggleMode={() => dispatch({ type: "toggleAssigneeMode" })}
                onSelectMember={(id) => dispatch({ type: "selectMember", assigneeId: id })}
                onExternalNameChange={(name) => dispatch({ type: "typeExternalAssignee", assigneeName: name })}
              />

              {/* Vinculação de Sub-tarefa (WBS) */}
              <ParentTaskField
                value={form.parentTaskId}
                onChange={(id) => setField("parentTaskId", id)}
                options={parentTaskOptions}
              />
            </div>

            {/* Badge de Responsável Pendente de Convite */}
            <AssigneeInviteBanner
              assigneeName={form.assigneeName}
              assigneeStatus={form.assigneeStatus}
              inviting={inviting}
              onInvite={handleInvite}
            />

            {/* Prioridade */}
            <PrioritySelector value={form.priority} onChange={(p) => setField("priority", p)} />

            {/* Datas & Carga de Trabalho Grid */}
            <div className={`grid grid-cols-1 ${trackTime ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
              <div className="space-y-1.5">
                <label htmlFor="task-start" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Data Início
                </label>
                <DatePicker
                  id="task-start"
                  value={form.startDate}
                  onChange={(val) => setField("startDate", val)}
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
                  value={form.dueDate}
                  onChange={(val) => setField("dueDate", val)}
                  placeholder="Prazo"
                />
              </div>
              {trackTime && (
                <div className="space-y-1.5">
                  <label htmlFor="task-estimated-hours" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Horas Est.
                  </label>
                  <DurationInput
                    id="task-estimated-hours"
                    value={form.estimatedHours}
                    onChange={(val) => setField("estimatedHours", val)}
                    wrapperClassName="relative"
                    inputClassName="flex h-11 w-full rounded-xl border border-input bg-background text-foreground dark:text-zinc-100 pl-3.5 pr-16 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono font-medium transition-all shadow-xs"
                  />
                </div>
              )}
            </div>

            {/* Slider de Progresso */}
            <ProgressField progress={form.progress} onChange={(p) => setField("progress", p)} trackTime={trackTime} />

            {/* Bloco de Horas Reais Gastas (Ativado na Conclusão da Tarefa) */}
            {showActualHours && (
              <ActualHoursPanel
                estimatedHours={form.estimatedHours}
                actualHours={form.actualHours}
                onActualHoursChange={(val) => setField("actualHours", val)}
              />
            )}

            {/* Erro */}
            {form.error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{form.error}</p>
              </div>
            )}

            {/* Footer Actions */}
            <TaskDialogFooter
              isEdit={isEdit}
              loading={loading}
              canSubmit={!!form.title.trim()}
              onCancel={() => onOpenChange(false)}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
