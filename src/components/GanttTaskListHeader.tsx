"use client";

import React, { useState, useEffect, useRef, type CSSProperties } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";

export type GanttSortField = "name" | "assignee" | "start" | "end";
export type GanttSortDirection = "asc" | "desc";

interface TaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  nameColumnWidth?: number;
  sortField?: GanttSortField | null;
  sortDirection?: GanttSortDirection;
  onSort?: (field: GanttSortField) => void;
  onResizeNameColumn?: (newWidth: number) => void;
}

const COL_WIDTH_ASSIGNEE = "120px";
const COL_WIDTH_DATE = "85px";

export function GanttTaskListHeaderPT({
  headerHeight,
  fontFamily,
  fontSize,
  nameColumnWidth = 240,
  sortField = null,
  sortDirection = "asc",
  onSort,
  onResizeNameColumn,
}: TaskListHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(240);

  const colWidthName = `${nameColumnWidth}px`;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = nameColumnWidth;
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(160, Math.min(550, startWidthRef.current + delta));
      onResizeNameColumn?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onResizeNameColumn]);

  const tableStyle: CSSProperties = {
    fontFamily,
    fontSize,
  };

  const headerStyle: CSSProperties = {
    height: headerHeight - 2,
  };

  const nameItemStyle: CSSProperties = {
    minWidth: colWidthName,
    maxWidth: colWidthName,
    textAlign: "left",
    verticalAlign: "middle",
    fontWeight: 600,
    position: "relative",
  };

  const assigneeItemStyle: CSSProperties = {
    minWidth: COL_WIDTH_ASSIGNEE,
    maxWidth: COL_WIDTH_ASSIGNEE,
    textAlign: "center",
    verticalAlign: "middle",
    fontWeight: 600,
  };

  const dateItemStyle: CSSProperties = {
    minWidth: COL_WIDTH_DATE,
    maxWidth: COL_WIDTH_DATE,
    textAlign: "center",
    verticalAlign: "middle",
    fontWeight: 600,
  };

  const renderSortIcon = (field: GanttSortField) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
      );
    }
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0" />;
  };

  return (
    <div className="_3_ygE" style={tableStyle}>
      <div className="_1nBOt" style={headerStyle}>
        {/* Coluna 1: Projetos / Tarefas (com ordenação e resizer) */}
        <div
          className="_WuQ0f group flex items-center justify-between px-2 cursor-pointer select-none hover:bg-muted/50 transition-colors"
          style={nameItemStyle}
          onClick={() => onSort?.("name")}
          title="Clique para ordenar por nome. Arraste a borda para redimensionar."
        >
          <span className="truncate font-semibold text-foreground">
            Projetos / Tarefas
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {renderSortIcon("name")}
            {/* Manipulador de Redimensionamento (Resizer Handle) */}
            <div
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
              className="cursor-col-resize p-1 hover:bg-blue-500/20 rounded transition-colors"
              title="Arraste para ajustar a largura da coluna"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-blue-500" />
            </div>
          </div>
        </div>

        <div className="_2eZzQ" style={{ height: headerHeight * 0.5, marginTop: headerHeight * 0.2 }} />

        {/* Coluna 2: Responsável */}
        <div
          className="_WuQ0f flex items-center justify-center gap-1 cursor-pointer select-none hover:bg-muted/50 transition-colors px-1"
          style={assigneeItemStyle}
          onClick={() => onSort?.("assignee")}
          title="Clique para ordenar por responsável"
        >
          <span>Responsável</span>
          {renderSortIcon("assignee")}
        </div>

        <div className="_2eZzQ" style={{ height: headerHeight * 0.5, marginTop: headerHeight * 0.2 }} />

        {/* Coluna 3: Início */}
        <div
          className="_WuQ0f flex items-center justify-center gap-1 cursor-pointer select-none hover:bg-muted/50 transition-colors px-1"
          style={dateItemStyle}
          onClick={() => onSort?.("start")}
          title="Clique para ordenar por data de início"
        >
          <span>Início</span>
          {renderSortIcon("start")}
        </div>

        <div className="_2eZzQ" style={{ height: headerHeight * 0.5, marginTop: headerHeight * 0.25 }} />

        {/* Coluna 4: Término */}
        <div
          className="_WuQ0f flex items-center justify-center gap-1 cursor-pointer select-none hover:bg-muted/50 transition-colors px-1"
          style={dateItemStyle}
          onClick={() => onSort?.("end")}
          title="Clique para ordenar por data de término"
        >
          <span>Término</span>
          {renderSortIcon("end")}
        </div>
      </div>
    </div>
  );
}
