"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useData, type Project } from "@/lib/context/DataContext";
import {
  StageEditor,
  defaultStagesAsDrafts,
  emptyStagesDraft,
  stageDraftsToPayload,
  type StageDraft,
} from "@/components/StageEditor";

const COLORS = [
  { name: "Laranja", value: "#f97316" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Verde", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Cinza", value: "#64748b" },
];

// ─────────────────────────────────────────────────────────────
// Tipo do modo de etapas
// - default: cria as 5 etapas padrão (Backlog → Concluído)
// - custom:  deixa o user editar a lista de etapas no editor
// - template: clona stages de um template pré-cadastrado
// - empty:   cria projeto SEM stages (user adiciona depois)
// ─────────────────────────────────────────────────────────────
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
  const [color, setColor] = useState("#f97316");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // Novos campos pra escolha de etapas
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
        setColor("#f97316");
        setStatus("active");
        setStartDate(new Date().toISOString().split("T")[0]);
        setTargetDate("");
        // Reset pra modo default
        setStagesMode("default");
        setSelectedTemplateId("");
        setStageDrafts(defaultStagesAsDrafts());
      }
      setError("");
    }
  }, [open, project]);

  // Quando muda de modo, atualiza o draft de stages
  useEffect(() => {
    if (isEdit) return;
    if (stagesMode === "default") {
      setStageDrafts(defaultStagesAsDrafts());
    } else if (stagesMode === "empty") {
      setStageDrafts(emptyStagesDraft());
    } else if (stagesMode === "custom") {
      // mantém o que já tem (ou inicializa com default como ponto de partida)
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
          // Define estratégia de stages
          ...(stagesMode === "custom" && {
            customStages: stageDraftsToPayload(stageDrafts),
          }),
          ...(stagesMode === "template" && selectedTemplateId && {
            templateId: selectedTemplateId,
          }),
          ...(stagesMode === "empty" && {
            useDefaultStages: false,
          }),
          // stagesMode === "default" → não envia nada, cai no fallback do data-provider
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do projeto."
              : "Crie um novo projeto. Escolha como configurar as etapas do Kanban abaixo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome do projeto *
            </label>
            <Input
              id="name"
              placeholder="Ex: Lançamento Produto Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo do projeto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor do projeto</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-md transition-all ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="start_date" className="text-sm font-medium">
                Data de início
              </label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="target_date" className="text-sm font-medium">
                Data alvo
              </label>
              <Input
                id="target_date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="active">🟢 Ativo</option>
                <option value="completed">✅ Concluído</option>
                <option value="archived">📦 Arquivado</option>
              </Select>
            </div>
          )}

          {/* ─── Escolha de etapas (só pra criar novo) ─── */}
          {!isEdit && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <label htmlFor="stages_mode" className="text-sm font-medium">
                  Etapas do Kanban
                </label>
              </div>
              <Select
                id="stages_mode"
                value={stagesMode}
                onChange={(e) => setStagesMode(e.target.value as StagesMode)}
              >
                <option value="default">✨ Etapas padrão (Backlog → Concluído)</option>
                <option value="custom">🛠️ Customizar etapas (editar antes de criar)</option>
                <option value="template">📚 Usar um template pré-cadastrado</option>
                <option value="empty">🕳️ Começar sem etapas (crio depois)</option>
              </Select>

              {stagesMode === "template" && (
                <div className="space-y-2">
                  <Select
                    id="template_id"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">— Escolha um template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon ? `${t.icon} ` : ""}
                        {t.name} ({t.stages?.length || 0} etapas)
                      </option>
                    ))}
                  </Select>
                  {selectedTemplateId && stageDrafts.length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                      <p className="font-medium text-foreground">Etapas que serão criadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stageDrafts.map((s, idx) => (
                          <span
                            key={s.localId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-border"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.name}
                            {idx < stageDrafts.length - 1 && (
                              <span className="text-muted-foreground">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stagesMode === "custom" && (
                <div className="bg-muted/30 rounded-md p-3">
                  <StageEditor stages={stageDrafts} onChange={setStageDrafts} />
                </div>
              )}

              {stagesMode === "default" && (
                <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                  Serão criadas as 5 etapas clássicas:{" "}
                  <span className="font-medium text-foreground">
                    Backlog → A Fazer → Em Progresso → Em Revisão → Concluído
                  </span>
                </div>
              )}

              {stagesMode === "empty" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Projeto será criado sem etapas. Você poderá adicionar manualmente na página do projeto depois.
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEdit ? (
              "Salvar alterações"
            ) : (
              "Criar projeto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}