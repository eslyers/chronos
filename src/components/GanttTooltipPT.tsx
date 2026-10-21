"use client";

import type { CSSProperties } from "react";
import type { Task as GanttTask } from "gantt-task-react";
import { formatDateOnly, daysBetweenDateOnly } from "@/lib/date-only";
import { formatGanttDate, ganttEndToInclusiveDate } from "@/lib/gantt-tasks";

interface TooltipContentProps {
  task: GanttTask;
  fontSize: string;
  fontFamily: string;
}

// Classes hasheadas do gantt-task-react (Emotion):
//   _3T42e → tooltipDefaultContainer
//   _29NTg → tooltipDefaultContainerParagraph

/**
 * TooltipContent PT-BR para o Gantt.
 * Substitui o default que vinha com "Duration: X day(s)" e "Progress: X %".
 * Datas em DD/MM/YY; o `end` do Gantt é exclusivo, então o prazo exibido
 * é o dia anterior a ele.
 *
 * Uso: <Gantt TooltipContent={GanttTooltipPT} ... />
 */
export function GanttTooltipPT({
  task,
  fontSize,
  fontFamily,
}: TooltipContentProps) {
  const containerStyle: CSSProperties = {
    fontSize,
    fontFamily,
  };

  const titleStyle: CSSProperties = {
    fontSize: `${parseFloat(fontSize) + 1}px`,
    fontWeight: 600,
  };

  const lastDay = ganttEndToInclusiveDate(task.end);
  // Dias corridos contando início e prazo (texto YYYY-MM-DD: imune a fuso/horário de verão)
  const days = daysBetweenDateOnly(formatDateOnly(task.start), formatDateOnly(lastDay)) + 1;

  return (
    <div className="_3T42e" style={containerStyle}>
      <b style={titleStyle}>{task.name}</b>
      <p className="_29NTg" style={{ margin: 0 }}>
        {formatGanttDate(task.start)} → {formatGanttDate(lastDay)}
      </p>
      {days > 0 && (
        <p className="_29NTg">Duração: {days} {days === 1 ? "dia" : "dias"}</p>
      )}
      {task.progress === 100 ? (
        <p className="_29NTg" style={{ color: "#10b981", fontWeight: 600 }}>
          Status: Concluída (100%) ✓
        </p>
      ) : task.progress > 0 ? (
        <p className="_29NTg">Progresso: {task.progress}%</p>
      ) : null}
    </div>
  );
}
