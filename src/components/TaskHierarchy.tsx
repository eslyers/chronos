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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TreePine,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Info,
} from "lucide-react";
import { useData, type Task } from "@/lib/context/DataContext";

type TreeNode = {
  task: Task;
  children: TreeNode[];
  depth: number;
};

function buildTree(tasks: Task[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const t of tasks) map.set(t.id, { task: t, children: [], depth: 0 });
  const roots: TreeNode[] = [];
  for (const t of tasks) {
    const node = map.get(t.id)!;
    if (t.parent_task_id && map.has(t.parent_task_id)) {
      const parent = map.get(t.parent_task_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Ordena por posição
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.task.position - b.task.position);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function countAll(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countAll(node.children);
  }
  return n;
}

export function TaskHierarchy({ projectId }: { projectId: string }) {
  const {
    getTasksByProject,
    createTask,
    deleteTask,
  } = useData();

  const [open, setOpen] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const projectTasks = useMemo(
    () => getTasksByProject(projectId),
    [getTasksByProject, projectId]
  );
  const tree = useMemo(() => buildTree(projectTasks), [projectTasks]);
  const totalCount = countAll(tree);

  const handleAddSubtask = async (parentId: string) => {
    if (!newTitle.trim()) {
      setError("Digite um título pra sub-tarefa");
      return;
    }
    const parent = projectTasks.find((t) => t.id === parentId);
    if (!parent) {
      setError("Tarefa pai não encontrada");
      return;
    }
    if (!parent.stage_id) {
      setError("A tarefa pai precisa estar em uma etapa");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTask({
        project_id: parent.project_id,
        stage_id: parent.stage_id,
        title: newTitle.trim(),
        priority: parent.priority,
        parent_task_id: parent.id,
      });
      setNewTitle("");
      setAddingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar sub-tarefa");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Excluir "${task.title}" e todas as sub-tarefas?`)) return;
    try {
      await deleteTask(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir");
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.task.id);
    const isAddingHere = addingTo === node.task.id;
    return (
      <div key={node.task.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 group ${
            node.depth > 0 ? "ml-6" : ""
          }`}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleCollapse(node.task.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
          <span className="text-sm flex-1 truncate">
            {node.depth > 0 && <span className="text-muted-foreground">└ </span>}
            {node.task.title}
            {hasChildren && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({node.children.length})
              </span>
            )}
          </span>
          <span className="text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground">
            L{node.depth}
          </span>
          <button
            onClick={() => {
              setAddingTo(node.task.id);
              setNewTitle("");
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary hover:underline"
            title="Adicionar sub-tarefa"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(node.task)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-destructive hover:underline"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {isAddingHere && (
          <div className={`ml-12 mb-2 flex gap-2 ${node.depth > 0 ? "ml-12" : "ml-12"}`}>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da sub-tarefa"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubtask(node.task.id);
                if (e.key === "Escape") {
                  setAddingTo(null);
                  setNewTitle("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => handleAddSubtask(node.task.id)}
              disabled={busy}
              className="h-8"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAddingTo(null);
                setNewTitle("");
              }}
              className="h-8"
            >
              Cancelar
            </Button>
          </div>
        )}
        {!isCollapsed && node.children.map(renderNode)}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TreePine className="h-4 w-4 mr-2" />
          Hierarquia
          {totalCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {totalCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hierarquia de tarefas (WBS)</DialogTitle>
          <DialogDescription>
            Tarefas principais e sub-tarefas. Click no{" "}
            <Plus className="inline h-3 w-3" /> pra adicionar sub-tarefa.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {tree.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
            <Info className="h-5 w-5 mx-auto mb-2" />
            Nenhuma tarefa ainda. Crie uma primeiro em /app/projects.
          </div>
        ) : (
          <div className="border rounded-lg p-2 max-h-[60vh] overflow-y-auto">
            {tree.map(renderNode)}
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-start gap-1.5 pt-2 border-t">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            Sub-tarefas herdam projeto, etapa e prioridade da tarefa pai. No
            Gantt, elas aparecem como filhas (indentadas).
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}