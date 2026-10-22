"use client";

import { Badge } from "@/components/ui/badge";
import type { Stage, Task } from "@/lib/context/DataContext";

/** Abas de etapa do layout mobile (uma coluna visível por vez). */
export function MobileStageTabs({
  stages,
  projectTasks,
  activeStageId,
  onSelectStage,
}: {
  stages: Stage[];
  projectTasks: Task[];
  activeStageId: string | null;
  onSelectStage: (stageId: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-border/40 scrollbar-none">
      {stages.map((stage) => {
        const isActive = activeStageId === stage.id;
        const stageTasksCount = projectTasks.filter((t) => t.stage_id === stage.id).length;
        return (
          <button
            key={`tab-${stage.id}`}
            onClick={() => onSelectStage(stage.id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              isActive
                ? "bg-blue-600 border-blue-600 text-white shadow-sm font-semibold"
                : "bg-card border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stage.color || "#3b82f6" }}
            />
            <span>{stage.name}</span>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono px-1.5 py-0 font-bold ${
                isActive
                  ? "bg-blue-700/50 text-white border-blue-400/40"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stageTasksCount}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
