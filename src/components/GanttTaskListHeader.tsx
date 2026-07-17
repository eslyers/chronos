"use client";

import type { CSSProperties } from "react";

interface TaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}

/**
 * TaskListHeader PT-BR para o Gantt.
 * Substitui o default que vem com "Name", "From", "To" em ingles.
 *
 * Uso: <Gantt TaskListHeader={GanttTaskListHeaderPT} ... />
 *
 * As classes CSS hasheadas vem do gantt-task-react (Emotion):
 *   _3_ygE → ganttTable (wrapper)
 *   _1nBOt → ganttTable_Header (header row)
 *   _WuQ0f → ganttTable_HeaderItem (celulas)
 *   _2eZzQ → ganttTable_HeaderSeparator (separador vertical)
 */
export function GanttTaskListHeaderPT({
  headerHeight,
  rowWidth,
  fontFamily,
  fontSize,
}: TaskListHeaderProps) {
  const tableStyle: CSSProperties = {
    fontFamily,
    fontSize,
  };

  const headerStyle: CSSProperties = {
    height: headerHeight - 2,
  };

  const headerItemStyle: CSSProperties = {
    minWidth: rowWidth,
  };

  const separatorStyle = (marginTop: number): CSSProperties => ({
    height: headerHeight * 0.5,
    marginTop,
  });

  return (
    <div className="_3_ygE" style={tableStyle}>
      <div className="_1nBOt" style={headerStyle}>
        <div className="_WuQ0f" style={headerItemStyle}>
          &nbsp;Nome
        </div>
        <div className="_2eZzQ" style={separatorStyle(headerHeight * 0.2)} />
        <div className="_WuQ0f" style={headerItemStyle}>
          &nbsp;Início
        </div>
        <div className="_2eZzQ" style={separatorStyle(headerHeight * 0.25)} />
        <div className="_WuQ0f" style={headerItemStyle}>
          &nbsp;Término
        </div>
      </div>
    </div>
  );
}
