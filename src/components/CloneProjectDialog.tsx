"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  X,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Layers,
  GitFork,
  RotateCcw,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useData, type Project } from "@/lib/context/DataContext";
import { useGlobalToast } from "@/components/ui/toast-notification";

interface CloneProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: (clonedProject: Project) => void;
}

const PROJECT_COLORS = [
  { name: "Azul Corporativo", value: "#3b82f6" },
  { name: "Marinho Executivo", value: "#1e40af" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Verde Floresta", value: "#059669" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa / D0", value: "#ec4899" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Ardósia", value: "#64748b" },
];

export function CloneProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: CloneProjectDialogProps) {
  const router = useRouter();
  const { cloneProject } = useData();
  const { addToast } = useGlobalToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0].value);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // Opções avançadas de duplicação
  const [cloneTasks, setCloneTasks] = useState(true);
  const [cloneDependencies, setCloneDependencies] = useState(true);
  const [resetStatus, setResetStatus] = useState(true);
  const [keepAssignees, setKeepAssignees] = useState(true);
  const [shiftDates, setShiftDates] = useState(true);
  const [trackTime, setTrackTime] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clonedSuccess, setClonedSuccess] = useState<Project | null>(null);

  useEffect(() => {
    if (open && project) {
      setName(`Cópia de ${project.name}`);
      setDescription(project.description || "");
      setColor(project.color || PROJECT_COLORS[0].value);
      setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
      setTargetDate(project.target_date ? project.target_date.split("T")[0] : "");
      setCloneTasks(true);
      setCloneDependencies(true);
      setResetStatus(true);
      setKeepAssignees(true);
      setShiftDates(false);
      setTrackTime(project.track_time !== false);
      setError("");
      setClonedSuccess(null);
    }
  }, [open, project]);

  if (!open || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do projeto clonado é obrigatório.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const cloned = await cloneProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
        cloneTasks,
        cloneDependencies: cloneTasks ? cloneDependencies : false,
        resetStatus,
        keepAssignees,
        shiftDates,
        trackTime,
      });

      // Dispara Toast visual global no canto da tela
      addToast({
        variant: "success",
        title: "Projeto clonado com sucesso!",
        description: `O projeto "${cloned.name}" foi criado e já está disponível.`,
        duration: 5000,
      });

      // Define estado de sucesso dentro do modal
      setClonedSuccess(cloned);

      if (onSuccess) {
        onSuccess(cloned);
      }
    } catch (err: unknown) {
      console.error("[CloneProjectDialog] error:", err);
      setError(err instanceof Error ? err.message : "Erro ao clonar projeto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-project-title"
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/15 via-blue-500/5 to-transparent border-b border-border p-6 shrink-0 relative">
          <button
            type="button"
            onClick={() => {
              setClonedSuccess(null);
              onOpenChange(false);
            }}
            disabled={loading}
            aria-label="Fechar"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-sm shrink-0">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                DUPLICAÇÃO DE PROJETO
              </span>
              <h2 id="clone-project-title" className="text-xl font-bold tracking-tight text-foreground">
                Clonar Projeto
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Origem: <strong className="text-foreground">{project.name}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Form Body or Success State */}
        {clonedSuccess ? (
          <div className="p-8 text-center space-y-6 animate-fadeIn">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                ✓ Cópia Realizada com Sucesso
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                Projeto Clonado com Sucesso!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                O projeto <strong className="text-foreground">{clonedSuccess.name}</strong> foi criado com todas as etapas, tarefas e dependências selecionadas.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-left max-w-md mx-auto space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Projeto de Origem:</span>
                <strong className="text-foreground">{project.name}</strong>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Novo Projeto:</span>
                <strong className="text-foreground">{clonedSuccess.name}</strong>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tarefas Duplicadas:</span>
                <strong className="text-emerald-500">{cloneTasks ? "Sim (preservadas)" : "Apenas Estrutura"}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClonedSuccess(null);
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto h-10 px-5 text-xs font-semibold"
              >
                Permanecer na Lista
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setClonedSuccess(null);
                  onOpenChange(false);
                  router.push(`/app/projects/${clonedSuccess.id}`);
                }}
                className="w-full sm:w-auto h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                Acessar Novo Projeto
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Nome do Novo Projeto */}
            <div className="space-y-1.5">
              <label htmlFor="clone-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nome do Novo Projeto *
              </label>
              <input
                id="clone-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Cópia de Implantação ERP"
                required
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label htmlFor="clone-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descrição (Opcional)
              </label>
              <textarea
                id="clone-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivos e escopo desta nova versão..."
                className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium resize-none"
              />
            </div>

            {/* Seletor de Cor */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cor do Projeto
              </label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    className={`h-7 w-7 rounded-lg transition-transform ${
                      color === c.value
                        ? "ring-2 ring-foreground scale-110 shadow-md"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="clone-start-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Nova Data Início
                </label>
                <DatePicker
                  id="clone-start-date"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  placeholder="Data inicial"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="clone-target-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Nova Meta de Entrega
                </label>
                <DatePicker
                  id="clone-target-date"
                  value={targetDate}
                  onChange={(val) => setTargetDate(val)}
                  placeholder="Prazo final"
                />
              </div>
            </div>

            {/* Opções de Conteúdo a Duplicar */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Opções de Clonagem
              </span>

              <div className="space-y-2">
                {/* Clonar Tarefas */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={cloneTasks}
                    onChange={(e) => setCloneTasks(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                      Duplicar Tarefas e Subtarefas
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Copia todas as atividades mantendo a hierarquia e organização nos estágios.
                    </p>
                  </div>
                </label>

                {/* Clonar Dependências (só se tarefas estiverem ativas) */}
                {cloneTasks && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={cloneDependencies}
                      onChange={(e) => setCloneDependencies(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <GitFork className="h-3.5 w-3.5 text-blue-500" />
                        Duplicar Conexões e Dependências Gantt (DAG)
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Preserva os vínculos de predecessoras e sucessoras (FS/SS/FF/SF).
                      </p>
                    </div>
                  </label>
                )}

                {/* Resetar Status */}
                {cloneTasks && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={resetStatus}
                      onChange={(e) => setResetStatus(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                        Resetar Status para &quot;A Fazer&quot; e 0% de Progresso
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Inicia as atividades zeradas para um novo ciclo de execução.
                      </p>
                    </div>
                  </label>
                )}

                {/* Manter Responsáveis */}
                {cloneTasks && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={keepAssignees}
                      onChange={(e) => setKeepAssignees(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        Manter Responsáveis Atribuídos
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Preserva a delegação de cada colaborador ou desmarque para redefinir.
                      </p>
                    </div>
                  </label>
                )}

                {/* Deslocar datas proporcionalmente */}
                {cloneTasks && startDate && project.start_date && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={shiftDates}
                      onChange={(e) => setShiftDates(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        Deslocar Cronograma Proporcionalmente à Nova Data
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Calcula a diferença entre a data inicial antiga e a nova, mantendo os mesmos intervalos de dias.
                      </p>
                    </div>
                  </label>
                )}

                {/* Habilitar / Desabilitar Controle de Tempo */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={trackTime}
                    onChange={(e) => setTrackTime(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      Habilitar Controle de Tempo e Horas
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Permite registrar horas estimadas e horas reais gastas no projeto duplicado.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clonando Projeto...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Criar Cópia do Projeto
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
