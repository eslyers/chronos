"use client";

import type { useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { Plus, AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Stage, Task } from "@/lib/context/DataContext";
import { TaskCard } from "./TaskCard";

export function StageColumn({
  stage,
  tasks,
  projectId,
  workspaceId,
  isDone,
  router,
  onAddTask,
  trackTime = true,
}: {
  stage: Stage;
  tasks: Task[];
  projectId: string;
  workspaceId: string;
  isDone: boolean;
  router: ReturnType<typeof useRouter>;
  onAddTask: () => void;
  trackTime?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id, label: `a coluna "${stage.name}"` },
  });

  const wipLimit = stage.wip_limit ?? null;
  const hasWipLimit = wipLimit !== null && wipLimit > 0;
  const isWipExceeded = hasWipLimit && tasks.length > wipLimit;
  const isWipNear = hasWipLimit && tasks.length === wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[85vw] sm:w-80 flex flex-col rounded-2xl border snap-center transition-all ${
        isWipExceeded
          ? "bg-red-500/5 border-red-500/80 ring-1 ring-red-500/20"
          : isWipNear
          ? "bg-amber-500/5 border-amber-500/60"
          : "bg-muted/30 border-border/80"
      } ${
        isOver ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30" : ""
      }`}
    >
      {/* Column Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between rounded-t-2xl backdrop-blur-sm ${
          isWipExceeded
            ? "bg-red-500/15 border-red-500/30"
            : isWipNear
            ? "bg-amber-500/15 border-amber-500/30"
            : "bg-card/60 border-border/60"
        }`}
        style={{
          borderTopColor: isWipExceeded ? "#ef4444" : isWipNear ? "#f59e0b" : (stage.color || "#3b82f6"),
          borderTopWidth: 3,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3 h-3 rounded-full shadow-sm shrink-0"
            style={{ backgroundColor: stage.color || "#3b82f6" }}
          />
          <h3 className="font-bold text-sm text-foreground truncate">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isWipExceeded ? (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 motion-safe:animate-pulse px-2 py-0.5 inline-flex items-center gap-1"
              title={`Limite WIP excedido: ${tasks.length} tarefas para um limite de ${wipLimit}`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
              <span>{tasks.length}/{wipLimit}</span>
            </Badge>
          ) : isWipNear ? (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 px-2 py-0.5 inline-flex items-center gap-1"
              title={`No limite WIP: ${tasks.length} de ${wipLimit}`}
            >
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
              <span>{tasks.length}/{wipLimit}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
              {hasWipLimit ? `${tasks.length}/${wipLimit}` : tasks.length}
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-muted"
            onClick={onAddTask}
            title={`Adicionar tarefa em "${stage.name}"`}
          >
            <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </div>

      {/* Column Content / Droppable Area */}
      <div className="p-3 space-y-3 flex-1 min-h-[260px] max-h-[640px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl py-10 px-4 text-center transition-colors flex flex-col items-center justify-center ${
              isOver ? "border-blue-500 bg-blue-500/5 text-blue-500" : "border-border/60 hover:border-border text-muted-foreground"
            }`}
          >
            <p className="text-xs font-semibold">
              {isOver ? "Solte para mover aqui ✨" : "Nenhuma tarefa nesta etapa"}
            </p>
            {!isOver && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddTask}
                className="mt-2 text-[11px] text-blue-500 hover:text-blue-400 font-semibold h-7 px-2.5 hover:bg-blue-500/10 gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar tarefa
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              workspaceId={workspaceId}
              isDone={isDone}
              router={router}
              trackTime={trackTime}
            />
          ))
        )}
      </div>
    </div>
  );
}
