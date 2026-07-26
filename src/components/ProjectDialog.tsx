"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Sparkles,
  FolderKanban,
  FileText,
  AlignLeft,
  Calendar,
  Palette,
  Check,
  Layers,
  Wrench,
  Library,
  CircleDot,
  CheckCircle2,
  X,
} from "lucide-react";
import { useData, type Project } from "@/lib/context/DataContext";
import { DatePicker } from "@/components/ui/date-picker";
import {
  StageEditor,
  defaultStagesAsDrafts,
  emptyStagesDraft,
  stageDraftsToPayload,
  type StageDraft,
} from "@/components/StageEditor";

const COLORS = [
  { name: "Azul Corporativo", value: "#3b82f6" },
  { name: "Azul Marinho",     value: "#1e40af" },
  { name: "Índigo",           value: "#6366f1" },
  { name: "Verde Esmeralda",  value: "#10b981" },
  { name: "Verde Floresta",   value: "#059669" },
  { name: "Roxo",             value: "#a855f7" },
  { name: "Rosa Premium",     value: "#ec4899" },
  { name: "Vermelho Alerta",  value: "#ef4444" },
  { name: "Cinza Concreto",   value: "#64748b" },
];

type StagesMode = "default" | "custom" | "template" | "empty";

interface TemplateOption {
  id: string;
  name: string;
  icon: string | null;
  stages: Array<{
    name: string;
    color: string;
    sort_order: number;
    wip_limit?: number | null;
    is_done?: boolean;
  }>;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useData();
  const router = useRouter();
  const isEdit = !!project;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [stagesMode, setStagesMode] = useState<StagesMode>("default");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [stageDrafts, setStageDrafts] = useState<StageDraft[]>(() => defaultStagesAsDrafts());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Carrega templates quando o dialog abre
  useEffect(() => {
    if (!open || isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        const { data } = await supabase
          .from("templates")
          .select("id, name, icon, stages")
          .eq("is_public", true)
          .order("name");
        if (!cancelled && data) {
          setTemplates(data as TemplateOption[]);
        }
      } catch (err) {
        console.error("[ProjectDialog] failed to load templates", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isEdit]);

  // Reset form quando abre
  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name);
        setDescription(project.description ?? "");
        setColor(project.color);
        setStatus(project.status);
        setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
        setTargetDate(project.target_date ? project.target_date.split("T")[0] : "");
      } else {
        setName("");
        setDescription("");
        setColor("#3b82f6");
        setStatus("active");
        setStartDate(new Date().toISOString().split("T")[0]);
        setTargetDate("");
        setStagesMode("default");
        setSelectedTemplateId("");
        setStageDrafts(defaultStagesAsDrafts());
      }
      setError("");
    }
  }, [open, project]);

  // Atualiza drafts conforme modo
  useEffect(() => {
    if (isEdit) return;
    if (stagesMode === "default") {
      setStageDrafts(defaultStagesAsDrafts());
    } else if (stagesMode === "empty") {
      setStageDrafts(emptyStagesDraft());
    } else if (stagesMode === "custom") {
      if (stageDrafts.length === 0) setStageDrafts(defaultStagesAsDrafts());
    } else if (stagesMode === "template" && selectedTemplateId) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl) {
        setStageDrafts(
          tpl.stages.map((s) => ({
            localId: `tpl-${tpl.id}-${s.sort_order}-${Math.random().toString(36).slice(2, 8)}`,
            name: s.name,
            color: s.color,
            wip_limit: s.wip_limit ?? null,
            is_done: s.is_done ?? false,
          }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesMode, selectedTemplateId, templates]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Bloquear scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Nome do projeto é obrigatório");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        status,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        target_date: targetDate ? new Date(targetDate).toISOString() : null,
      };

      if (isEdit && project) {
        await updateProject(project.id, data);
      } else {
        const input: Parameters<typeof createProject>[0] = {
          ...data,
          ...(stagesMode === "custom" && {
            customStages: stageDraftsToPayload(stageDrafts),
          }),
          ...(stagesMode === "template" && selectedTemplateId && {
            templateId: selectedTemplateId,
          }),
          ...(stagesMode === "empty" && {
            useDefaultStages: false,
          }),
        };
        await createProject(input);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header estilo executivo */}
        <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-6 shrink-0 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-sm shrink-0">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  {isEdit ? "Edição de Portfólio" : "Novo Projeto Corporativo"}
                </span>
              </div>
              <h2 id="project-dialog-title" className="text-xl font-bold leading-tight mt-0.5">
                {isEdit ? "Editar Projeto" : "Criar Novo Projeto"}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-6 space-y-5 overflow-y-auto flex-1"
        >
          {/* Nome do Projeto */}
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Nome do Projeto <span className="text-destructive">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              placeholder="Ex: Transformação Digital Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all font-medium"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="project-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5 text-blue-500" />
              Descrição do Escopo
            </label>
            <textarea
              id="project-desc"
              placeholder="Objetivos estratégicos, partes interessadas e abrangência do projeto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Cor do Projeto */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-blue-500" />
              Identificador Visual (Cor)
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    className={`
                      relative w-8 h-8 rounded-xl transition-all duration-200 flex items-center justify-center
                      ${isSelected ? "scale-110 shadow-lg ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105 opacity-80 hover:opacity-100"}
                    `}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </div>

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
                onChange={(val) => setStartDate(val)}
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
                onChange={(val) => setTargetDate(val)}
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
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
              >
                <option value="active">🟢 Em Andamento (Ativo)</option>
                <option value="completed">✅ Concluído</option>
                <option value="archived">📦 Arquivado</option>
              </select>
            </div>
          )}

          {/* Escolha de Etapas (só ao criar novo) */}
          {!isEdit && (
            <div className="space-y-3 pt-3 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                Estrutura de Etapas do Kanban
              </label>

              {/* Grid de Modos com cards visuais */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Padrão */}
                <button
                  type="button"
                  onClick={() => setStagesMode("default")}
                  className={`
                    p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-1.5
                    ${
                      stagesMode === "default"
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/50"
                        : "border-border bg-background hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <Layers className="h-4 w-4 text-blue-500" />
                    {stagesMode === "default" && <Check className="h-3.5 w-3.5 text-blue-500 font-bold" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">Etapas Padrão</p>
                    <p className="text-[11px] text-muted-foreground">5 fases clássicas do fluxo</p>
                  </div>
                </button>

                {/* 2. Customizar */}
                <button
                  type="button"
                  onClick={() => setStagesMode("custom")}
                  className={`
                    p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-1.5
                    ${
                      stagesMode === "custom"
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/50"
                        : "border-border bg-background hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    {stagesMode === "custom" && <Check className="h-3.5 w-3.5 text-blue-500 font-bold" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">Personalizado</p>
                    <p className="text-[11px] text-muted-foreground">Criar etapas sob medida</p>
                  </div>
                </button>

                {/* 3. Template */}
                <button
                  type="button"
                  onClick={() => setStagesMode("template")}
                  className={`
                    p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-1.5
                    ${
                      stagesMode === "template"
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/50"
                        : "border-border bg-background hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <Library className="h-4 w-4 text-purple-500" />
                    {stagesMode === "template" && <Check className="h-3.5 w-3.5 text-blue-500 font-bold" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">Usar Template</p>
                    <p className="text-[11px] text-muted-foreground">Modelos corporativos</p>
                  </div>
                </button>

                {/* 4. Sem etapas */}
                <button
                  type="button"
                  onClick={() => setStagesMode("empty")}
                  className={`
                    p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-1.5
                    ${
                      stagesMode === "empty"
                        ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/50"
                        : "border-border bg-background hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <CircleDot className="h-4 w-4 text-slate-400" />
                    {stagesMode === "empty" && <Check className="h-3.5 w-3.5 text-blue-500 font-bold" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">Sem Etapas</p>
                    <p className="text-[11px] text-muted-foreground">Adicionar manualmente depois</p>
                  </div>
                </button>
              </div>

              {/* Detalhes do modo selecionado */}
              {stagesMode === "default" && (
                <div className="p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Etapas que serão criadas automaticamente:</p>
                  <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    Backlog ➔ A Fazer ➔ Em Progresso ➔ Em Revisão ➔ Concluído
                  </p>
                </div>
              )}

              {stagesMode === "template" && (
                <div className="space-y-2">
                  <select
                    id="template_id"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-medium transition-all"
                  >
                    <option value="">— Selecione um template corporativo —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon ? `${t.icon} ` : ""}
                        {t.name} ({(t.stages as unknown[])?.length || 0} etapas)
                      </option>
                    ))}
                  </select>

                  {selectedTemplateId && stageDrafts.length > 0 && (
                    <div className="bg-muted/30 rounded-xl border border-border p-3 text-xs space-y-2">
                      <p className="font-bold text-foreground">Etapas importadas deste template:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stageDrafts.map((s, idx) => (
                          <span
                            key={s.localId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-medium"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.name}
                            {idx < stageDrafts.length - 1 && (
                              <span className="text-muted-foreground">➔</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stagesMode === "custom" && (
                <div className="bg-muted/30 border border-border rounded-xl p-3.5">
                  <StageEditor stages={stageDrafts} onChange={setStageDrafts} />
                </div>
              )}

              {stagesMode === "empty" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ O projeto será criado vazio. Você poderá adicionar fases individualmente na visão de Kanban.
                </div>
              )}
            </div>
          )}

          {/* Erro */}
          {error && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
              ⚠️ {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-11 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEdit ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Criar Projeto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}