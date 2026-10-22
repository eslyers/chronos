"use client";

import { Loader2, Sparkles, FolderKanban, CheckCircle2, X } from "lucide-react";
import type { Project } from "@/lib/context/DataContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProjectForm } from "@/components/project-dialog/useProjectForm";
import { ProjectBasicInfoSection } from "@/components/project-dialog/ProjectBasicInfoSection";
import { ProjectScheduleSection } from "@/components/project-dialog/ProjectScheduleSection";
import { ProjectStagesSection } from "@/components/project-dialog/ProjectStagesSection";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const form = useProjectForm({ open, project, onOpenChange });
  const { isEdit, loading, error } = form;

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        overlayClassName="bg-black/65"
        // Formulário: clique fora não descarta o que foi digitado
        onPointerDownOutside={(e) => e.preventDefault()}
        // Foco inicial no nome do projeto (não no X do cabeçalho)
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("project-name")?.focus();
        }}
        className="flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-xl bg-card border-border rounded-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
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
              <DialogTitle className="text-xl font-bold leading-tight tracking-normal mt-0.5">
                {isEdit ? "Editar Projeto" : "Criar Novo Projeto"}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="p-6 space-y-5 overflow-y-auto flex-1"
        >
          <ProjectBasicInfoSection
            name={form.name}
            onNameChange={form.setName}
            description={form.description}
            onDescriptionChange={form.setDescription}
            color={form.color}
            onColorChange={form.setColor}
          />

          <ProjectScheduleSection
            isEdit={isEdit}
            startDate={form.startDate}
            onStartDateChange={form.setStartDate}
            targetDate={form.targetDate}
            onTargetDateChange={form.setTargetDate}
            status={form.status}
            onStatusChange={form.setStatus}
            trackTime={form.trackTime}
            onTrackTimeChange={form.setTrackTime}
          />

          {/* Escolha de Etapas (só ao criar novo) */}
          {!isEdit && (
            <ProjectStagesSection
              stagesMode={form.stagesMode}
              onStagesModeChange={form.setStagesMode}
              templates={form.templates}
              selectedTemplateId={form.selectedTemplateId}
              onSelectedTemplateIdChange={form.setSelectedTemplateId}
              stageDrafts={form.stageDrafts}
              onStageDraftsChange={form.setStageDrafts}
            />
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
              disabled={loading || !form.name.trim()}
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
      </DialogContent>
    </Dialog>
  );
}
