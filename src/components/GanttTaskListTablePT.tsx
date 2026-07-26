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
  // Callback para clique simples na row
  onTaskClick?: (task: GanttTask) => void;
  // Callback para edição direta da tarefa (ícone de lápis ou duplo clique)
  onTaskEditClick?: (task: GanttTask) => void;
}

function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

const COL_WIDTH_NAME = "240px";
const COL_WIDTH_DATE = "90px";

export function GanttTaskListTablePT({
  rowHeight,
  tasks,
  fontFamily,
  fontSize,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
  onTaskClick,
  onTaskEditClick,
}: TaskListTableProps) {
  const nameCellStyle: CSSProperties = {
    minWidth: COL_WIDTH_NAME,
    maxWidth: COL_WIDTH_NAME,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  const dateCellStyle: CSSProperties = {
    minWidth: COL_WIDTH_DATE,
    maxWidth: COL_WIDTH_DATE,
    textAlign: "center",
    verticalAlign: "middle",
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
            className={"_34SS0 group" + (isSelected ? " _3ZbQT-selected" : "")}
            style={{
              ...rowStyle,
              cursor: t.type === "project" || (t.type === "task" && onTaskClick) ? "pointer" : "default",
            }}
            key={t.id + "row"}
            onClick={() => {
              setSelectedTask(t.id);
              if (t.type === "project") {
                onExpanderClick(t);
              } else if (t.type === "task" && onTaskClick) {
                onTaskClick(t);
              }
            }}
            onDoubleClick={() => {
              if (t.type === "task" && onTaskEditClick) {
                onTaskEditClick(t);
              }
            }}
          >
            <div
              className="_3lLk3"
              style={nameCellStyle}
              title={t.name}
            >
              <div className="_nI1Xw flex items-center justify-between pr-1">
                <div className="flex items-center gap-1 min-w-0">
                  <div
                    className={expanderSymbol ? "_2QjE6 cursor-pointer" : "_2TfEi"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpanderClick(t);
                    }}
                  >
                    {expanderSymbol}
                  </div>
                  <span className={`truncate ${t.type === "project" ? "font-bold select-none" : ""}`}>
                    {t.name}
                  </span>
                </div>

                {/* Ícone de edição rápida de tarefa no hover */}
                {t.type === "task" && onTaskEditClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskEditClick(t);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted text-muted-foreground hover:text-blue-500 rounded text-[11px] shrink-0"
                    title="Editar dados desta tarefa"
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
            <div className="_3lLk3" style={dateCellStyle}>
              {formatDateBR(t.start)}
            </div>
            <div className="_3lLk3" style={dateCellStyle}>
              {formatDateBR(t.end)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
