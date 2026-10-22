"use client";

import type { ViewMode } from "gantt-task-react";
import { FolderKanban, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/lib/context/DataContext";

// Valores do enum ViewMode da lib (import só de tipo para não trazer a lib junto)
export const VIEW_MODES: { value: ViewMode; label: string; columnWidth: number }[] = [
  { value: "Day" as ViewMode, label: "Dia", columnWidth: 55 },
  { value: "Week" as ViewMode, label: "Semana", columnWidth: 130 },
  { value: "Month" as ViewMode, label: "Mês", columnWidth: 210 },
  { value: "Year" as ViewMode, label: "Ano", columnWidth: 320 },
];

interface TimelineToolbarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Barra de controle: filtro de projeto e escala temporal do Gantt
export function TimelineToolbar({
  projects,
  selectedProjectId,
  onSelectProject,
  viewMode,
  onViewModeChange,
}: TimelineToolbarProps) {
  return (
    <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Filter className="h-4 w-4" />
          </div>
          <div className="w-full max-w-xs">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Filtrar por Projeto
            </label>
            <Select
              value={selectedProjectId}
              onValueChange={onSelectProject}
            >
              <SelectTrigger className="h-10 text-sm font-medium bg-background border-border/80">
                <SelectValue placeholder="Filtrar por Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>Todos os Projetos ({projects.length})</span>
                  </div>
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Center/Right: View Scale Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2 hidden sm:inline">
            Escala Temporal:
          </span>
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/60">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onViewModeChange(mode.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
