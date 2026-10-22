"use client";

import { useRef, useState } from "react";
import type { Task, useData } from "@/lib/context/DataContext";
import { getCalculatedWorkdayDate, getWorkdayOffsetFromDate } from "@/lib/business-days";
import { formatDateOnly, parseDateOnly, toDateOnly } from "@/lib/date-only";
import { countRejected, mapSettled } from "@/lib/board-moves";
import { getDefaultRoutines } from "@/lib/fast-close-routines";

// Criações em lote (rotinas, cópia, importação): no máximo N requisições simultâneas
const BULK_CONCURRENCY = 6;

/** Cria em paralelo (limitado); se alguma falhar, lança um erro com o resumo. */
async function createAllOrThrow<T>(items: T[], create: (item: T) => Promise<unknown>) {
  const results = await mapSettled(items, BULK_CONCURRENCY, create);
  const failed = countRejected(results);
  if (failed > 0) {
    throw new Error(`${failed} de ${items.length} rotinas não puderam ser criadas.`);
  }
}

/** Criações em lote do cockpit: rotinas padrão, cópia mês a mês e importação de planilha. */
export function useFastCloseBulkActions({
  createTask,
  selectedProjectId,
  selectedYear,
  selectedMonth,
  useD0,
  scopedTasks,
  lastDayOfMonth,
}: {
  createTask: ReturnType<typeof useData>["createTask"];
  selectedProjectId: string;
  selectedYear: number;
  selectedMonth: number;
  useD0: boolean;
  scopedTasks: Task[];
  lastDayOfMonth: Date;
}) {
  const [generating, setGenerating] = useState(false);
  // Trava síncrona contra duplo clique (o state só atualiza no próximo render)
  const generatingRef = useRef(false);

  // Rotinas padrão do mês
  const defaultRoutines = getDefaultRoutines(useD0);

  // Gerar rotinas padrão (exige um projeto: no Supabase toda tarefa pertence a um).
  // Chamado pelo ConfirmDialog, que mostra "Aguarde..." enquanto cria.
  const handleGenerateDefaultClosingTasks = async () => {
    if (selectedProjectId === "all" || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      await createAllOrThrow(defaultRoutines, (r) =>
        createTask({
          title: r.title,
          due_date: formatDateOnly(getCalculatedWorkdayDate(selectedYear, selectedMonth, r.offset, useD0)),
          priority: r.priority,
          status: "todo",
          progress: 0,
          project_id: selectedProjectId,
        })
      );
    } catch (err) {
      // Cada falha já virou toast no DataContext. Fecha o diálogo mesmo assim:
      // repetir criaria em dobro as rotinas que deram certo.
      console.error("[FastClose] generate routines:", err);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  };

  // Cópia mês a mês
  const handleCopyTasksFromMonth = async (params: {
    sourceMonth: number;
    sourceYear: number;
    targetMonth: number;
    targetYear: number;
    selectedTaskIds: string[];
    resetStatus: boolean;
    keepAssignees: boolean;
  }) => {
    const sourceTasksToCopy = scopedTasks.filter((t) => params.selectedTaskIds.includes(t.id));

    // Erros sobem para o CopyClosingDialog, que permanece aberto
    await createAllOrThrow(sourceTasksToCopy, (t) => {
      const originalDate = parseDateOnly(t.due_date || t.start_date) ?? lastDayOfMonth;
      const offset = getWorkdayOffsetFromDate(originalDate, params.sourceYear, params.sourceMonth, useD0);
      const newTargetDate = getCalculatedWorkdayDate(params.targetYear, params.targetMonth, offset, useD0);

      return createTask({
        title: t.title,
        description: t.description || undefined,
        due_date: formatDateOnly(newTargetDate),
        priority: t.priority,
        status: params.resetStatus ? "todo" : t.status,
        progress: params.resetStatus ? 0 : t.progress,
        assignee_id: params.keepAssignees ? t.assignee_id || undefined : undefined,
        assignee_name: params.keepAssignees ? t.assignee_name || undefined : undefined,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      });
    });
  };

  // Importação de planilha
  const handleImportSpreadsheetSuccess = async (importedTasks: {
    title: string;
    description?: string;
    due_date?: string;
    priority: "low" | "medium" | "high" | "critical";
    project_id?: string;
  }[]) => {
    // Erros sobem para o ImportClosingSpreadsheetDialog, que mostra o resumo
    await createAllOrThrow(importedTasks, (t) =>
      createTask({
        title: t.title,
        description: t.description,
        due_date: toDateOnly(t.due_date),
        priority: t.priority,
        status: "todo",
        progress: 0,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      })
    );
  };

  return {
    defaultRoutines,
    generating,
    handleGenerateDefaultClosingTasks,
    handleCopyTasksFromMonth,
    handleImportSpreadsheetSuccess,
  };
}
