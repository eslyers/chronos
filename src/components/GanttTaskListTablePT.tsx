"use client";

import { type CSSProperties } from "react";
import type { Task as GanttTask } from "gantt-task-react";

interface TaskListTableProps {
  rowHeight: number;
  rowWidth: string;
  tasks: GanttTask[];
  fontFamily: string;
  fontSize: string;
  locale: string;
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: GanttTask) => void;
}

// Classes hasheadas do gantt-task-react (Emotion):
//   _3ZbQT → taskListWrapper
//   _34SS0 → taskListTableRow
//   _3lLk3 → taskListCell
//   _nI1Xw → taskListNameWrapper
//   _2QjE6 → taskListExpander (com icone)
//   _2TfEi → taskListEmptyExpander (sem icone)

// Formato curto BR: DD/MM/YY (ex: 17/07/26)
function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * TaskListTable PT-BR com datas abreviadas.
 * Substitui o default que vinha com "sex., 17 de julho de 2026".
 *
 * Uso: <Gantt TaskListTable={GanttTaskListTablePT} ... />
 */
export function GanttTaskListTablePT({
  rowHeight,
  rowWidth,
  tasks,
  fontFamily,
  fontSize,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
}: TaskListTableProps) {
  const cellStyle: CSSProperties = {
    minWidth: rowWidth,
    maxWidth: rowWidth,
  };

  const rowStyle: CSSProperties = {
    height: rowHeight,
  };

  const wrapperStyle: CSSProperties = {
    fontFamily,
    fontSize,
  };

  return (
    <div className="_3ZbQT" style={wrapperStyle}>
      {tasks.map((t) => {
        const expanderSymbol =
          t.hideChildren === false ? "▼" : t.hideChildren === true ? "▶" : "";
        const isSelected = selectedTaskId === t.id;

        return (
          <div
            className={"_34SS0" + (isSelected ? " _3ZbQT-selected" : "")}
            style={rowStyle}
            key={t.id + "row"}
            onClick={() => setSelectedTask(t.id)}
          >
            <div
              className="_3lLk3"
              style={cellStyle}
              title={t.name}
            >
              <div className="_nI1Xw">
                <div
                  className={
                    expanderSymbol ? "_2QjE6" : "_2TfEi"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpanderClick(t);
                  }}
                >
                  {expanderSymbol}
                </div>
                <div>{t.name}</div>
              </div>
            </div>
            <div className="_3lLk3" style={cellStyle}>
              &nbsp;{formatDateBR(t.start)}
            </div>
            <div className="_3lLk3" style={cellStyle}>
              &nbsp;{formatDateBR(t.end)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
