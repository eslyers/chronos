"use client";

import { Calendar, CircleDot, Clock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectStatus } from "@/components/project-dialog/useProjectForm";

interface ProjectScheduleSectionProps {
  isEdit: boolean;
  startDate: string;
  onStartDateChange: (value: string) => void;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
  status: ProjectStatus;
  onStatusChange: (value: ProjectStatus) => void;
  trackTime: boolean;
  onTrackTimeChange: (value: boolean) => void;
}

// Datas, status (só em edição) e controle de tempo do projeto
export function ProjectScheduleSection({
  isEdit,
  startDate,
  onStartDateChange,
  targetDate,
  onTargetDateChange,
  status,
  onStatusChange,
  trackTime,
  onTrackTimeChange,
}: ProjectScheduleSectionProps) {
  return (
    <>
      {/* Datas Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="project-start" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            Data de Início
          </label>
          <DatePicker
            id="project-start"
            value={startDate}
            onChange={(val) => onStartDateChange(val)}
            placeholder="Selecione início"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="project-target" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            Previsão de Término
          </label>
          <DatePicker
            id="project-target"
            value={targetDate}
            onChange={(val) => onTargetDateChange(val)}
            placeholder="Selecione previsão"
          />
        </div>
      </div>

      {/* Status (só em edição) */}
      {isEdit && (
        <div className="space-y-1.5">
          <label htmlFor="project-status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CircleDot className="h-3.5 w-3.5 text-blue-500" />
            Status do Projeto
          </label>
          <Select
            value={status}
            onValueChange={(val) => onStatusChange(val as ProjectStatus)}
          >
            <SelectTrigger id="project-status" className="h-10 rounded-xl bg-background border-border/80">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Em Andamento (Ativo)</span>
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Concluído</span>
                </div>
              </SelectItem>
              <SelectItem value="archived">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-500 shrink-0" />
                  <span>Arquivado</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Controle de Tempo e Horas */}
      <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <label htmlFor="project-track-time" className="text-xs font-bold text-foreground cursor-pointer block">
                Controle de Tempo e Horas
              </label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Habilitar estimativas de horas, horas gastas reais e carga de trabalho
              </p>
            </div>
          </div>
          <button
            type="button"
            id="project-track-time"
            role="switch"
            aria-checked={trackTime}
            onClick={() => onTrackTimeChange(!trackTime)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              trackTime ? "bg-blue-600" : "bg-muted-foreground/30"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                trackTime ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {!trackTime && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 font-medium">
            ℹ️ Com o controle desativado, os campos de horas estimadas e reais ficarão ocultos nas tarefas.
          </p>
        )}
      </div>
    </>
  );
}
