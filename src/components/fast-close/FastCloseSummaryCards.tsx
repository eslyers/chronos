"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/context/DataContext";
import { formatWorkdayColumnHeader } from "@/lib/business-days";
import { MONTH_NAMES } from "@/lib/fast-close";
import { isTaskDone } from "@/lib/task-status";

export function FastCloseSummaryCards({
  projectName,
  tasksByOffset,
  selectedMonth,
  useD0,
  lastDayOfMonth,
  columnsCount,
}: {
  projectName: string | undefined;
  tasksByOffset: Map<number, Task[]>;
  selectedMonth: number;
  useD0: boolean;
  lastDayOfMonth: Date;
  columnsCount: number;
}) {
  // Métricas
  const monthTasks = useMemo(() => {
    return Array.from(tasksByOffset.values()).flat();
  }, [tasksByOffset]);

  const completedTasksCount = useMemo(() => {
    return monthTasks.filter(isTaskDone).length;
  }, [monthTasks]);

  const closingProgressPercent = useMemo(() => {
    if (monthTasks.length === 0) return 0;
    return Math.round((completedTasksCount / monthTasks.length) * 100);
  }, [monthTasks, completedTasksCount]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-card border-border/80 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>Progresso ({projectName || "Todos os Fechamentos"})</span>
          <span className="text-blue-500 font-mono">{closingProgressPercent}%</span>
        </div>
        <Progress value={closingProgressPercent} className="h-2" />
        <p className="text-[11px] text-muted-foreground">
          {completedTasksCount} de {monthTasks.length} rotinas contábeis concluídas em {MONTH_NAMES[selectedMonth - 1]}
        </p>
      </Card>

      <Card className="bg-card border-border/80 p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-muted-foreground block">
            {useD0 ? "Dia do Corte Oficial (D0 / WD0)" : "Encerramento do Mês (D-1)"}
          </span>
          <span className="text-base font-bold text-pink-600 dark:text-pink-400">
            {formatWorkdayColumnHeader(useD0 ? 0 : -1, lastDayOfMonth, useD0).formattedDate} — {formatWorkdayColumnHeader(useD0 ? 0 : -1, lastDayOfMonth, useD0).weekdayName}
          </span>
        </div>
        <Badge className="bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30">
          {useD0 ? "Corte ERP" : "D-1 (Sem D0)"}
        </Badge>
      </Card>

      <Card className="bg-card border-border/80 p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-muted-foreground block">Rotinas no Escopo Atual</span>
          <span className="text-base font-bold text-foreground">
            {monthTasks.length} rotinas ativas
          </span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {columnsCount} colunas diárias
        </Badge>
      </Card>
    </div>
  );
}
