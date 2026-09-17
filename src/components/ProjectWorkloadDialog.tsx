"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  X,
  Gauge,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  calculateWorkload,
  type WorkloadPeriod,
  type MemberWorkload,
} from "@/lib/workload";
import type { Task, Project } from "@/lib/context/DataContext";

interface ProjectWorkloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  tasks: Task[];
}

export function ProjectWorkloadDialog({
  open,
  onOpenChange,
  project,
  tasks,
}: ProjectWorkloadDialogProps) {
  const [period, setPeriod] = useState<WorkloadPeriod>("all");

  const workload = useMemo(() => {
    return calculateWorkload(tasks, { period, weeklyCapacityHours: 40 });
  }, [tasks, period]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-workload-title"
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/15 via-blue-500/5 to-transparent border-b border-border p-5 shrink-0 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-sm shrink-0">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                  ALOCAÇÃO & WORKLOAD
                </span>
              </div>
              <h2 id="project-workload-title" className="text-lg font-bold tracking-tight text-foreground">
                Carga de Trabalho da Equipe
              </h2>
              <p className="text-xs text-muted-foreground">
                Projeto: <strong className="text-foreground">{project.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar & KPI Strip */}
        <div className="p-4 bg-muted/20 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl">
            {[
              { id: "all", label: "Tudo" },
              { id: "this_week", label: "Esta Semana" },
              { id: "next_week", label: "Próx. Semana" },
              { id: "this_month", label: "Este Mês" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as WorkloadPeriod)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick KPIs */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="bg-card font-medium border-border/80">
              <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
              {workload.totalAllocatedHours}h alocadas
            </Badge>
            {workload.overloadedMembersCount > 0 ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                {workload.overloadedMembersCount} sobrecarregado{workload.overloadedMembersCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Equipe Balanceada
              </Badge>
            )}
          </div>
        </div>

        {/* Member List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {workload.members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
              <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground">Nenhum responsável com tarefas atribuídas neste filtro.</p>
              <p className="text-xs">Atribua colaboradores às tarefas para visualizar a distribuição de esforço.</p>
            </div>
          ) : (
            workload.members.map((member: MemberWorkload) => {
              const isOverload = member.status === "overload";
              const isOptimal = member.status === "optimal";

              return (
                <div
                  key={member.memberKey}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverload
                      ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                      : "border-border/80 bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
                        isOverload
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : isOptimal
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}>
                        {member.memberName.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">
                            {member.memberName}
                          </h4>
                          {isOverload && (
                            <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px] font-bold">
                              Sobrecarregado
                            </Badge>
                          )}
                          {isOptimal && (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                              Ideal
                            </Badge>
                          )}
                          {!isOverload && !isOptimal && (
                            <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px] font-bold">
                              Disponível
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {member.activeTaskCount} tarefa{member.activeTaskCount === 1 ? "" : "s"} ativas • {member.pendingHours}h pendentes
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className={`text-base font-extrabold ${isOverload ? "text-red-500" : isOptimal ? "text-emerald-500" : "text-foreground"}`}>
                        {member.utilizationPercentage}%
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {member.pendingHours}h / {member.capacityHours}h cap.
                      </div>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1 mt-2">
                    <Progress
                      value={Math.min(member.utilizationPercentage, 100)}
                      className="h-2 bg-muted"
                      indicatorClassName={
                        isOverload
                          ? "bg-red-500"
                          : isOptimal
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }
                    />
                  </div>

                  {/* Tasks Preview */}
                  <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                    {member.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30"
                      >
                        <span className="font-medium text-foreground truncate max-w-[320px]">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-[11px]">
                          {task.due_date && (
                            <span>{new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                          )}
                          <span className="font-mono font-semibold text-foreground">
                            {task.estimated_hours || 8}h
                          </span>
                        </div>
                      </div>
                    ))}
                    {member.tasks.length > 3 && (
                      <p className="text-[11px] text-muted-foreground text-center pt-0.5">
                        +{member.tasks.length - 3} outra(s) tarefa(s)
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Deep Link to Full Cockpit */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 gap-1.5"
            onClick={() => onOpenChange(false)}
          >
            <Link href={`/app/workload?project=${project.id}`}>
              Abrir Cockpit Geral de Workload
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
