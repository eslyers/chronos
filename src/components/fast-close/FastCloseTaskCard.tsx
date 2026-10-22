"use client";

import { useDraggable } from "@dnd-kit/core";
import { Flag, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskIndicators } from "@/components/TaskIndicators";
import { PRIORITY_HEX } from "@/lib/priority";
import { isTaskDone } from "@/lib/task-status";
import { pointerOnlyListeners } from "@/components/kanban/dnd-a11y";

export function FastCloseTaskCard({
  task,
  workspaceId,
  onOpenEdit,
}: {
  task: Task;
  workspaceId: string | undefined;
  onOpenEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task, label: task.title },
  });

  const isDone = isTaskDone(task);

  // Sem transform no original: quem acompanha o ponteiro é o DragOverlay.
  // O card de origem só fica esmaecido enquanto é arrastado.
  return (
    <Card
      ref={setNodeRef}
      // Mouse/toque arrastam pelo card inteiro; o teclado usa só o botão de arrastar
      {...pointerOnlyListeners(listeners)}
      className={`group relative bg-card hover:border-blue-500/60 transition-all duration-200 shadow-xs cursor-grab active:cursor-grabbing border-border/80 ${
        isDone ? "bg-muted/30 border-emerald-500/30" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-xs font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {/* O botão se estende (after:inset-0) sobre o card: clique ou Enter abrem a rotina */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) onOpenEdit();
              }}
              className="text-left cursor-grab focus-visible:outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-blue-500"
            >
              {task.title}
            </button>
          </h4>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label="Arrastar tarefa"
              className="rounded p-0.5 -m-0.5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
            <Flag
              className="h-3 w-3"
              aria-hidden="true"
              style={{
                color: PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium,
              }}
            />
          </div>
        </div>

        {task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {task.progress > 0 && (
          <div className="space-y-1 pt-0.5">
            <Progress value={task.progress} className="h-1" />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
              <span>Progresso</span>
              <span className="font-bold">{task.progress}%</span>
            </div>
          </div>
        )}

        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1.5">
          {(task.assignee_id || task.assignee_name) ? (
            <TaskAssignee
              assigneeId={task.assignee_id}
              assigneeName={task.assignee_name}
              workspaceId={workspaceId}
              variant="badge"
            />
          ) : (
            <div />
          )}
          <TaskIndicators taskId={task.id} />
        </div>
      </CardContent>
    </Card>
  );
}
