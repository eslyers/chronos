"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/context/DataContext";
import { groupTasksByOffset } from "@/lib/fast-close";

/** Agrupa (memoizado) as tarefas do escopo por offset de dia útil. */
export function useTasksByOffset(
  scopedTasks: Task[],
  workdayOffsets: number[],
  selectedYear: number,
  selectedMonth: number,
  useD0: boolean
): Map<number, Task[]> {
  return useMemo(
    () => groupTasksByOffset(scopedTasks, workdayOffsets, selectedYear, selectedMonth, useD0),
    [scopedTasks, selectedMonth, selectedYear, useD0, workdayOffsets]
  );
}
