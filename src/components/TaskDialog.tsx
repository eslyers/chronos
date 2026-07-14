"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useData, type Task } from "@/lib/context/DataContext";

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
  const [status, setStatus] = useState<"todo" | "in_progress" | "review" | "done" | "blocked">("todo");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setStageId(task.stage_id ?? "");
        setPriority(task.priority);
        setStatus(task.status);
        setProgress(task.progress);
        setStartDate(task.start_date ? task.start_date.split("T")[0] : "");
        setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      } else {
        setTitle("");
        setDescription("");
        setStageId(defaultStageId ?? stages[0]?.id ?? "");
        setPriority("medium");
        setStatus("todo");
        setProgress(0);
        setStartDate(new Date().toISOString().split("T")[0]);
        setDueDate("");
      }
      setError("");
    }
  }, [open, task, defaultStageId, stages]);

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
        status,
        progress,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os detalhes da tarefa."
              : "Adicione uma nova tarefa ao projeto."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-medium">
              Título *
            </label>
            <Input
              id="task-title"
              placeholder="Ex: Implementar autenticação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="task-desc" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="task-desc"
              placeholder="Detalhes, critérios de aceite, links úteis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="task-stage" className="text-sm font-medium">
                Etapa
              </label>
              <Select
                id="task-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="task-priority" className="text-sm font-medium">
                Prioridade
              </label>
              <Select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                <option value="low">⬇️ Baixa</option>
                <option value="medium">➡️ Média</option>
                <option value="high">⬆️ Alta</option>
                <option value="critical">🔥 Crítica</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="task-start" className="text-sm font-medium">
                Início
              </label>
              <Input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="task-due" className="text-sm font-medium">
                Prazo
              </label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              <span>Progresso</span>
              <span className="text-primary font-semibold">{progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            {progress === 100 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✅ Tarefa será marcada como concluída
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}