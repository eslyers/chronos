// Utilitário de Exportação para Excel e PDF (Print) do Cronograma/Gantt
// Usa xlsx (SheetJS) para gerar o .xlsx com formatação estruturada.
"use client";

import * as XLSX from "xlsx";
import type { Project, Task } from "@/lib/context/DataContext";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${String(y).slice(-2)}`;
}

function levelOf(task: Task, allTasks: Task[]): number {
  let level = 1;
  let current = task;
  while (current.parent_task_id) {
    const parent = allTasks.find((t) => t.id === current.parent_task_id);
    if (!parent) break;
    level++;
    current = parent;
  }
  return level;
}

function statusLabel(task: Task): string {
  const progress = task.progress ?? 0;
  const due = task.due_date ? new Date(task.due_date) : null;
  const now = new Date();
  if (task.status === "done") return "Concluído";
  if (due && due < now && progress < 100) return "Atrasado";
  if (progress === 0) return "Não iniciado";
  return "Em progresso";
}

interface ExportRow {
  projeto: string;
  etapas: string;
  nomeProjeto: string;
  responsavel: string;
  dataInicio: string;
  dataFim: string;
  observacao: string;
  nivel: number;
  realizado: string;
  previsto: string;
  status: string;
}

export function buildExportRows(
  projects: Project[],
  getTasksByProject: (id: string) => Task[],
  selectedProjectId: string
): ExportRow[] {
  const filteredProjects =
    selectedProjectId === "all"
      ? projects
      : projects.filter((p) => p.id === selectedProjectId);

  const rows: ExportRow[] = [];

  filteredProjects.forEach((project) => {
    const tasks = getTasksByProject(project.id);

    // Linha de cabeçalho do Projeto
    rows.push({
      projeto: project.name,
      etapas: "PLANEJAMENTO",
      nomeProjeto: "Full Project",
      responsavel: "",
      dataInicio: formatDate(project.start_date),
      dataFim: formatDate(project.target_date),
      observacao: "",
      nivel: 0,
      realizado: `${project.progress ?? 0}%`,
      previsto: "100%",
      status: statusLabel({ progress: project.progress, due_date: project.target_date, status: project.status } as unknown as Task),
    });

    const addTaskRows = (parentList: Task[], depth: number) => {
      parentList
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .forEach((task) => {
          const children = tasks.filter((t) => t.parent_task_id === task.id);
          const level = levelOf(task, tasks);

          rows.push({
            projeto: project.name,
            etapas: depth === 0 ? "PLANEJAMENTO" : "SUB-TAREFA",
            nomeProjeto: task.title,
            responsavel: task.assignee_name || "",
            dataInicio: formatDate(task.start_date),
            dataFim: formatDate(task.due_date),
            observacao: task.description || "",
            nivel: level,
            realizado: `${task.progress ?? 0}%`,
            previsto: "100%",
            status: statusLabel(task),
          });

          if (children.length > 0) {
            addTaskRows(children, depth + 1);
          }
        });
    };

    const rootTasks = tasks.filter((t) => !t.parent_task_id);
    addTaskRows(rootTasks, 0);
  });

  return rows;
}

export function exportGanttToExcel(
  projects: Project[],
  getTasksByProject: (id: string) => Task[],
  selectedProjectId: string,
  fileName: string = "cronograma-chronos"
) {
  const rows = buildExportRows(projects, getTasksByProject, selectedProjectId);

  // Cabeçalho da planilha (igual à imagem 3 do usuário)
  const headers = [
    "ÁREA DE PROJETO",
    "ETAPAS",
    "NOME DO PROJETO",
    "RESPONSÁVEL",
    "Data INÍCIO",
    "Data FIM",
    "OBSERVAÇÃO",
    "Nível",
    "REALIZ ADO %",
    "PREVISTO %",
    "STATUS",
  ];

  const wsData: (string | number)[][] = [headers];

  rows.forEach((r) => {
    wsData.push([
      r.projeto,
      r.etapas,
      r.nomeProjeto,
      r.responsavel,
      r.dataInicio,
      r.dataFim,
      r.observacao,
      r.nivel || "",
      r.realizado,
      r.previsto,
      r.status,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Larguras das colunas
  ws["!cols"] = [
    { wch: 18 }, // ÁREA
    { wch: 16 }, // ETAPAS
    { wch: 45 }, // NOME DO PROJETO
    { wch: 16 }, // RESPONSÁVEL
    { wch: 12 }, // Data INÍCIO
    { wch: 12 }, // Data FIM
    { wch: 30 }, // OBSERVAÇÃO
    { wch: 8 },  // Nível
    { wch: 12 }, // REALIZADO %
    { wch: 12 }, // PREVISTO %
    { wch: 14 }, // STATUS
  ];

  // Estilo do cabeçalho (via SheetJS, estilo básico sem Pro)
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };
  }

  // Estilo das linhas de dados
  for (let R = 1; R <= range.e.r; R++) {
    const isProjectRow = rows[R - 1]?.nivel === 0;
    const rowStatus = rows[R - 1]?.status ?? "";

    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) ws[cellAddr] = { v: "", t: "s" };

      let bgColor = R % 2 === 0 ? "F0F4F8" : "FFFFFF";
      if (isProjectRow) bgColor = "1E3A5F";

      // Status badge colors
      if (C === 10) {
        if (rowStatus === "Concluído") bgColor = "D4EDDA";
        else if (rowStatus === "Atrasado") bgColor = "F8D7DA";
        else if (rowStatus === "Em progresso") bgColor = "FFF3CD";
        else if (rowStatus === "Não iniciado") bgColor = "E2E8F0";
      }

      ws[cellAddr].s = {
        font: {
          sz: 10,
          bold: isProjectRow,
          color: { rgb: isProjectRow ? "FFFFFF" : "1A202C" },
        },
        fill: { fgColor: { rgb: bgColor }, patternType: "solid" },
        alignment: { vertical: "center", wrapText: false },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      // Centralizar colunas específicas
      if ([4, 5, 7, 8, 9, 10].includes(C)) {
        ws[cellAddr].s.alignment = { ...ws[cellAddr].s.alignment, horizontal: "center" };
      }
    }
  }

  // Altura das linhas
  ws["!rows"] = [{ hpt: 30 }]; // cabeçalho
  for (let R = 1; R <= range.e.r; R++) {
    (ws["!rows"] as XLSX.RowInfo[]).push({ hpt: 20 });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");

  const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  XLSX.writeFile(wb, `${fileName}-${date}.xlsx`, { bookType: "xlsx", type: "binary" });
}
