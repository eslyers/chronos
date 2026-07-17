"use client";

import type { CSSProperties } from "react";

interface TaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}

// Larguras devem ser iguais as do GanttTaskListTablePT para
// header e body ficarem alinhados.
const COL_WIDTH_NAME = "240px";
const COL_WIDTH_DATE = "90px";

/**
 * TaskListHeader PT-BR para o Gantt.
 * Substitui o default que vem com "Name", "From", "To" em ingles.
 * Titulos centralizados com largura customizada (Projetos mais largo).
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

  const nameItemStyle: CSSProperties = {
    minWidth: COL_WIDTH_NAME,
    maxWidth: COL_WIDTH_NAME,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
  };

  const dateItemStyle: CSSProperties = {
    minWidth: COL_WIDTH_DATE,
    maxWidth: COL_WIDTH_DATE,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
  };

  const separatorStyle = (marginTop: number): CSSProperties => ({
    height: headerHeight * 0.5,
    marginTop,
  });

  return (
    <div className="_3_ygE" style={tableStyle}>
      <div className="_1nBOt" style={headerStyle}>
        <div className="_WuQ0f" style={nameItemStyle}>
          &nbsp;Projetos
        </div>
        <div className="_2eZzQ" style={separatorStyle(headerHeight * 0.2)} />
        <div className="_WuQ0f" style={dateItemStyle}>
          &nbsp;Início
        </div>
        <div className="_2eZzQ" style={separatorStyle(headerHeight * 0.25)} />
        <div className="_WuQ0f" style={dateItemStyle}>
          &nbsp;Término
        </div>
      </div>
    </div>
  );
}
