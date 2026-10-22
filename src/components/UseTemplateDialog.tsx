"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Sparkles, Palette } from "lucide-react";
import { useData } from "@/lib/context/DataContext";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toDateOnly } from "@/lib/date-only";

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  stages: unknown[];
}

interface UseTemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  { name: "Azul",        value: "#3b82f6" },
  { name: "Azul Marinho",value: "#1e40af" },
  { name: "Índigo",      value: "#6366f1" },
  { name: "Verde",       value: "#10b981" },
  { name: "Esmeralda",   value: "#059669" },
  { name: "Roxo",        value: "#a855f7" },
  { name: "Rosa",        value: "#ec4899" },
  { name: "Vermelho",    value: "#ef4444" },
  { name: "Cinza",       value: "#64748b" },
];

export function UseTemplateDialog({ template, open, onOpenChange }: UseTemplateDialogProps) {
  const router = useRouter();
  const { createProject } = useData();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-preenche com dados do template ao abrir (só na abertura real ou troca de
  // template: um novo objeto `template` não pode apagar o que foi digitado)
  const initializedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !template) {
      initializedForRef.current = null;
      return;
    }
    if (initializedForRef.current === template.id) return;
    initializedForRef.current = template.id;

    setName(template.name);
    setDescription(template.description ?? "");
    setColor(COLORS[0].value);
    setStartDate("");
    setTargetDate("");
    setError("");
  }, [open, template]);

  if (!open || !template) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do projeto é obrigatório.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        start_date: toDateOnly(startDate) ?? undefined,
        target_date: toDateOnly(targetDate) ?? undefined,
        templateId: template!.id,
      });

      if (!project) throw new Error("Falha ao criar projeto.");

      // Fecha só depois de criar com sucesso
      onOpenChange(false);
      router.push(`/app/projects/${project.id}`);
    } catch (err) {
      // O DataContext já exibiu o toast; mantém o formulário aberto com o motivo
      setError(err instanceof Error ? err.message : "Erro ao criar projeto.");
    } finally {
      setLoading(false);
    }
  }

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
        className="block gap-0 p-0 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl sm:rounded-2xl shadow-2xl"
      >
        {/* Header com gradiente e ícone do template */}
        <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-4xl p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-sm shrink-0">
              {template.icon || "📋"}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  A partir do template
                </span>
              </div>
              <DialogTitle className="text-xl font-bold leading-tight tracking-normal">
                {template.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(template.stages as unknown[])?.length || 0} etapas pré-configuradas serão importadas
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome do projeto */}
          <div className="space-y-1.5">
            <label htmlFor="tpl-proj-name" className="text-sm font-semibold">
              Nome do Projeto <span className="text-destructive">*</span>
            </label>
            <input
              id="tpl-proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Processo Seletivo — Q3 2026"
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="tpl-proj-desc" className="text-sm font-semibold">
              Descrição <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="tpl-proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo do projeto, contexto, responsável..."
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="tpl-start-date" className="text-sm font-semibold">
                Data de início
              </label>
              <DatePicker
                id="tpl-start-date"
                value={startDate}
                onChange={(val) => setStartDate(val)}
                placeholder="Selecione início"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tpl-target-date" className="text-sm font-semibold">
                Previsão de término
              </label>
              <DatePicker
                id="tpl-target-date"
                value={targetDate}
                onChange={(val) => setTargetDate(val)}
                placeholder="Selecione previsão"
              />
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              Cor do projeto
            </span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all duration-150 ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
              ⚠️ {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-11 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 h-11 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando projeto...
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
