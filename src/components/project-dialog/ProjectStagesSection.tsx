"use client";

import type { Dispatch, SetStateAction } from "react";
import { Sparkles, Check, Layers, Wrench, Library, CircleDot, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StageEditor, type StageDraft } from "@/components/StageEditor";
import type { StagesMode, TemplateOption } from "@/components/project-dialog/useProjectForm";

// Cards de modo: 1. Padrão, 2. Customizar, 3. Template, 4. Sem etapas
const STAGE_MODE_OPTIONS: { mode: StagesMode; icon: LucideIcon; iconClassName: string; title: string; hint: string }[] = [
  { mode: "default", icon: Layers, iconClassName: "text-blue-500", title: "Etapas Padrão", hint: "5 fases clássicas do fluxo" },
  { mode: "custom", icon: Wrench, iconClassName: "text-amber-500", title: "Personalizado", hint: "Criar etapas sob medida" },
  { mode: "template", icon: Library, iconClassName: "text-purple-500", title: "Usar Template", hint: "Modelos corporativos" },
  { mode: "empty", icon: CircleDot, iconClassName: "text-slate-400", title: "Sem Etapas", hint: "Adicionar manualmente depois" },
];

interface ProjectStagesSectionProps {
  stagesMode: StagesMode;
  onStagesModeChange: (mode: StagesMode) => void;
  templates: TemplateOption[];
  selectedTemplateId: string;
  onSelectedTemplateIdChange: (id: string) => void;
  stageDrafts: StageDraft[];
  onStageDraftsChange: Dispatch<SetStateAction<StageDraft[]>>;
}

// Escolha da estrutura de etapas do Kanban (só ao criar novo projeto)
export function ProjectStagesSection({
  stagesMode,
  onStagesModeChange,
  templates,
  selectedTemplateId,
  onSelectedTemplateIdChange,
  stageDrafts,
  onStageDraftsChange,
}: ProjectStagesSectionProps) {
  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
        Estrutura de Etapas do Kanban
      </span>

      {/* Grid de Modos com cards visuais */}
      <div className="grid grid-cols-2 gap-2.5">
        {STAGE_MODE_OPTIONS.map(({ mode, icon: Icon, iconClassName, title, hint }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onStagesModeChange(mode)}
            aria-pressed={stagesMode === mode}
            className={`
              p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-1.5
              ${
                stagesMode === mode
                  ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/50"
                  : "border-border bg-background hover:bg-muted/50"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <Icon className={`h-4 w-4 ${iconClassName}`} />
              {stagesMode === mode && <Check className="h-3.5 w-3.5 text-blue-500 font-bold" />}
            </div>
            <div>
              <p className="text-xs font-bold">{title}</p>
              <p className="text-[11px] text-muted-foreground">{hint}</p>
            </div>
          </button>
        ))}
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
          <Select
            value={selectedTemplateId || "none"}
            onValueChange={(val) => onSelectedTemplateIdChange(val === "none" ? "" : val)}
          >
            <SelectTrigger id="template_id" aria-label="Template corporativo" className="h-10 rounded-xl bg-background border-border/80">
              <SelectValue placeholder="Selecione um template corporativo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">— Selecione um template corporativo —</span>
              </SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon || "📁"}</span>
                    <span>{t.name} ({(t.stages as unknown[])?.length || 0} etapas)</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          <StageEditor stages={stageDrafts} onChange={onStageDraftsChange} />
        </div>
      )}

      {stagesMode === "empty" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
          ⚠️ O projeto será criado vazio. Você poderá adicionar fases individualmente na visão de Kanban.
        </div>
      )}
    </div>
  );
}
