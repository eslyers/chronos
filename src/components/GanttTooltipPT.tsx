"use client";

import type { CSSProperties } from "react";
import type { Task as GanttTask } from "gantt-task-react";

interface TooltipContentProps {
  task: GanttTask;
  fontSize: string;
  fontFamily: string;
}

// Classes hasheadas do gantt-task-react (Emotion):
//   _3T42e → tooltipDefaultContainer
//   _29NTg → tooltipDefaultContainerParagraph

// Formato BR abreviado para tooltip: DD/MM/YY (mais compacto que default D-M-YYYY)
function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * TooltipContent PT-BR para o Gantt.
 * Substitui o default que vinha com "Duration: X day(s)" e "Progress: X %".
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
    fontSize: `${parseFloat(fontSize) + 6}px`,
  };

  const days = Math.round(
    (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="_3T42e" style={containerStyle}>
      <b style={titleStyle}>
        {task.name}: {formatDateBR(task.start)} - {formatDateBR(task.end)}
      </b>
      {task.end.getTime() - task.start.getTime() !== 0 && (
        <p className="_29NTg">Duração: {days} dia(s)</p>
      )}
      {!!task.progress && (
        <p className="_29NTg">Progresso: {task.progress}%</p>
      )}
    </div>
  );
}
