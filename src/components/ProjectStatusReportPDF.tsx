"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  ShieldCheck,
  Printer,
  X,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Project, Task, Stage } from "@/lib/context/DataContext";
import { sortTasksWithHierarchy } from "@/lib/task-sorting";

interface ProjectStatusReportPDFProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  tasks: Task[];
  stages: Stage[];
}

import { parseLocalDate } from "@/lib/utils";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = parseLocalDate(dateStr);
  return date ? date.toLocaleDateString("pt-BR") : "N/A";
}

export function ProjectStatusReportPDF({
  open,
  onClose,
  project,
  tasks,
  stages,
}: ProjectStatusReportPDFProps) {
  type SortField = "title" | "assignee" | "priority" | "start_date" | "due_date" | "progress";
  type SortDirection = "asc" | "desc";

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("exec-report-print-mode");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection(field === "priority" || field === "progress" ? "desc" : "asc");
    }
  };

  const sortedTasks = useMemo(() => {
    if (sortField === "due_date" && sortDirection === "asc") {
      return sortTasksWithHierarchy(tasks);
    }
    if (!sortField) return sortTasksWithHierarchy(tasks);

    const weights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...tasks].sort((a, b) => {
      let result = 0;

      switch (sortField) {
        case "title": {
          const nameA = a.title || "";
          const nameB = b.title || "";
          result = nameA.localeCompare(nameB, "pt-BR");
          break;
        }
        case "assignee": {
          const nameA = a.assignee_name || "zzz";
          const nameB = b.assignee_name || "zzz";
          result = nameA.localeCompare(nameB, "pt-BR");
          break;
        }
        case "priority": {
          const weightA = weights[a.priority] || 0;
          const weightB = weights[b.priority] || 0;
          result = weightA - weightB;
          break;
        }
        case "start_date": {
          const timeA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const timeB = b.start_date ? new Date(b.start_date).getTime() : 0;
          result = timeA - timeB;
          break;
        }
        case "due_date": {
          const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
          result = timeA - timeB;
          break;
        }
        case "progress": {
          result = (a.progress || 0) - (b.progress || 0);
          break;
        }
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [tasks, sortField, sortDirection]);

  const renderSortHeader = (
    label: string,
    field: SortField,
    align: "left" | "center" = "left"
  ) => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-muted/60 transition-colors ${
          align === "center" ? "text-center" : "text-left"
        }`}
      >
        <div
          className={`inline-flex items-center gap-1 ${
            align === "center" ? "justify-center" : "justify-start"
          }`}
        >
          <span>{label}</span>
          <span className="print:hidden">
            {isSorted ? (
              sortDirection === "asc" ? (
                <ArrowUp className="h-3 w-3 text-blue-500" />
              ) : (
                <ArrowDown className="h-3 w-3 text-blue-500" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
            )}
          </span>
        </div>
      </th>
    );
  };

  if (!open) return null;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo" || t.status === "blocked" || !t.status).length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    return new Date(t.due_date).getTime() < Date.now();
  }).length;

  const avgProgress =
    totalTasks > 0
      ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
      : project.progress || 0;

  const issueDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Cálculos para o Gráfico Donut em SVG
  const pctDone = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const pctInProgress = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const pctTodo = totalTasks > 0 ? Math.round((todoTasks / totalTasks) * 100) : 0;
  const pctOverdue = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

  const handlePrint = () => {
    document.body.classList.add("exec-report-print-mode");
    window.print();
  };

  if (!open || !mounted) return null;

  let reportRoot = document.getElementById("exec-report-print-root");
  if (!reportRoot) {
    reportRoot = document.createElement("div");
    reportRoot.id = "exec-report-print-root";
    document.body.appendChild(reportRoot);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block print:overflow-visible">
      {/* Container de Modal Executiva */}
      <div className="relative w-full max-w-4xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-8 animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Barra de Ações do Relatório (Invisível na Impressão) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/30 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-bold">Relatório Executivo de Status Report com Gráficos</h2>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-4 rounded-xl"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Salvar em PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ÁREA DO DOCUMENTO IMPRESSO (PDF BODY) */}
        <div id="printable-report-area" className="p-8 sm:p-12 overflow-y-auto space-y-8 print:p-0 print:overflow-visible print:bg-white print:text-black">
          {/* Header Institucional */}
          <div className="border-b-2 border-primary/20 pb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                  CHRONOS ENTERPRISE REPORT
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">ID: {project.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-2">
                {project.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description || "Relatório executivo com curva de evolução, KPIs e status dos entregáveis."}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Data da Emissão</div>
              <div className="text-sm font-extrabold font-mono text-foreground mt-0.5">{issueDate}</div>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                ● Status: Ativo
              </div>
            </div>
          </div>

          {/* Grid de KPIs Executivos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                Progresso Geral
              </span>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                {avgProgress}%
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Concluídas
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {doneTasks} <span className="text-xs font-normal text-muted-foreground">/ {totalTasks}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Em Progresso
              </span>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {inProgressTasks}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                Em Atraso
              </span>
              <div className={`text-3xl font-extrabold font-mono ${overdueTasks > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-500"}`}>
                {overdueTasks}
              </div>
            </div>
          </div>

          {/* 📊 SEÇÃO DE GRÁFICOS VISUAIS DE EVOLUÇÃO (NOVO) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Gráficos de Evolução & Distribuição Visual do Projeto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico 1: Evolução por Etapa do Kanban / WBS */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-500" />
                    Progresso por Etapa WBS (%)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {stages.length} Etapas
                  </span>
                </div>

                <div className="space-y-3">
                  {stages.map((stage) => {
                    const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
                    const stageDone = stageTasks.filter((t) => t.status === "done").length;
                    const stagePct =
                      stageTasks.length > 0
                        ? Math.round(
                            stageTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / stageTasks.length
                          )
                        : 0;

                    return (
                      <div key={stage.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-foreground truncate max-w-[180px]">
                            <span
                              className="h-2.5 w-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: stage.color || "#3b82f6" }}
                            />
                            {stage.name}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground font-bold">
                            {stagePct}% <span className="text-[10px] font-normal">({stageDone}/{stageTasks.length})</span>
                          </span>
                        </div>
                        <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${stagePct}%`,
                              backgroundColor: stage.color || "#3b82f6",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico 2: Distribuição Visual de Status (Gráfico de Rosca / Donut SVG) */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <PieChart className="h-4 w-4 text-emerald-500" />
                    Distribuição dos Status das Tarefas
                  </span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {totalTasks} Tarefas
                  </span>
                </div>

                {/* Donut Chart SVG + Legenda */}
                <div className="flex items-center justify-around gap-4 py-2">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background Ring */}
                      <path
                        className="text-muted/40"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Concluídas (Verde) */}
                      <path
                        className="text-emerald-500"
                        strokeWidth="3.8"
                        strokeDasharray={`${pctDone}, 100`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Em Progresso (Azul) */}
                      <path
                        className="text-blue-500"
                        strokeWidth="3.8"
                        strokeDasharray={`${pctInProgress}, 100`}
                        strokeDashoffset={`-${pctDone}`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Em Atraso (Vermelho) */}
                      <path
                        className="text-rose-500"
                        strokeWidth="3.8"
                        strokeDasharray={`${pctOverdue}, 100`}
                        strokeDashoffset={`-${pctDone + pctInProgress}`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-extrabold font-mono leading-none">{avgProgress}%</span>
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">Concluído</span>
                    </div>
                  </div>

                  {/* Legenda de Cores */}
                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-foreground">Concluídas:</span>
                      <span className="font-mono text-muted-foreground font-bold">{doneTasks} ({pctDone}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-foreground">Em Progresso:</span>
                      <span className="font-mono text-muted-foreground font-bold">{inProgressTasks} ({pctInProgress}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-foreground">Atrasadas:</span>
                      <span className="font-mono text-muted-foreground font-bold">{overdueTasks} ({pctOverdue}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-foreground">A Fazer:</span>
                      <span className="font-mono text-muted-foreground font-bold">{todoTasks} ({pctTodo}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informações de Cronograma & Datas */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-muted-foreground">Início Planejado:</span>
              <span className="font-bold font-mono">{formatDate(project.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span className="font-semibold text-muted-foreground">Término Previsto:</span>
              <span className="font-bold font-mono">{formatDate(project.target_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-muted-foreground">Total de Etapas WBS:</span>
              <span className="font-bold font-mono">{stages.length} etapas</span>
            </div>
          </div>

          {/* Tabela Principal de Entregáveis */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center gap-2">
              📋 Lista Executiva de Atividades do Projeto ({tasks.length})
            </h3>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase text-[10px] text-muted-foreground">
                  {renderSortHeader("Atividade / Tarefa", "title", "left")}
                  {renderSortHeader("Responsável", "assignee", "left")}
                  {renderSortHeader("Prioridade", "priority", "center")}
                  {renderSortHeader("Início", "start_date", "center")}
                  {renderSortHeader("Término", "due_date", "center")}
                  {renderSortHeader("Progresso", "progress", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sortedTasks.map((task: Task) => {
                  const isDone = task.status === "done";
                  const isOverdue =
                    !isDone &&
                    task.due_date &&
                    new Date(task.due_date).getTime() < Date.now();

                  return (
                    <tr key={task.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : isOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className={isDone ? "line-through opacity-60" : ""}>
                            {task.title}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        <span className="font-medium flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-500" />
                          {task.assignee_name || "Sem responsável"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            task.priority === "critical"
                              ? "bg-red-500/15 text-red-700 dark:text-red-300"
                              : task.priority === "high"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : task.priority === "medium"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium text-muted-foreground">
                        {formatDate(task.start_date)}
                      </td>

                      <td
                        className={`py-2.5 px-3 text-center font-mono font-medium ${
                          isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(task.due_date)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {task.progress}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé de Assinatura do Gerente do Projeto */}
          <div className="pt-12 mt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-8 text-xs text-muted-foreground print:mt-12">
            <div className="text-center sm:text-left space-y-1">
              <div className="font-bold text-foreground">Relatório Gerado por CHRONOS Enterprise</div>
              <div>Sistema de Gestão Estratégica de Projetos e Cronogramas</div>
            </div>

            <div className="text-center space-y-2">
              <div className="w-48 border-b border-foreground/40 mx-auto" />
              <div className="font-semibold text-foreground">Assinatura do Gerente do Projeto</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    reportRoot
  );
}
