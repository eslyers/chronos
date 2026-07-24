"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, Plus, Trash2, Loader2, Info } from "lucide-react";
import { useData, type Task, type TaskDependency } from "@/lib/context/DataContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type DepType = "FS" | "SS" | "FF" | "SF";

const DEP_TYPE_LABELS: Record<DepType, { label: string; description: string }> = {
  FS: {
    label: "FS — Finish-to-Start",
    description: "B só pode começar quando A termina (mais comum)",
  },
  SS: {
    label: "SS — Start-to-Start",
    description: "B só pode começar quando A começa",
  },
  FF: {
    label: "FF — Finish-to-Finish",
    description: "B só pode terminar quando A termina",
  },
  SF: {
    label: "SF — Start-to-Finish",
    description: "B só pode terminar quando A começa (raro)",
  },
};

export function DependencyManager({
  projectId,
}: {
  projectId: string;
}) {
  const {
    getTasksByProject,
    dependencies,
    addDependency,
    removeDependency,
  } = useData();

  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>("");
  const [depType, setDepType] = useState<DepType>("FS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [depToRemove, setDepToRemove] = useState<TaskDependency | null>(null);

  const projectTasks = useMemo(
    () => getTasksByProject(projectId),
    [getTasksByProject, projectId]
  );

  // Mapa rápido: id → task
  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of projectTasks) m.set(t.id, t);
    return m;
  }, [projectTasks]);

  // Dependências ativas neste projeto (cuja origem OU destino é uma task do projeto)
  const projectDeps = useMemo(() => {
    const taskIds = new Set(projectTasks.map((t) => t.id));
    return dependencies.filter(
      (d) => taskIds.has(d.task_id) && taskIds.has(d.depends_on_task_id)
    );
  }, [dependencies, projectTasks]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!taskId || !dependsOnTaskId) {
      setError("Selecione as duas tarefas");
      return;
    }
    if (taskId === dependsOnTaskId) {
      setError("Uma tarefa não pode depender de si mesma");
      return;
    }
    // Já existe?
    if (projectDeps.some((d) => d.task_id === taskId && d.depends_on_task_id === dependsOnTaskId)) {
      setError("Essa dependência já existe");
      return;
    }

    setBusy(true);
    try {
      await addDependency(taskId, dependsOnTaskId, depType);
      const a = taskMap.get(dependsOnTaskId)?.title ?? "?";
      const b = taskMap.get(taskId)?.title ?? "?";
      setSuccess(`✅ "${b}" agora depende de "${a}" (${depType})`);
      setTaskId("");
      setDependsOnTaskId("");
      setDepType("FS");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (dep: TaskDependency) => {
    try {
      await removeDependency(dep.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover");
    }
  };

  const askRemove = (dep: TaskDependency) => {
    setDepToRemove(dep);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Dependências
          {projectDeps.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {projectDeps.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dependências entre tarefas</DialogTitle>
          <DialogDescription>
            Conecte tarefas pra mostrar ordem de execução. Suporta FS, SS, FF, SF.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Form de adicionar */}
        <form
          onSubmit={handleAdd}
          className="space-y-3 border rounded-lg p-4 bg-muted/30"
        >
          <h3 className="font-semibold text-sm">Adicionar nova</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">
                Tarefa que depende
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                disabled={busy}
              >
                <option value="">Selecione…</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                Depende de
              </label>
              <select
                value={dependsOnTaskId}
                onChange={(e) => setDependsOnTaskId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                disabled={busy}
              >
                <option value="">Selecione…</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Tipo</label>
            <select
              value={depType}
              onChange={(e) => setDepType(e.target.value as DepType)}
              className="w-full border rounded px-2 py-1.5 text-sm bg-background"
              disabled={busy}
            >
              {Object.entries(DEP_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {DEP_TYPE_LABELS[depType].description}
            </p>
          </div>
          <Button type="submit" disabled={busy} size="sm">
            {busy ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-2" />
                Adicionar dependência
              </>
            )}
          </Button>
        </form>

        {/* Lista de dependências ativas */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            Ativas ({projectDeps.length})
          </h3>
          {projectDeps.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 border rounded-lg border-dashed">
              Nenhuma dependência configurada ainda
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {projectDeps.map((dep) => {
                const source = taskMap.get(dep.depends_on_task_id);
                const target = taskMap.get(dep.task_id);
                return (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between gap-2 border rounded px-3 py-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {source?.title ?? "(removida)"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                          {dep.type}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium truncate">
                          {target?.title ?? "(removida)"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => askRemove(dep)}
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
      <ConfirmDialog
        open={!!depToRemove}
        onOpenChange={(o) => !o && setDepToRemove(null)}
        title="Remover essa dependência?"
        description="A relação entre as duas tarefas será desfeita."
        variant="destructive"
        confirmText="Remover"
        onConfirm={async () => {
          if (depToRemove) await handleRemove(depToRemove);
        }}
      />
    </Dialog>
  );
}
