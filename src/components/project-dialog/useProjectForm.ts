"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useData, type Project } from "@/lib/context/DataContext";
import { toDateOnly, todayDateOnly } from "@/lib/date-only";
import {
  defaultStagesAsDrafts,
  emptyStagesDraft,
  stageDraftsToPayload,
  type StageDraft,
} from "@/components/StageEditor";

export type StagesMode = "default" | "custom" | "template" | "empty";
export type ProjectStatus = "active" | "completed" | "archived";

export interface TemplateOption {
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

type CreateProjectInput = Parameters<ReturnType<typeof useData>["createProject"]>[0];

/** Etapas de um template → drafts editáveis (localId único por importação). */
export function templateToStageDrafts(tpl: TemplateOption): StageDraft[] {
  return tpl.stages.map((s) => ({
    localId: `tpl-${tpl.id}-${s.sort_order}-${Math.random().toString(36).slice(2, 8)}`,
    name: s.name,
    color: s.color,
    wip_limit: s.wip_limit ?? null,
    is_done: s.is_done ?? false,
  }));
}

/** Dados do projeto + origem das etapas conforme o modo escolhido na criação. */
export function buildCreateProjectInput(
  data: Partial<Project>,
  stagesMode: StagesMode,
  stageDrafts: StageDraft[],
  selectedTemplateId: string
): CreateProjectInput {
  return {
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
}

interface UseProjectFormInput {
  open: boolean;
  project?: Project | null;
  onOpenChange: (open: boolean) => void;
}

// Estado do formulário do ProjectDialog: reset na abertura, templates e envio
export function useProjectForm({ open, project, onOpenChange }: UseProjectFormInput) {
  const { createProject, updateProject } = useData();
  const router = useRouter();
  const isEdit = !!project;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [trackTime, setTrackTime] = useState(true);

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

  // Rastreadores para inicializar o form apenas na abertura real (impede reset ao digitar
  // quando o pai recria o objeto `project`, ex.: após um refresh do DataContext)
  const prevOpenRef = useRef(false);
  const prevProjectIdRef = useRef<string | null>(null);

  // Reset form quando abre (ou ao trocar de projeto)
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      prevProjectIdRef.current = null;
      return;
    }

    const currentProjectId = project?.id ?? "new";
    const isNewlyOpened = !prevOpenRef.current;
    const isDifferentProject = currentProjectId !== prevProjectIdRef.current;
    if (!isNewlyOpened && !isDifferentProject) return;

    prevOpenRef.current = true;
    prevProjectIdRef.current = currentProjectId;

    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setColor(project.color);
      setStatus(project.status);
      setStartDate(toDateOnly(project.start_date) ?? "");
      setTargetDate(toDateOnly(project.target_date) ?? "");
      setTrackTime(project.track_time !== false);
    } else {
      setName("");
      setDescription("");
      setColor("#3b82f6");
      setStatus("active");
      setStartDate(todayDateOnly());
      setTargetDate("");
      setTrackTime(true);
      setStagesMode("default");
      setSelectedTemplateId("");
      setStageDrafts(defaultStagesAsDrafts());
    }
    setError("");
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
        setStageDrafts(templateToStageDrafts(tpl));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesMode, selectedTemplateId, templates]);

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
        // Colunas DATE: só "YYYY-MM-DD" (toISOString deslocaria o dia)
        start_date: toDateOnly(startDate),
        target_date: toDateOnly(targetDate),
        track_time: trackTime,
      };

      if (isEdit && project) {
        await updateProject(project.id, data);
      } else {
        await createProject(buildCreateProjectInput(data, stagesMode, stageDrafts, selectedTemplateId));
      }
      // Fecha só depois de salvar com sucesso
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      // O DataContext já exibiu o toast; mantém o formulário aberto com o motivo
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return {
    isEdit,
    name, setName,
    description, setDescription,
    color, setColor,
    status, setStatus,
    startDate, setStartDate,
    targetDate, setTargetDate,
    trackTime, setTrackTime,
    stagesMode, setStagesMode,
    templates,
    selectedTemplateId, setSelectedTemplateId,
    stageDrafts, setStageDrafts,
    loading,
    error,
    handleSubmit,
  };
}
