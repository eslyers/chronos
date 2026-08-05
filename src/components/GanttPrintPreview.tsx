"use client";

import React, { useEffect } from "react";
import { Printer, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, Task } from "@/lib/context/DataContext";
import { buildExportRows } from "@/lib/gantt-export";

interface GanttPrintPreviewProps {
  projects: Project[];
  getTasksByProject: (id: string) => Task[];
  selectedProjectId: string;
  selectedProjectName: string;
  onClose: () => void;
}

function statusBadge(status: string): React.ReactNode {
  const map: Record<string, { bg: string; color: string }> = {
    Concluído: { bg: "#d1fae5", color: "#065f46" },
    "No prazo": { bg: "#d1fae5", color: "#065f46" },
    Atrasado: { bg: "#fee2e2", color: "#991b1b" },
    "Em progresso": { bg: "#fef3c7", color: "#92400e" },
    "Não iniciado": { bg: "#e2e8f0", color: "#475569" },
    Cancelado: { bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[status] ?? { bg: "#e2e8f0", color: "#475569" };
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        padding: "2px 8px",
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 10,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export function GanttPrintPreview({
  projects,
  getTasksByProject,
  selectedProjectId,
  selectedProjectName,
  onClose,
}: GanttPrintPreviewProps) {
  const rows = buildExportRows(projects, getTasksByProject, selectedProjectId);
  const today = new Date().toLocaleDateString("pt-BR");

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("gantt-print-mode");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add("gantt-print-mode");
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible">
      {/* Container de Modal Executivo na Tela / Documento na Impressão */}
      <div className="relative w-full max-w-5xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] print:static print:max-w-none print:max-h-none print:shadow-none print:border-none print:block print:overflow-visible">
        {/* Barra de Ações Superior (Invisível na Impressão) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/40 no-print print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Pré-visualização do Relatório Cronograma (PDF)</h2>
              <p className="text-xs text-muted-foreground">Escopo: {selectedProjectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-4 rounded-xl shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF
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

        {/* ÁREA DE RELATÓRIO DO CRONOGRAMA (#gantt-print-area) */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-white text-slate-900 print:p-0 print:overflow-visible">
          <div id="gantt-print-area">
            {/* Cabeçalho da página */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
                paddingBottom: 12,
                borderBottom: "2px solid #1e3a5f",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  CHRONOS — SISTEMA DE GESTÃO ESTRATÉGICA
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  Cronograma & Timeline de Entregáveis
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
                  Projeto: <strong>{selectedProjectName}</strong>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, color: "#64748b" }}>
                <div>Emitido em {today}</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: "#1e3a5f" }}>
                  CONFIDENCIAL
                </div>
              </div>
            </div>

            {/* Tabela de Cronograma */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 9,
                fontFamily: "Arial, sans-serif",
              }}
            >
              <thead>
                <tr>
                  {[
                    "ÁREA DE PROJETO",
                    "ETAPAS",
                    "NOME DO PROJETO / TAREFA",
                    "RESPONSÁVEL",
                    "INÍCIO",
                    "FIM",
                    "NÍV.",
                    "REALIZ. %",
                    "PREVISTO %",
                    "STATUS",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        backgroundColor: "#000000",
                        color: "#ffffff",
                        padding: "6px 6px",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 8,
                        letterSpacing: 0.3,
                        border: "1px solid #334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isProject = row.nivel === 0;
                  const isOdd = idx % 2 === 0;
                  const rowBg = isProject ? "#000000" : isOdd ? "#f8fafc" : "#ffffff";
                  const textColor = isProject ? "#ffffff" : "#0f172a";
                  const fontW = isProject ? 700 : row.nivel === 1 ? 600 : 400;
                  const indent = row.nivel > 1 ? `${(row.nivel - 1) * 12}px` : "0";

                  return (
                    <tr key={idx} style={{ backgroundColor: rowBg }}>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontWeight: 700,
                          fontSize: 8,
                          whiteSpace: "nowrap",
                          maxWidth: 100,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.projeto}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.etapas}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          paddingLeft: isProject ? "6px" : `calc(6px + ${indent})`,
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontWeight: fontW,
                          fontSize: 9,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isProject ? row.projeto : row.nomeProjeto}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.responsavel}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.dataInicio}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.dataFim}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.nivel || ""}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.realizado}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          color: textColor,
                          border: "1px solid #e2e8f0",
                          fontSize: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.previsto}
                      </td>
                      <td
                        style={{
                          padding: "6px 4px",
                          border: "1px solid #e2e8f0",
                          textAlign: "center",
                        }}
                      >
                        {isProject ? null : statusBadge(row.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Rodapé institucional */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 8,
                borderTop: "1px solid #cbd5e1",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: "#94a3b8",
              }}
            >
              <span>Chronos Enterprise — Relatório de Gestão Temporal</span>
              <span>Gerado em {today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
