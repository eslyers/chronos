"use client";

import type { CSSProperties } from "react";

interface TaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}

// Larguras alinhadas estritamente com GanttTaskListTablePT
const COL_WIDTH_NAME = "220px";
const COL_WIDTH_ASSIGNEE = "120px";
const COL_WIDTH_DATE = "85px";

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
    verticalAlign: "middle",
    fontWeight: 600,
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

  const separatorStyle = (marginTop: number): CSSProperties => ({
    height: headerHeight * 0.5,
    marginTop,
  });

  return (
    <div className="_3_ygE" style={tableStyle}>
      <div className="_1nBOt" style={headerStyle}>
        <div className="_WuQ0f" style={nameItemStyle}>
          &nbsp;Projetos / Tarefas
        </div>
        <div className="_2eZzQ" style={separatorStyle(headerHeight * 0.2)} />
        <div className="_WuQ0f" style={assigneeItemStyle}>
          &nbsp;Responsável
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
