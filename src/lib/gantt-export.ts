// Utilitário de Exportação para Excel (.xlsx) e PDF do Cronograma/Gantt
// Formatação e esquema de cores 100% alinhados com o modelo corporativo (Imagem 3).
"use client";

import * as XLSX from "xlsx";
import type { Project, Task } from "@/lib/context/DataContext";

// ─────────────────────────────────────────────────────────────
// Helpers de Formatação de Data e Status
// ─────────────────────────────────────────────────────────────
function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  let str = "";
  if (typeof dateInput === "object" && dateInput !== null && "toISOString" in dateInput) {
    str = (dateInput as Date).toISOString();
  } else {
    str = String(dateInput).trim();
  }

  // Extrai apenas a parte da data YYYY-MM-DD descartando T00:00:00.000Z
  const cleanStr = str.split("T")[0];
  const parts = cleanStr.split("-");

  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4) {
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.slice(-2)}`;
    }
  }

  return str;
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

export interface ExportRow {
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

    // Linha do Projeto Pai (Nível 0 - Barra Preta de Destaque no Excel)
    rows.push({
      projeto: project.name,
      etapas: "PLANEJAMENTO",
      nomeProjeto: "Full Project",
      responsavel: "",
      dataInicio: formatDate(project.start_date),
      dataFim: formatDate(project.target_date),
      observacao: project.description || "",
      nivel: 0,
      realizado: `${project.progress ?? 0}%`,
      previsto: "100%",
      status: statusLabel({
        progress: project.progress,
        due_date: project.target_date,
        status: project.status,
      } as unknown as Task),
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
            nomeProjeto: depth > 0 ? `${"  ".repeat(depth)}${task.title}` : task.title,
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

  // Cabeçalho exatamente alinhado com a Imagem 3
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

  // Larguras das colunas otimizadas para leitura corporativa
  ws["!cols"] = [
    { wch: 22 }, // ÁREA DE PROJETO
    { wch: 18 }, // ETAPAS
    { wch: 48 }, // NOME DO PROJETO
    { wch: 22 }, // RESPONSÁVEL
    { wch: 14 }, // Data INÍCIO
    { wch: 14 }, // Data FIM
    { wch: 28 }, // OBSERVAÇÃO
    { wch: 8 },  // Nível
    { wch: 14 }, // REALIZ ADO %
    { wch: 14 }, // PREVISTO %
    { wch: 16 }, // STATUS
  ];

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // 1. Estilização da Linha 1 (Cabeçalho Preto de Alto Impacto - Igual Imagem 3)
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
      fill: { fgColor: { rgb: "000000" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "4B5563" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "4B5563" } },
        right: { style: "thin", color: { rgb: "4B5563" } },
      },
    };
  }

  // 2. Estilização das Linhas de Dados e Seções
  for (let R = 1; R <= range.e.r; R++) {
    const rowData = rows[R - 1];
    const isProjectHeaderRow = rowData?.nivel === 0;
    const rowStatus = rowData?.status ?? "";

    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) ws[cellAddr] = { v: "", t: "s" };

      // Se for a linha de cabeçalho do projeto (Nível 0), usa fundo Preto igual à Imagem 3
      let bgColor = isProjectHeaderRow ? "000000" : R % 2 === 0 ? "F9FAFB" : "FFFFFF";
      let textColor = isProjectHeaderRow ? "FFFFFF" : "111827";
      let fontBold = isProjectHeaderRow;

      // Coluna 10 (STATUS): Esquema de cores corporativo da Imagem 3
      if (C === 10 && !isProjectHeaderRow) {
        fontBold = true;
        if (rowStatus === "Concluído" || rowStatus === "No prazo") {
          bgColor = "86EFAC"; // Verde vibrante suave
          textColor = "065F46";
        } else if (rowStatus === "Atrasado") {
          bgColor = "FB923C"; // Laranja vibrante
          textColor = "7C2D12";
        } else if (rowStatus === "Não iniciado") {
          bgColor = "93C5FD"; // Azul pastel de aço
          textColor = "1E3A8A";
        } else if (rowStatus === "Em progresso") {
          bgColor = "FDE047"; // Amarelo vibrante
          textColor = "713F12";
        } else if (rowStatus === "Cancelado") {
          bgColor = "FCA5A5"; // Vermelho suave
          textColor = "7F1D1D";
        }
      }

      ws[cellAddr].s = {
        font: {
          sz: 10,
          bold: fontBold,
          color: { rgb: textColor },
          name: "Calibri",
        },
        fill: { fgColor: { rgb: bgColor }, patternType: "solid" },
        alignment: {
          vertical: "center",
          horizontal: [4, 5, 7, 8, 9, 10].includes(C) ? "center" : "left",
          wrapText: false,
        },
        border: {
          top: { style: "thin", color: { rgb: isProjectHeaderRow ? "374151" : "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: isProjectHeaderRow ? "374151" : "E5E7EB" } },
          left: { style: "thin", color: { rgb: isProjectHeaderRow ? "374151" : "E5E7EB" } },
          right: { style: "thin", color: { rgb: isProjectHeaderRow ? "374151" : "E5E7EB" } },
        },
      };
    }
  }

  // Altura das linhas para visualização legível e espaçada
  ws["!rows"] = [{ hpt: 28 }]; // Cabeçalho
  for (let R = 1; R <= range.e.r; R++) {
    const isProj = rows[R - 1]?.nivel === 0;
    (ws["!rows"] as XLSX.RowInfo[]).push({ hpt: isProj ? 24 : 20 });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");

  const todayStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  XLSX.writeFile(wb, `${fileName}-${todayStr}.xlsx`, { bookType: "xlsx", type: "binary" });
}
