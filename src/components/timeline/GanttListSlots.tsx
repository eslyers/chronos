"use client";

import { createContext, useContext, type ComponentProps } from "react";
import type { Task as GanttTask } from "gantt-task-react";
import { GanttTaskListHeaderPT } from "@/components/GanttTaskListHeader";
import { GanttTaskListTablePT } from "@/components/GanttTaskListTablePT";
import type { GanttSortField, GanttSortDirection } from "@/lib/gantt-tasks";

// ─────────────────────────────────────────────────────────────
// Slots TaskListHeader / TaskListTable do Gantt com identidade estável.
// Componentes inline (`TaskListHeader={(p) => ...}`) viram um tipo novo a
// cada render: o React remonta a lista e perde o estado (ex.: o drag de
// redimensionar coluna). O estado da página chega por contexto.
// ─────────────────────────────────────────────────────────────

export interface GanttListState {
  nameColumnWidth: number;
  sortField: GanttSortField | null;
  sortDirection: GanttSortDirection;
  onSort: (field: GanttSortField) => void;
  onResizeNameColumn: (width: number) => void;
  /** Expandir/recolher projeto ou tarefa-pai. */
  onToggleRow: (task: GanttTask) => void;
  /** Clique simples na linha. */
  onTaskClick: (task: GanttTask) => void;
  /** Edição direta (lápis ou duplo clique). */
  onTaskEditClick: (task: GanttTask) => void;
}

export const GanttListContext = createContext<GanttListState | null>(null);

function useGanttList(): GanttListState {
  const ctx = useContext(GanttListContext);
  if (!ctx) throw new Error("GanttListContext ausente: envolva o <Gantt> com GanttListContext.Provider");
  return ctx;
}

type HeaderSlotProps = {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
};

export function TimelineTaskListHeader(props: HeaderSlotProps) {
  const { nameColumnWidth, sortField, sortDirection, onSort, onResizeNameColumn } = useGanttList();
  return (
    <GanttTaskListHeaderPT
      {...props}
      nameColumnWidth={nameColumnWidth}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      onResizeNameColumn={onResizeNameColumn}
    />
  );
}

type TableSlotProps = Omit<
  ComponentProps<typeof GanttTaskListTablePT>,
  "nameColumnWidth" | "onTaskClick" | "onTaskEditClick"
>;

export function TimelineTaskListTable(props: TableSlotProps) {
  const { nameColumnWidth, onToggleRow, onTaskClick, onTaskEditClick } = useGanttList();
  return (
    <GanttTaskListTablePT
      {...props}
      nameColumnWidth={nameColumnWidth}
      // O expander padrão da lib só age em projetos com hideChildren definido
      onExpanderClick={onToggleRow}
      onTaskClick={onTaskClick}
      onTaskEditClick={onTaskEditClick}
    />
  );
}
