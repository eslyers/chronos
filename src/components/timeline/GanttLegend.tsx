"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PRIORITY_DOT_CLASS, PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/priority";

// Legenda da baixa para a crítica
const LEGEND_PRIORITIES = [...PRIORITY_ORDER].reverse();

export function GanttLegend() {
  return (
    <Card className="p-5 border-border/80 bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Legenda de Prioridades & Governança</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-2.5 rounded-sm bg-slate-600 dark:bg-slate-400" />
            <span>Projeto (Pai)</span>
          </div>
          {LEGEND_PRIORITIES.map((priority) => (
            <div key={priority} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full ${PRIORITY_DOT_CLASS[priority]}`} />
              <span>{PRIORITY_LABEL[priority]}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
            <span>Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500 font-bold" />
            <span>Linha do Dia Atual</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
