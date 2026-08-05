"use client";

import React from "react";
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
    Atrasado: { bg: "#fee2e2", color: "#991b1b" },
    "Em progresso": { bg: "#fef3c7", color: "#92400e" },
    "Não iniciado": { bg: "#e2e8f0", color: "#475569" },
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Overlay — oculto na impressão */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 9000,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 24,
        }}
        onClick={onClose}
      />

      {/* Painel de ação — oculto na impressão */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 16,
          right: 24,
          zIndex: 9200,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={handlePrint}
          style={{
            padding: "10px 20px",
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🖨️ Imprimir / Salvar PDF
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "10px 16px",
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ✕ Fechar
        </button>
      </div>

      {/* Conteúdo imprimível */}
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
              CHRONOS — SISTEMA DE GESTÃO
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Cronograma & Timeline
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

        {/* Tabela */}
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
                "ÁREA",
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
                    backgroundColor: "#1e3a5f",
                    color: "#ffffff",
                    padding: "6px 6px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 8,
                    letterSpacing: 0.3,
                    border: "1px solid #0f2744",
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
              const rowBg = isProject ? "#1e3a5f" : isOdd ? "#f8fafc" : "#ffffff";
              const textColor = isProject ? "#ffffff" : "#0f172a";
              const fontW = isProject ? 700 : row.nivel === 1 ? 600 : 400;
              const indent = row.nivel > 1 ? `${(row.nivel - 1) * 12}px` : "0";

              return (
                <tr key={idx} style={{ backgroundColor: rowBg }}>
                  <td
                    style={{
                      padding: "5px 6px",
                      color: textColor,
                      border: "1px solid #e2e8f0",
                      fontWeight: 700,
                      fontSize: 8,
                      whiteSpace: "nowrap",
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.projeto}
                  </td>
                  <td
                    style={{
                      padding: "5px 6px",
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
                      padding: "5px 6px",
                      paddingLeft: isProject ? "6px" : `calc(6px + ${indent})`,
                      color: textColor,
                      border: "1px solid #e2e8f0",
                      fontWeight: fontW,
                      fontSize: 9,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isProject ? row.projeto : row.nomeProjeto}
                  </td>
                  <td
                    style={{
                      padding: "5px 6px",
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
                      padding: "5px 6px",
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
                      padding: "5px 6px",
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
                      padding: "5px 6px",
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
                      padding: "5px 6px",
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
                      padding: "5px 6px",
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
                      padding: "5px 4px",
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

        {/* Rodapé */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 8,
            borderTop: "1px solid #cbd5e1",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 8,
            color: "#94a3b8",
          }}
        >
          <span>Chronos Workspace — Cronograma Exportado</span>
          <span>Gerado em {today}</span>
        </div>
      </div>
    </>
  );
}
