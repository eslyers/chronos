"use client";

import React from "react";
import { CheckCircle2, Circle, Flag, Edit, Trash2, User, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/context/DataContext";
import { formatWorkdayColumnHeader } from "@/lib/business-days";

interface FastCloseListViewProps {
  workdayOffsets: number[];
  offsetDatesMap: Map<number, Date>;
  tasksByOffset: Map<number, Task[]>;
  useD0: boolean;
  onOpenEditTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskToOffset: (offsetDate: Date) => void;
}

const PRIORITY_FLAG_COLORS = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#3b82f6",
  critical: "#ef4444",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export function FastCloseListView({
  workdayOffsets,
  offsetDatesMap,
  tasksByOffset,
  useD0,
  onOpenEditTask,
  onToggleTaskComplete,
  onDeleteTask,
  onAddTaskToOffset,
}: FastCloseListViewProps) {
  return (
    <div className="space-y-6">
      {workdayOffsets.map((offset) => {
        const columnDate = offsetDatesMap.get(offset) || new Date();
        const headerInfo = formatWorkdayColumnHeader(offset, columnDate, useD0);
        const tasks = tasksByOffset.get(offset) || [];
        const isD0 = useD0 && offset === 0;

        return (
          <div
            key={offset}
            className={`bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs transition-all ${
              isD0 ? "border-pink-500/40 bg-pink-500/5" : ""
            }`}
          >
            {/* Header do Dia */}
            <div
              className={`p-3.5 px-5 border-b border-border/60 flex items-center justify-between backdrop-blur-sm ${
                isD0 ? "bg-pink-500/10 border-b-pink-500/30" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Badge
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 border-0 ${
                    isD0
                      ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                      : offset < 0
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {headerInfo.badge}
                </Badge>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {headerInfo.formattedDate} — {headerInfo.weekdayName}
                  </span>
                  {isD0 && (
                    <span className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      Trava do ERP / Cut-off
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
                  {tasks.length} rotinas
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAddTaskToOffset(columnDate)}
                  className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                  + Nova Rotina em {headerInfo.badge}
                </Button>
              </div>
            </div>

            {/* Tabela de Tarefas do Dia */}
            <div className="divide-y divide-border/40">
              {tasks.map((task) => {
                const isDone = task.status === "done" || task.progress === 100;
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors ${
                      isDone ? "bg-emerald-500/5 opacity-70" : ""
                    }`}
                  >
                    {/* Lado Esquerdo: Checkbox & Título */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onToggleTaskComplete(task)}
                        className="mt-0.5 sm:mt-0 text-muted-foreground hover:text-emerald-500 transition-colors shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span
                          onClick={() => onOpenEditTask(task)}
                          className={`text-xs font-bold text-foreground hover:text-blue-500 transition-colors cursor-pointer block truncate ${
                            isDone ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Metadata & Ações */}
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
                      {/* Prioridade */}
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold gap-1 px-2 py-0.5"
                      >
                        <Flag
                          className="h-3 w-3"
                          style={{
                            color:
                              PRIORITY_FLAG_COLORS[
                                task.priority as keyof typeof PRIORITY_FLAG_COLORS
                              ] || "#3b82f6",
                          }}
                        />
                        <span>{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}</span>
                      </Badge>

                      {/* Responsável */}
                      {task.assignee_name ? (
                        <div className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <User className="h-3 w-3 text-blue-500" />
                          <span>{task.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 italic">Sem responsável</span>
                      )}

                      {/* Progresso */}
                      <div className="w-24 space-y-1 hidden md:block">
                        <Progress value={task.progress} className="h-1.5" />
                        <span className="text-[10px] font-mono text-muted-foreground block text-right font-bold">
                          {task.progress}%
                        </span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onOpenEditTask(task)}
                          className="h-8 w-8 hover:bg-muted"
                          title="Editar tarefa"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeleteTask(task.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground font-medium">
                  Nenhuma rotina cadastrada para {headerInfo.badge} ({headerInfo.formattedDate})
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
