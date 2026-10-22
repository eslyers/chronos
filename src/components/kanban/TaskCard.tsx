"use client";

import type { useRouter } from "next/navigation";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Clock, Flag, GripVertical, CornerDownRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskIndicators } from "@/components/TaskIndicators";
import { formatHoursBadge } from "@/lib/duration";
import { formatDateBR as formatDate } from "@/lib/utils";
import { PRIORITY_HEX, priorityLabel } from "@/lib/priority";
import { isTaskDone as isTaskDoneStatus, isTaskOverdue } from "@/lib/task-status";
import { pointerOnlyListeners } from "./dnd-a11y";

export function TaskCard({
  task,
  projectId,
  workspaceId,
  isDone,
  router,
  isOverlay = false,
  trackTime = true,
}: {
  task: Task;
  projectId: string;
  workspaceId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  isOverlay?: boolean;
  trackTime?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: "task", stageId: task.stage_id, taskId: task.id, label: task.title },
    disabled: isOverlay,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-task-${task.id}`,
    data: { type: "task", stageId: task.stage_id, taskId: task.id, label: `a tarefa "${task.title}"` },
    disabled: isOverlay,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const isTaskDone = isDone || isTaskDoneStatus(task);
  const overdue = !isTaskDone && isTaskOverdue(task);

  const openTask = () => {
    if (!isDragging) router.push(`/app/projects/${projectId}?task=${task.id}`);
  };

  return (
    <Card
      ref={setNodeRef}
      // Mouse/toque arrastam pelo card inteiro; o teclado usa só o botão de arrastar
      {...(isOverlay ? {} : pointerOnlyListeners(listeners))}
      className={`relative border-l-4 ${
        isTaskDone
          ? "border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10 border-border/80 shadow-xs"
          : "bg-card border-border/80"
      } ${
        isDragging && !isOverlay ? "opacity-30 scale-95" : ""
      } ${
        isOverlay
          ? "shadow-2xl rotate-2 cursor-grabbing ring-2 ring-blue-500/50 scale-105"
          : "cursor-grab hover:shadow-md hover:border-border"
      } transition-all duration-200 group`}
      style={isTaskDone ? undefined : { borderLeftColor: PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium }}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors flex items-start gap-1.5 flex-1">
            {isTaskDone && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            {/* O botão se estende (after:inset-0) sobre o card: clique ou Enter abrem a tarefa */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openTask();
              }}
              tabIndex={isOverlay ? -1 : undefined}
              className={`text-left cursor-grab focus-visible:outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-blue-500 ${
                isTaskDone ? "text-foreground font-semibold" : ""
              }`}
            >
              {task.title}
            </button>
          </h4>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...(isOverlay ? {} : attributes)}
              {...(isOverlay ? {} : listeners)}
              aria-label="Arrastar tarefa"
              tabIndex={isOverlay ? -1 : 0}
              className="rounded p-0.5 -m-0.5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
            <Flag
              className="h-3.5 w-3.5"
              aria-hidden="true"
              style={{
                color: isTaskDone ? "#10b981" : (PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium),
              }}
            />
          </div>
        </div>

        {/* Sub-tarefa badge (se for filha) */}
        {task.parent_task_id && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span>Sub-tarefa</span>
          </div>
        )}

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider bg-muted/40 border-border/60"
            >
              {priorityLabel(task.priority)}
            </Badge>

            {isTaskDone && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                Concluída
              </Badge>
            )}

            {task.due_date && (
              <span
                className={`text-[11px] inline-flex items-center gap-1 font-medium ${
                  overdue ? "text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatDate(task.due_date)}
                {overdue && " (atrasado)"}
              </span>
            )}

            {trackTime && task.estimated_hours != null && (
              <span className="text-[11px] inline-flex items-center gap-1 text-muted-foreground font-mono" title={`Estimado: ${formatHoursBadge(task.estimated_hours)}`}>
                <Clock className="h-3 w-3 text-blue-500" />
                {formatHoursBadge(task.estimated_hours)}
              </span>
            )}

            {trackTime && isTaskDone && task.actual_hours != null && (
              <span className="text-[11px] inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded" title={`Executado: ${formatHoursBadge(task.actual_hours)} reais`}>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {formatHoursBadge(task.actual_hours)} real
              </span>
            )}
          </div>

          {task.progress > 0 && (
            <span className={`text-[10px] font-bold font-mono ${isTaskDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"}`}>
              {task.progress}%
            </span>
          )}
        </div>

        {task.progress > 0 && (
          <Progress
            value={task.progress}
            className="h-1"
            indicatorClassName={isTaskDone ? "bg-emerald-500" : undefined}
          />
        )}

        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          {(task.assignee_id || task.assignee_name) ? (
            <TaskAssignee
              assigneeId={task.assignee_id}
              assigneeName={task.assignee_name}
              workspaceId={workspaceId}
              variant="badge"
            />
          ) : <div />}
          {/* No overlay de arraste não busca contagens de novo */}
          {!isOverlay && <TaskIndicators taskId={task.id} />}
        </div>
      </CardContent>
    </Card>
  );
}
