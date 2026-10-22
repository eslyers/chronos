"use client";

import { FolderKanban, Layers, CheckCircle2, AlertTriangle, Sparkles, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TimelineStats } from "@/components/timeline/timeline-stats";

interface TimelineKpisProps {
  stats: TimelineStats;
  selectedProjectName: string;
}

export function TimelineKpis({ stats, selectedProjectName }: TimelineKpisProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stats.isFiltered ? "Projeto Selecionado" : "Projetos em Escopo"}
            </p>
            <p className="text-3xl font-extrabold mt-1.5">{stats.totalProjects}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="truncate">{stats.isFiltered ? selectedProjectName : "Mapeamento Ativo"}</span>
        </div>
      </Card>

      <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-indigo-500/30 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stats.isFiltered ? "Entregáveis do Projeto" : "Entregáveis Totais"}
            </p>
            <p className="text-3xl font-extrabold mt-1.5">{stats.totalTasks}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold">
            <Layers className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>Tarefas & Subtarefas</span>
        </div>
      </Card>

      <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stats.isFiltered ? "Conclusão do Projeto" : "Conclusão Global"}
            </p>
            <p className="text-3xl font-extrabold text-emerald-500 mt-1.5">{stats.completionRate}%</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Progress value={stats.completionRate} className="h-1.5 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
          <p className="text-[10px] text-muted-foreground text-right">{stats.completed} de {stats.totalTasks} concluídas</p>
        </div>
      </Card>

      <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-red-500/30 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stats.isFiltered ? "Atrasos no Projeto" : "Atrasos Críticos"}
            </p>
            <p className={`text-3xl font-extrabold mt-1.5 ${stats.overdue > 0 ? "text-destructive" : "text-emerald-500"}`}>
              {stats.overdue}
            </p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
            stats.overdue > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {stats.overdue > 0 ? (
            <span className="text-destructive font-semibold">Atenção requerida nos prazos</span>
          ) : (
            <span className="text-emerald-500 font-semibold">100% de prazos em dia</span>
          )}
        </div>
      </Card>
    </div>
  );
}
