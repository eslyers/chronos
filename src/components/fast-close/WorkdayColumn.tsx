"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/context/DataContext";
import { formatWorkdayColumnHeader } from "@/lib/business-days";
import { FastCloseTaskCard } from "./FastCloseTaskCard";

export function WorkdayColumn({
  offset,
  columnDate,
  useD0,
  tasks,
  getWorkspaceId,
  onAddTask,
  onOpenEditTask,
}: {
  offset: number;
  columnDate: Date;
  useD0: boolean;
  tasks: Task[];
  getWorkspaceId: (projectId: string) => string | undefined;
  onAddTask: () => void;
  onOpenEditTask: (t: Task) => void;
}) {
  const headerInfo = formatWorkdayColumnHeader(offset, columnDate, useD0);

  const { setNodeRef, isOver } = useDroppable({
    id: `offset-${offset}`,
    data: {
      type: "workday",
      offset,
      columnDate,
      label: `a coluna ${headerInfo.badge} (${headerInfo.formattedDate})`,
    },
  });
  const isD0 = useD0 && offset === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 sm:w-80 flex flex-col bg-muted/30 rounded-2xl border border-border/80 snap-center transition-all ${
        isOver ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30" : ""
      } ${isD0 ? "border-pink-500/50 bg-pink-500/5" : ""}`}
    >
      {/* Column Header */}
      <div
        className={`p-3.5 border-b border-border/60 flex items-center justify-between rounded-t-2xl backdrop-blur-sm ${
          isD0 ? "bg-pink-500/10 border-b-pink-500/30" : "bg-card/70"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            className={`text-xs font-mono font-bold px-2 py-0.5 border-0 ${
              isD0
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : offset < 0
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
            }`}
          >
            {headerInfo.badge}
          </Badge>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground">
              {headerInfo.formattedDate} — {headerInfo.weekdayName}
            </span>
            {headerInfo.holidayName && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate max-w-[170px]" title={headerInfo.holidayName}>
                🎉 {headerInfo.holidayName}
              </span>
            )}
            {isD0 && (
              <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                Trava do ERP / Cut-off
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
            {tasks.length}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-muted"
            onClick={onAddTask}
            title={`Adicionar rotina em ${headerInfo.badge}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2.5 flex-1 space-y-2 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {tasks.map((task) => (
          <FastCloseTaskCard
            key={task.id}
            task={task}
            workspaceId={getWorkspaceId(task.project_id)}
            onOpenEdit={() => onOpenEditTask(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-border/60 hover:border-border rounded-xl flex flex-col items-center justify-center text-[11px] text-muted-foreground font-medium p-3 text-center transition-colors">
            <span>Nenhuma rotina para {headerInfo.badge}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddTask}
              className="mt-1.5 text-[11px] text-blue-500 hover:text-blue-400 font-semibold h-7 px-2 hover:bg-blue-500/10 gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar rotina
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
