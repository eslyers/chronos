"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Copy,
  Sparkles,
  Calendar as CalendarIcon,
  Filter,
  FolderKanban,
  FileSpreadsheet,
  Settings2,
  KanbanSquare,
  List,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/lib/context/DataContext";
import { MONTH_NAMES } from "@/lib/fast-close";

export type FastCloseViewMode = "kanban" | "list";

/** Barra única do cockpit: projeto, mês/ano, alcance de Ds, visão, régua e menu de ações. */
export function FastCloseToolbar({
  selectedProjectId,
  closingProjects,
  onSelectProject,
  onCreateProject,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  offsetRange,
  onOffsetRangeChange,
  viewMode,
  onViewModeChange,
  onOpenConfig,
  onOpenCopy,
  onOpenImport,
  onOpenGenerate,
  generating,
}: {
  selectedProjectId: string;
  closingProjects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  offsetRange: string;
  onOffsetRangeChange: (range: string) => void;
  viewMode: FastCloseViewMode;
  onViewModeChange: (mode: FastCloseViewMode) => void;
  onOpenConfig: () => void;
  onOpenCopy: () => void;
  onOpenImport: () => void;
  onOpenGenerate: () => void;
  generating: boolean;
}) {
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Ano atual -1 … +2 (antes fixo em 2025–2027); inclui o ano selecionado se estiver fora
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = [current - 1, current, current + 1, current + 2];
    if (!years.includes(selectedYear)) years.push(selectedYear);
    return years.sort((a, b) => a - b);
  }, [selectedYear]);

  // Fechar dropdown de ações ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
      {/* Seletor de Projeto */}
      <div className="flex items-center gap-1.5 bg-muted/50 pl-2.5 pr-1 py-1 rounded-xl border border-border/80">
        <FolderKanban className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <Select
          value={selectedProjectId}
          onValueChange={(val) => {
            if (val === "new") {
              onCreateProject();
            } else {
              onSelectProject(val);
            }
          }}
        >
          <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 max-w-[170px] truncate">
            <SelectValue placeholder="Selecione o projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                <span>(Todos os Fechamentos)</span>
              </div>
            </SelectItem>
            {closingProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                  <span className="truncate">{p.name}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="new">
              <div className="flex items-center gap-2 text-blue-500 font-semibold">
                <Plus className="h-3.5 w-3.5" />
                <span>+ Novo Projeto</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mês e Ano */}
      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-xl border border-border/80">
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        <Select
          value={String(selectedMonth)}
          onValueChange={(val) => onMonthChange(Number(val))}
        >
          <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, idx) => (
              <SelectItem key={idx} value={String(idx + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(val) => onYearChange(Number(val))}
        >
          <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alcance de Ds */}
      <div className="flex items-center gap-1.5 bg-muted/50 pl-2.5 pr-1 py-1 rounded-xl border border-border/80">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select value={offsetRange} onValueChange={onOffsetRangeChange}>
          <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[115px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="D-5_D+5">D-5 a D+5</SelectItem>
            <SelectItem value="D-3_D+3">D-3 a D+3</SelectItem>
            <SelectItem value="D-2_D+4">D-2 a D+4</SelectItem>
            <SelectItem value="D-10_D+10">D-10 a D+10</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alternador de Visão (Matriz x Lista) */}
      <div className="flex items-center p-1 rounded-xl bg-muted border border-border shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange("kanban")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            viewMode === "kanban"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Visão Matriz Kanban"
        >
          <KanbanSquare className="h-3.5 w-3.5" />
          <span>Matriz</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            viewMode === "list"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Visão Lista Cronológica"
        >
          <List className="h-3.5 w-3.5" />
          <span>Lista</span>
        </button>
      </div>

      {/* Botão Configurar Régua */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenConfig}
        className="text-xs font-bold gap-1.5 h-9 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10"
        title="Configurar D0 e Régua de Dias"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>Régua</span>
      </Button>

      {/* Menu Dropdown de Ações Unificadas */}
      <div className="relative" ref={menuRef}>
        <Button
          type="button"
          size="sm"
          onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-9 px-3.5 rounded-xl shadow-md shadow-blue-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Ações</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>

        {actionsMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-[9999] py-1 divide-y divide-border/50 animate-in fade-in zoom-in-95">
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setActionsMenuOpen(false);
                  onOpenCopy();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-blue-500/10 hover:text-blue-500 flex items-center gap-2.5 transition-colors"
              >
                <Copy className="h-4 w-4 text-blue-500" />
                <span>Copiar Mês Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionsMenuOpen(false);
                  onOpenImport();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Importar Planilha (.ODS/XLSX)</span>
              </button>
            </div>

            <div className="py-1">
              <button
                type="button"
                disabled={generating || selectedProjectId === "all"}
                onClick={() => {
                  setActionsMenuOpen(false);
                  onOpenGenerate();
                }}
                title={selectedProjectId === "all" ? "Selecione um projeto de fechamento para gerar as rotinas" : undefined}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-purple-500/10 hover:text-purple-500 flex items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-purple-500" />
                )}
                <span className="flex flex-col">
                  <span>{generating ? "Gerando rotinas..." : "⚡ Gerar Rotinas Padrão"}</span>
                  {selectedProjectId === "all" && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Selecione um projeto primeiro
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
